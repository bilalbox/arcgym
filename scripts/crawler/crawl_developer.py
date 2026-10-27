#!/usr/bin/env python3
"""
ArcGym Data 360 developer docs crawler.

Discovers chapter URLs by filtering llms-data-cloud.txt on curated guide path
prefixes, fetches content via .md siblings (bot-friendly), stores canonical
.html URLs in chunk metadata / Citation Manifest, and upserts into the shared
Chroma grounding collection.

Filter table (Wave C / issue #7 — phased widen, not a full leaf dump)
---------------------------------------------------------------------
Guide                 | Keep                                      | Drop / still deferred
----------------------|-------------------------------------------|----------------------
dmo-mapping           | All non-DLO pages under the DMO guide:    | Pure DLO leaves (*_dlo.md)
(dmo_phased)          | Standard/SSOT object leaves (*_dmo.md),   | when present. No DLO pages
                      | mapping pages (*_dmo_mappings.md), and    | appear in llms-data-cloud
                      | conceptual / object guide pages.          | under this prefix today.
integrations          | First-party / platform allowlist:         | Still deferred (~800 leaves):
(integrations_phased) | Ingestion API, Amazon S3, GCS, Azure      | third-party vendor catalog
                      | storage streams, MuleSoft, Web/Mobile SDK | (-connector / objects / cred
                      | (plus setup/stream/UDLO pages matching    | / create-*-data-stream for
                      | INTEG_FIRST_PARTY_RE).                    | Jira, Confluence, ServiceNow,
                      | Salesforce CRM connector docs are not in  | Airtable, Azure SQL/Cosmos,
                      | this prefix — they live on                | Adobe, etc.). Full ~3600-leaf
                      | help.salesforce.com (Help corpus).        | dump remains out of scope.
other GUIDE_SEEDS     | All pages under each prefix (filter=full) | —
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from urllib.parse import urlparse

from curl_cffi import requests

from chroma_index import assign_stable_ids, upsert_chunks

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(ROOT_DIR, "data")
CHROMA_DIR = os.path.join(DATA_DIR, "chroma")
CHUNKS_JSON_PATH = os.path.join(DATA_DIR, "developer_chunks.json")
SOURCE_DOMAIN = "developer.salesforce.com"

LLMS_DATA_CLOUD_URL = "https://developer.salesforce.com/docs/llms-data-cloud.txt"

# Seed entry URLs (documentation / discovery); chapter expansion uses path prefixes.
GUIDE_SEEDS = [
    {
        "name": "data-cloud-dev",
        "prefix": "/docs/data/data-cloud-dev/",
        "category": "data-cloud-dev",
        "filter": "full",
    },
    {
        "name": "connectapi",
        "prefix": "/docs/data/connectapi/",
        "category": "connectapi",
        "filter": "full",
    },
    {
        "name": "query-guide",
        "prefix": "/docs/data/data-cloud-query-guide/",
        "category": "query-guide",
        "filter": "full",
    },
    {
        "name": "engagement-mobile-sdk",
        "prefix": "/docs/data/data-cloud-engagement-mobile-sdk/",
        "category": "engagement-mobile-sdk",
        "filter": "full",
    },
    {
        "name": "interactions-sdk",
        "prefix": "/docs/data/salesforce-interactions-sdk/",
        "category": "interactions-sdk",
        "filter": "full",
    },
    {
        "name": "agentic-memory-context",
        "prefix": "/docs/data/agentic-memory-context/",
        "category": "agentic-memory-context",
        "filter": "full",
    },
    {
        "name": "dmo-mapping",
        "prefix": "/docs/data/data-cloud-dmo-mapping/",
        "category": "dmo-mapping",
        "filter": "dmo_phased",
    },
    {
        "name": "integrations",
        "prefix": "/docs/data/data-cloud-int/",
        "category": "integrations",
        "filter": "integrations_phased",
    },
]

# Pure DLO leaf noise under the DMO guide. Object leaves + mapping pages are kept (issue #7).
DMO_DLO_LEAF_RE = re.compile(r"[-_]dlo\.md$", re.IGNORECASE)

# First-party / platform connector allowlist (issue #7). Unmatched vendor leaves stay deferred.
# Salesforce CRM connector docs are not under this prefix (see Help corpus / filter table).
INTEG_FIRST_PARTY_RE = re.compile(
    r"("
    r"ingestion|authenticated-server|real-time-ingestion|data-cloud-integrations|"
    r"connect-an-ingestion|api-get-started|api-ingest|api-bulk|api-streaming|"
    r"api-salesforce-cdp|api-accelerated|schema-req|create-ingestion-api|"
    r"delete-ingestion-api|idp-data-federation|"
    r"developer-required|perform-partial|synchronous-record|close-or-abort|"
    r"create-a-job|delete-a-job|get-all-jobs|get-job-info|upload-job|"
    r"insert-records|delete-records|post-amazon-s3|"
    r"awss3|rotate-s3|deploy-s3|retrieve-s3|"
    r"gcs-|"
    r"azure-data-streams|azure-udlo|set-up-azure-connection|create-sas-token-azure|"
    r"mulesoft|salesforce-web-sdk|admin-web-sdk|setup-web-sdk|"
    r"mobile-web|mobile-sdk|mobile-connector|suggested-web-mobile|"
    r"when-to-use-salesforce-web-sdk|set-up-of-salesforce-web-sdk"
    r")",
    re.IGNORECASE,
)

# Abort rewrite/upsert when the CDN rate-limits too hard (protects prior export).
MAX_FETCH_FAILURE_RATE = 0.15

MD_HEADING_RE = re.compile(r"^(#{1,4})\s+(.+?)\s*$", re.MULTILINE)


def to_canonical_html_url(url: str) -> str:
    """Citation Manifest / learner-facing form uses .html, not .md."""
    parsed = urlparse(url)
    path = parsed.path
    if path.endswith(".md"):
        path = path[: -len(".md")] + ".html"
    return f"https://{parsed.netloc}{path}"


def to_fetch_md_url(canonical_html_url: str) -> str:
    if canonical_html_url.endswith(".html"):
        return canonical_html_url[: -len(".html")] + ".md"
    if canonical_html_url.endswith(".md"):
        return canonical_html_url
    return canonical_html_url + ("" if canonical_html_url.endswith("/") else "") + ".md"


def basename(url: str) -> str:
    return url.rstrip("/").rsplit("/", 1)[-1]


def keep_url(url: str, filter_mode: str) -> bool:
    name = basename(url)
    if filter_mode == "full":
        return True
    if filter_mode == "dmo_phased":
        # Keep Standard/SSOT object leaves, mapping pages, and conceptual guide pages;
        # drop pure DLO leaf noise only.
        return not bool(DMO_DLO_LEAF_RE.search(name))
    if filter_mode == "integrations_phased":
        # Allowlist-only: anything not matched (vendor catalog leaves) stays deferred.
        return bool(INTEG_FIRST_PARTY_RE.search(name))
    return False


def discover_urls(session: requests.Session) -> list[tuple[str, dict]]:
    print(f"Fetching guide index: {LLMS_DATA_CLOUD_URL}")
    resp = session.get(LLMS_DATA_CLOUD_URL, timeout=60)
    resp.raise_for_status()
    text = resp.text
    raw_urls = re.findall(r"https://developer\.salesforce\.com/docs/[^\s\)\]]+", text)
    raw_urls = [u.rstrip(").,") for u in raw_urls]

    selected: list[tuple[str, dict]] = []
    seen = set()
    for guide in GUIDE_SEEDS:
        matches = [u for u in raw_urls if guide["prefix"] in u]
        kept = 0
        for md_url in matches:
            if not keep_url(md_url, guide["filter"]):
                continue
            canonical = to_canonical_html_url(md_url)
            if canonical in seen:
                continue
            seen.add(canonical)
            selected.append((canonical, guide))
            kept += 1
        print(f"  {guide['name']}: kept {kept} / {len(matches)} under {guide['prefix']}")
    print(f"Total pages to crawl: {len(selected)}")
    return selected


def split_markdown_sections(md: str) -> list[tuple[str, str]]:
    """Return (heading, body) pairs; preface before first heading is kept as Overview."""
    matches = list(MD_HEADING_RE.finditer(md))
    if not matches:
        body = md.strip()
        return [("Overview", body)] if len(body) >= 40 else []

    sections: list[tuple[str, str]] = []
    preface = md[: matches[0].start()].strip()
    if len(preface) >= 40:
        sections.append(("Overview", preface))

    for i, match in enumerate(matches):
        heading = match.group(2).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(md)
        body = md[start:end].strip()
        if len(body) < 40:
            continue
        sections.append((heading, body))
    return sections


def chunk_section(
    *,
    canonical_url: str,
    doc_title: str,
    section_title: str,
    body: str,
    category: str,
    now_iso: str,
) -> list[dict]:
    breadcrumb = f"{doc_title} > {section_title}"
    chunks: list[dict] = []

    def make(meta_section: str, text: str, part: int | None = None) -> dict:
        title = f"{meta_section} (Part {part})" if part else meta_section
        crumb = breadcrumb if part is None else f"{breadcrumb} (Part {part})"
        return {
            "document": f"# {crumb}\n\n{text}",
            "metadata": {
                "url": canonical_url,
                "doc_title": doc_title,
                "section_title": title,
                "breadcrumb": crumb,
                "category": category,
                "pillar": "Data_360",
                "source_domain": SOURCE_DOMAIN,
                "char_count": len(text),
                "crawled_at": now_iso,
            },
        }

    if len(body) <= 1800:
        chunks.append(make(section_title, body))
        return chunks

    paragraphs = body.split("\n\n")
    current: list[str] = []
    current_len = 0
    sub_idx = 1
    for p in paragraphs:
        if current_len + len(p) > 1400 and current:
            chunks.append(make(section_title, "\n\n".join(current), sub_idx))
            current = [p]
            current_len = len(p)
            sub_idx += 1
        else:
            current.append(p)
            current_len += len(p)
    if current:
        chunks.append(make(section_title, "\n\n".join(current), sub_idx))
    return chunks


def fetch_markdown(fetch_url: str, session: requests.Session, *, attempts: int = 5) -> str | None:
    """Fetch .md sibling with backoff on 403/429 (developer CDN rate-limits parallel bursts)."""
    for attempt in range(attempts):
        try:
            resp = session.get(fetch_url, timeout=40)
        except Exception as e:
            if attempt + 1 >= attempts:
                print(f"  [ERROR] Failed to fetch {fetch_url}: {e}")
                return None
            time.sleep(1.5 * (2**attempt))
            continue
        if resp.status_code == 200:
            return resp.text
        if resp.status_code in (403, 429) and attempt + 1 < attempts:
            time.sleep(1.5 * (2**attempt))
            continue
        print(f"  [WARN] HTTP {resp.status_code} for {fetch_url}")
        return None
    return None


def fetch_and_chunk(
    canonical_url: str, guide: dict, session: requests.Session
) -> tuple[list[dict], bool]:
    """Return (chunks, fetch_ok). fetch_ok is False on HTTP/network failure."""
    fetch_url = to_fetch_md_url(canonical_url)
    md = fetch_markdown(fetch_url, session)
    if md is None:
        return [], False

    # Prefer first H1 as doc title
    h1 = re.search(r"^#\s+(.+?)\s*$", md, re.MULTILINE)
    doc_title = h1.group(1).strip() if h1 else basename(canonical_url).replace(".html", "")
    now_iso = datetime.now(UTC).isoformat()
    chunks: list[dict] = []
    for section_title, body in split_markdown_sections(md):
        chunks.extend(
            chunk_section(
                canonical_url=canonical_url,
                doc_title=doc_title,
                section_title=section_title,
                body=body,
                category=guide["category"],
                now_iso=now_iso,
            )
        )
    return chunks, True


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(CHROMA_DIR, exist_ok=True)

    print("\n===========================================================")
    print("   ArcGym: developer.salesforce.com Data 360 Crawler       ")
    print("===========================================================\n")

    if ("--reindex-only" in sys.argv or "--cached" in sys.argv) and os.path.exists(
        CHUNKS_JSON_PATH
    ):
        print(f"Loading existing chunks from {CHUNKS_JSON_PATH}...")
        with open(CHUNKS_JSON_PATH, encoding="utf-8") as f:
            all_chunks = json.load(f)
        print(f"Loaded {len(all_chunks)} chunks from local cache.")
    else:
        session = requests.Session(impersonate="chrome")
        targets = discover_urls(session)
        all_chunks: list[dict] = []
        fetch_failures = 0
        start = time.time()
        # Keep concurrency low: developer CDN 403s under bursty parallel fetches.
        max_workers = 2
        print(f"\nStarting crawl across {len(targets)} pages (workers={max_workers})...")
        with ThreadPoolExecutor(max_workers=max_workers) as executor:

            def worker(item: tuple[str, dict]) -> tuple[list[dict], bool]:
                url, guide = item
                sess = requests.Session(impersonate="chrome")
                time.sleep(0.15)
                return fetch_and_chunk(url, guide, sess)

            futures = {executor.submit(worker, t): t[0] for t in targets}
            for done, future in enumerate(as_completed(futures), start=1):
                chunks, ok = future.result()
                if not ok:
                    fetch_failures += 1
                all_chunks.extend(chunks)
                if done % 50 == 0 or done == len(targets):
                    print(
                        f"  [{done}/{len(targets)}] pages | chunks={len(all_chunks)} | "
                        f"fetch_failures={fetch_failures}"
                    )
        elapsed = time.time() - start
        fail_rate = fetch_failures / max(len(targets), 1)
        print(
            f"\n✓ Crawl finished in {elapsed:.1f}s. Extracted {len(all_chunks)} chunks "
            f"({fetch_failures} fetch failures, {fail_rate:.1%})."
        )
        if fail_rate > MAX_FETCH_FAILURE_RATE:
            print(
                "✗ Aborting write/upsert: fetch failure rate too high. "
                "Prior developer_chunks.json left unchanged.",
                file=sys.stderr,
            )
            sys.exit(2)

    assign_stable_ids(all_chunks, "dev")
    for c in all_chunks:
        c.setdefault("metadata", {})["source_domain"] = SOURCE_DOMAIN

    print(f"Saving JSON dump to {CHUNKS_JSON_PATH}...")
    with open(CHUNKS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2)
    size_mb = os.path.getsize(CHUNKS_JSON_PATH) / 1024 / 1024
    print(f"✓ Saved {len(all_chunks)} chunks to {CHUNKS_JSON_PATH} ({size_mb:.2f} MB)")

    print(f"\nUpserting into ChromaDB at: {CHROMA_DIR}...")
    count = upsert_chunks(CHROMA_DIR, all_chunks, source_domain=SOURCE_DOMAIN)
    print(f"✓ ChromaDB upsert complete! Collection count: {count} vectors.")

    cat_counts: dict[str, int] = {}
    for c in all_chunks:
        cat = c["metadata"].get("category", "Other")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    print("\n--- Knowledge Distribution by Category ---")
    for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f" • {cat.ljust(28)} : {cnt} chunks")
    print(f"\nAll operations complete. Chroma DB persisted at: {CHROMA_DIR}\n")


if __name__ == "__main__":
    main()
