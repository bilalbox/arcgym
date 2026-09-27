#!/usr/bin/env python3
"""
ArcGym Documentation Crawler & ChromaDB Indexer
Crawls official architectural documentation from https://architect.salesforce.com,
extracts hierarchical markdown chunks with Well-Architected metadata,
and indexes them into a persistent local Chroma vector database.
"""

import os
import re
import sys
import time
import json
import hashlib
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from curl_cffi import requests
import chromadb

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(ROOT_DIR, "data")
CHROMA_DIR = os.path.join(DATA_DIR, "chroma")
CHUNKS_JSON_PATH = os.path.join(DATA_DIR, "architect_chunks.json")

SITEMAP_URL = "https://architect.salesforce.com/sitemap-1.xml"
COLLECTION_NAME = "salesforce_architect_docs"

# Categories to keep from canonical English docs
KNOWN_CATEGORIES = [
    "well-architected",
    "decision-guides",
    "fundamentals",
    "reference-diagrams",
    "resources",
    "connect"
]

NON_ENGLISH_LANGS = {
    "zh-tw", "zh-cn", "sv-se", "ru-ru", "pt-br", "nl-nl", "nb-no",
    "ko-kr", "ja-jp", "it-it", "fr-fr", "fi-fi", "es-mx", "es-es",
    "de-de", "da-dk"
}

def detect_pillar(url: str, text: str) -> str:
    lower_url = url.lower()
    lower_text = text[:1000].lower()
    
    if "agent" in lower_url or "agentic" in lower_url:
        return "Agentforce"
    if "data-360" in lower_url or "data-cloud" in lower_url or "zero-copy" in lower_url:
        return "Data_360"
    if "trust" in lower_url or "security" in lower_url:
        return "Trust"
    if "reliability" in lower_url or "async" in lower_url or "scalability" in lower_url:
        return "Reliability"
    if "operational-excellence" in lower_url or "devops" in lower_url or "governance" in lower_url:
        return "Operational_Excellence"
    if "cost" in lower_url or "resource" in lower_url:
        return "Cost_Optimization"
    if "fairness" in lower_url:
        return "Fairness"
    
    # Fallback checks from text
    if "agentic enterprise" in lower_text or "atlas reasoning" in lower_text:
        return "Agentforce"
    if "data cloud" in lower_text or "dlo" in lower_text or "dmo" in lower_text:
        return "Data_360"
    if "well-architected" in lower_url:
        return "Core_Platform"
    return "Core_Platform"

def detect_category(url: str) -> str:
    path = urlparse(url).path
    for cat in KNOWN_CATEGORIES:
        if f"/docs/architect/{cat}" in path:
            return cat
    return "general"

def get_english_urls() -> list[str]:
    print(f"Fetching sitemap from {SITEMAP_URL}...")
    session = requests.Session(impersonate="chrome")
    resp = session.get(SITEMAP_URL, timeout=30)
    resp.raise_for_status()
    
    raw_urls = re.findall(r"<loc>(https://architect\.salesforce\.com/docs/architect/[^<]+)</loc>", resp.text)
    english_urls = []
    
    for u in raw_urls:
        path_parts = urlparse(u).path.strip("/").split("/")
        # format: docs / architect / [lang | category] / ...
        if len(path_parts) >= 3:
            third_segment = path_parts[2].lower()
            if third_segment in NON_ENGLISH_LANGS:
                continue
            if third_segment in KNOWN_CATEGORIES:
                english_urls.append(u)
                
    unique_urls = sorted(list(set(english_urls)))
    print(f"Discovered {len(unique_urls)} canonical English architectural documentation URLs.")
    return unique_urls

def parse_page_chunks(url: str, html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    
    raw_title = soup.title.string if soup.title else ""
    # Clean title (e.g. "Trust | Well-Architected Framework | Salesforce Architects" -> "Trust")
    doc_title = raw_title.split("|")[0].strip() if raw_title else urlparse(url).path.split("/")[-1].replace(".html", "")
    
    category = detect_category(url)
    default_pillar = detect_pillar(url, soup.get_text()[:1500])
    
    # Salesforce documentation uses <doc-heading> tags and standard h1-h4
    headings = soup.find_all(["doc-heading", "h1", "h2", "h3", "h4"])
    if not headings:
        # Fallback to whole main content
        main = soup.find("main") or soup.find("body")
        if main:
            text = main.get_text(" ", strip=True)
            if len(text) > 50:
                return [{
                    "id": hashlib.md5(url.encode()).hexdigest()[:16],
                    "document": f"# {doc_title}\n\n{text[:2000]}",
                    "metadata": {
                        "url": url,
                        "doc_title": doc_title,
                        "section_title": "Overview",
                        "breadcrumb": doc_title,
                        "category": category,
                        "pillar": default_pillar,
                        "char_count": len(text[:2000]),
                        "crawled_at": datetime.utcnow().isoformat()
                    }
                }]
        return []

    chunks = []
    breadcrumbs = [doc_title]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    for idx, h in enumerate(headings):
        header_text = h.get("header") or h.get_text(strip=True)
        if not header_text or len(header_text) < 2:
            continue
            
        hash_val = h.get("hash") or ""
        level_str = h.get("aria-level") or (h.name[1] if len(h.name) == 2 and h.name[1].isdigit() else "2")
        level = int(level_str) if level_str.isdigit() else 2
        
        # Update breadcrumbs based on heading level
        target_idx = max(1, level - 1)
        if target_idx < len(breadcrumbs):
            breadcrumbs = breadcrumbs[:target_idx]
        breadcrumbs.append(header_text)
        breadcrumb_str = " > ".join(breadcrumbs)
        
        # Collect sibling text until next heading
        sibling_parts = []
        curr = h.next_sibling
        while curr:
            if getattr(curr, "name", None) in ["doc-heading", "h1", "h2", "h3", "h4"]:
                break
            if hasattr(curr, "get_text"):
                if curr.name in ["ul", "ol"]:
                    items = [f"• {li.get_text(' ', strip=True)}" for li in curr.find_all("li")]
                    if items:
                        sibling_parts.append("\n" + "\n".join(items) + "\n")
                elif curr.name in ["pre", "code"]:
                    code_text = curr.get_text(strip=True)
                    if code_text:
                        sibling_parts.append(f"\n```\n{code_text}\n```\n")
                else:
                    txt = curr.get_text(" ", strip=True)
                    if txt:
                        sibling_parts.append(txt)
            curr = curr.next_sibling
            
        body_text = "\n\n".join([p for p in sibling_parts if p.strip()]).strip()
        if len(body_text) < 40:
            continue
            
        specific_pillar = detect_pillar(url, header_text + " " + body_text[:200]) or default_pillar
        deep_url = f"{url}#{hash_val}" if hash_val else url
        
        # If section is very long, split into sub-chunks of ~1200 chars at paragraph breaks
        if len(body_text) > 1800:
            paragraphs = body_text.split("\n\n")
            current_sub = []
            current_len = 0
            sub_idx = 1
            
            for p in paragraphs:
                if current_len + len(p) > 1400 and current_sub:
                    sub_text = "\n\n".join(current_sub)
                    chunks.append({
                        "document": f"# {breadcrumb_str} (Part {sub_idx})\n\n{sub_text}",
                        "metadata": {
                            "url": deep_url,
                            "doc_title": doc_title,
                            "section_title": f"{header_text} (Part {sub_idx})",
                            "breadcrumb": breadcrumb_str,
                            "category": category,
                            "pillar": specific_pillar,
                            "char_count": len(sub_text),
                            "crawled_at": now_iso
                        }
                    })
                    current_sub = [p]
                    current_len = len(p)
                    sub_idx += 1
                else:
                    current_sub.append(p)
                    current_len += len(p)
                    
            if current_sub:
                sub_text = "\n\n".join(current_sub)
                chunks.append({
                    "document": f"# {breadcrumb_str} (Part {sub_idx})\n\n{sub_text}",
                    "metadata": {
                        "url": deep_url,
                        "doc_title": doc_title,
                        "section_title": f"{header_text} (Part {sub_idx})",
                        "breadcrumb": breadcrumb_str,
                        "category": category,
                        "pillar": specific_pillar,
                        "char_count": len(sub_text),
                        "crawled_at": now_iso
                    }
                })
        else:
            chunks.append({
                "document": f"# {breadcrumb_str}\n\n{body_text}",
                "metadata": {
                    "url": deep_url,
                    "doc_title": doc_title,
                    "section_title": header_text,
                    "breadcrumb": breadcrumb_str,
                    "category": category,
                    "pillar": specific_pillar,
                    "char_count": len(body_text),
                    "crawled_at": now_iso
                }
            })
            
    return chunks

def fetch_and_parse(url: str, session: requests.Session) -> list[dict]:
    try:
        resp = session.get(url, timeout=25)
        if resp.status_code == 200:
            return parse_page_chunks(url, resp.text)
        else:
            print(f"  [WARN] HTTP {resp.status_code} for {url}")
            return []
    except Exception as e:
        print(f"  [ERROR] Failed to fetch {url}: {e}")
        return []

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(CHROMA_DIR, exist_ok=True)
    
    print("\n===========================================================")
    print("   ArcGym: architect.salesforce.com Crawler -> ChromaDB    ")
    print("===========================================================\n")
    
    all_chunks = []
    
    if ("--reindex-only" in sys.argv or "--cached" in sys.argv) and os.path.exists(CHUNKS_JSON_PATH):
        print(f"Loading existing chunks from {CHUNKS_JSON_PATH}...")
        with open(CHUNKS_JSON_PATH, "r", encoding="utf-8") as f:
            all_chunks = json.load(f)
        print(f"Loaded {len(all_chunks)} chunks from local cache.")
    else:
        urls = get_english_urls()
        print(f"\nStarting parallel crawl across {len(urls)} documentation pages...")
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=6) as executor:
            def worker(u):
                sess = requests.Session(impersonate="chrome")
                return fetch_and_parse(u, sess)
                
            future_to_url = {executor.submit(worker, url): url for url in urls}
            completed = 0
            
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                completed += 1
                chunks = future.result()
                all_chunks.extend(chunks)
                if completed % 15 == 0 or completed == len(urls):
                    print(f"  [{completed}/{len(urls)}] pages crawled | Total chunks so far: {len(all_chunks)}")
                    
        elapsed = time.time() - start_time
        print(f"\n✓ Crawl finished in {elapsed:.1f}s. Extracted {len(all_chunks)} structured knowledge chunks.")
        
    # Assign guaranteed globally unique IDs
    for idx, c in enumerate(all_chunks):
        url_part = c.get("metadata", {}).get("url", "")
        sec_part = c.get("metadata", {}).get("section_title", "")
        c["id"] = f"arc_{idx:05d}_{hashlib.sha256(f'{url_part}_{sec_part}_{idx}'.encode()).hexdigest()[:10]}"
        
    # Save JSON backup
    print(f"Saving JSON dump to {CHUNKS_JSON_PATH}...")
    with open(CHUNKS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2)
    print(f"✓ Saved {len(all_chunks)} chunks to {CHUNKS_JSON_PATH} ({os.path.getsize(CHUNKS_JSON_PATH) / 1024 / 1024:.2f} MB)")
    
    # Store into ChromaDB
    print(f"\nConnecting to ChromaDB at: {CHROMA_DIR}...")
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    # Reset/recreate collection
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
        
    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine", "source": "architect.salesforce.com"}
    )
    
    print(f"Ingesting {len(all_chunks)} chunks into ChromaDB collection '{COLLECTION_NAME}'...")
    batch_size = 100
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i + batch_size]
        collection.add(
            ids=[c["id"] for c in batch],
            documents=[c["document"] for c in batch],
            metadatas=[c["metadata"] for c in batch]
        )
        sys.stdout.write(f"\r  Indexed {min(i + batch_size, len(all_chunks))}/{len(all_chunks)} chunks")
        sys.stdout.flush()
        
    print(f"\n✓ ChromaDB indexing complete! Collection count: {collection.count()} vectors.")

    
    # Domain & Pillar summary
    pillar_counts = {}
    cat_counts = {}
    for c in all_chunks:
        p = c["metadata"].get("pillar", "Other")
        cat = c["metadata"].get("category", "Other")
        pillar_counts[p] = pillar_counts.get(p, 0) + 1
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        
    print("\n--- Knowledge Distribution by Pillar ---")
    for p, cnt in sorted(pillar_counts.items(), key=lambda x: -x[1]):
        print(f" • {p.ljust(25)} : {cnt} chunks")
        
    print("\n--- Knowledge Distribution by Category ---")
    for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f" • {cat.ljust(25)} : {cnt} chunks")
        
    print(f"\nAll operations complete. Chroma DB persisted at: {CHROMA_DIR}\n")

if __name__ == "__main__":
    main()
