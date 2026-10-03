#!/usr/bin/env python3
"""
ArcGym Help.salesforce.com crawler (Data 360 / architecture-adjacent).

Help pages are JS shells; article bodies are fetched via the public Aura
Help_ArticleDataController.getData endpoint (no browser / CDP).

Writes data/help_chunks.json and upserts into the shared Chroma grounding
collection with source_domain=help.salesforce.com.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html import unescape
from urllib.parse import parse_qs, urlparse

from curl_cffi import requests

from chroma_index import assign_stable_ids, upsert_chunks

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(ROOT_DIR, "data")
CHROMA_DIR = os.path.join(DATA_DIR, "chroma")
CHUNKS_JSON_PATH = os.path.join(DATA_DIR, "help_chunks.json")
SOURCE_DOMAIN = "help.salesforce.com"

BASE_URL = "https://help.salesforce.com"
AURA_ENDPOINT = f"{BASE_URL}/s/sfsites/aura?r=30&aura.ApexAction.execute=1"

# Curated entry points (Data 360 / architecture-adjacent). Expansion stays inside
# TOPIC_PREFIX_RE so v1 does not ingest the entire Help catalog.
SEED_URL_NAMES = [
    "sf.c360_a_data_cloud.htm",
    "sf.c360_a_product_considerations.htm",
    "sf.c360_a_data_streams.htm",
    "sf.c360_a_data_lake_objects.htm",
    "sf.c360_a_data_model_objects.htm",
    "sf.c360_a_identity_resolution.htm",
    "sf.c360_a_data_graphs.htm",
    "sf.c360_a_segments.htm",
    "sf.c360_a_data_actions.htm",
    "sf.c360_a_data_shares.htm",
    "sf.c360_a_data_cloud_one.htm",
    "sf.c360_a_billing.htm",
    "sf.c360_a_data_cloud_architecture_strategy.htm",
    "sf.c360_a_connectors.htm",
    "sf.c360_a_connection_tasks.htm",
    "sf.c360_a_connect_data_task_steps.htm",
    "sf.c360_a_build_and_manage_data_graphs.htm",
    "sf.c360_a_create_custom_data_model_object.htm",
    "sf.c360_a_data_model_object_relationships.htm",
    "sf.c360_a_billing_considerations_for_data_ingestion.htm",
    "sf.c360_a_billing_considerations_for_identity_resolution.htm",
    "sf.c360_a_billing_considerations_for_segmentation.htm",
    "sf.c360_a_billing_considerations_for_data_graphs.htm",
    "sf.c360_a_limits_and_guidelines.htm",
    "sf.c360_a_userpermissions.htm",
    "sf.c360_a_data_usage_types.htm",
    "sf.c360_a_glossary_guide.htm",
    "sf.c360_a_data_explorer.htm",
    "sf.c360_a_data_streams_tab.htm",
    "sf.c360_a_create_a_segment.htm",
    "sf.c360_a_access_data_from_snowflake.htm",
    "sf.c360_a_access_data_from_databricks.htm",
    "sf.c360_a_access_data_from_redshift.htm",
    "sf.c360_a_access_data_from_google_bigquery.htm",
]

TOPIC_PREFIX_RE = re.compile(
    r"^(sf\.|data\.)?(c360_a_|cdp_|data_cloud|datacloud)",
    re.IGNORECASE,
)
MAX_ARTICLES = 200
LINK_ID_RE = re.compile(
    r"(?:HTViewHelpDoc\?id=|[?&]id=)([A-Za-z0-9_.]+?\.htm)",
    re.IGNORECASE,
)
HEADING_RE = re.compile(r"^(#{1,4})\s+(.+?)\s*$", re.MULTILINE)

KNOWN_FWUID = (
    "VEhtaDlVRkdCeTJiZFhuOTVYYjRJQTJEa1N5enhOU3R5QWl2VzNveFZTbGcxMy4tMjE0NzQ4MzY0OC4xMzEwNzIwMA"
)
KNOWN_LOADED_HASH = "1533_ez-GoXD6UAAJ6rtTbHErdw"
KNOWN_RELEASE = "260.0.0"


def canonical_help_url(url_name: str) -> str:
    return f"{BASE_URL}/s/articleView?id={url_name}&language=en_US&type=5"


def normalize_url_name(raw: str) -> str | None:
    name = raw.strip()
    if not name:
        return None
    if name.startswith("http"):
        parsed = urlparse(name)
        if parsed.hostname != "help.salesforce.com":
            return None
        ids = parse_qs(parsed.query).get("id") or []
        if not ids:
            return None
        name = ids[0]
    if not name.endswith(".htm"):
        name = f"{name}.htm"
    # Keep Data 360 / CDP Help topics only.
    if not TOPIC_PREFIX_RE.search(name):
        return None
    # Aura getData serves sf.* (and bare c360_*) but not data.* aliases.
    if name.startswith("data."):
        name = "sf." + name[len("data.") :]
    elif not name.startswith("sf.") and name.startswith("c360_"):
        name = "sf." + name
    return name


def refresh_aura_config(session: requests.Session) -> tuple[str, str, str]:
    resp = session.get(BASE_URL, timeout=30)
    html = resp.text
    fwuid_m = re.search(r'"fwuid"\s*:\s*"([^"]+)"', html)
    loaded_m = re.search(
        r'"APPLICATION@markup://siteforce:communityApp"\s*:\s*"([^"]+)"',
        html,
    )
    release_m = re.search(r'siteUserRelease[=:]["\']?(\d+\.\d+\.\d+)', html)
    fwuid = fwuid_m.group(1) if fwuid_m else KNOWN_FWUID
    loaded = loaded_m.group(1) if loaded_m else KNOWN_LOADED_HASH
    release = release_m.group(1) if release_m else KNOWN_RELEASE
    return fwuid, loaded, release


def aura_get_article(
    session: requests.Session,
    url_name: str,
    fwuid: str,
    loaded_hash: str,
    release: str,
) -> dict | None:
    message = json.dumps(
        {
            "actions": [
                {
                    "id": "130;a",
                    "descriptor": "aura://ApexActionController/ACTION$execute",
                    "callingDescriptor": "UNKNOWN",
                    "params": {
                        "namespace": "",
                        "classname": "Help_ArticleDataController",
                        "method": "getData",
                        "params": {
                            "articleParameters": {
                                "urlName": url_name,
                                "language": "en_US",
                                "release": release,
                                "requestedArticleType": "HelpDocs",
                                "requestedArticleTypeNumber": "5",
                            }
                        },
                        "cacheable": False,
                        "isContinuation": False,
                    },
                }
            ]
        }
    )
    aura_context = json.dumps(
        {
            "mode": "PROD",
            "fwuid": fwuid,
            "app": "siteforce:communityApp",
            "loaded": {"APPLICATION@markup://siteforce:communityApp": loaded_hash},
            "dn": [],
            "globals": {},
            "uad": True,
        }
    )
    resp = session.post(
        AURA_ENDPOINT,
        data={
            "message": message,
            "aura.context": aura_context,
            "aura.pageURI": f"/s/articleView?id={url_name}&type=5",
            "aura.token": "null",
        },
        headers={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": BASE_URL,
            "Referer": f"{BASE_URL}/s/articleView?id={url_name}&type=5",
            "x-sfdc-lds-endpoints": "ApexActionController.execute:Help_ArticleDataController.getData",
        },
        timeout=45,
    )
    if resp.status_code != 200:
        return None
    action = (resp.json().get("actions") or [None])[0]
    if not action or action.get("state") != "SUCCESS":
        return None
    rv = action.get("returnValue") or {}
    # Nested returnValue.returnValue.record
    if isinstance(rv, dict) and "returnValue" in rv:
        rv = rv.get("returnValue") or {}
    record = rv.get("record") if isinstance(rv, dict) else None
    if not isinstance(record, dict):
        return None
    if not (record.get("Content__c") or record.get("Title__c")):
        return None
    return record


def xhtml_to_markdown(xhtml: str) -> str:
    """Lightweight HTML→markdown good enough for chunking (no turndown dependency)."""
    from bs4 import BeautifulSoup

    # Drop head
    body = re.sub(r"^[\s\S]*?</head\s*>", "", xhtml, count=1, flags=re.I)
    body_m = re.search(r"<body[^>]*>([\s\S]*)</body>", body, flags=re.I)
    if body_m:
        body = body_m.group(1)
    soup = BeautifulSoup(body, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    # Salesforce Help XHTML often uses <p><b>Section</b></p> instead of real headings.
    for p in soup.find_all("p"):
        children = [c for c in p.children if getattr(c, "name", None) or str(c).strip()]
        if len(children) == 1 and getattr(children[0], "name", None) in {"b", "strong"}:
            text = children[0].get_text(" ", strip=True)
            if text and len(text) < 120:
                p.replace_with(soup.new_tag("h2", string=text))

    lines: list[str] = []
    for el in soup.find_all(["h1", "h2", "h3", "h4", "p", "li", "pre"]):
        name = el.name.lower()
        text = el.get_text(" ", strip=True)
        if not text:
            continue
        if name in {"h1", "h2", "h3", "h4"}:
            lines.append(f"\n{'#' * int(name[1])} {text}\n")
        elif name == "li":
            lines.append(f"- {text}")
        elif name == "pre":
            lines.append(f"\n```\n{text}\n```\n")
        else:
            lines.append(f"\n{text}\n")

    md = unescape("\n".join(lines))
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    return md


def extract_linked_url_names(content_xhtml: str) -> list[str]:
    found: list[str] = []
    for match in LINK_ID_RE.findall(content_xhtml):
        normalized = normalize_url_name(match)
        if normalized:
            found.append(normalized)
    # Also bare id=…htm attributes
    for match in re.findall(r'id=["\']([A-Za-z0-9_.]+\.htm)["\']', content_xhtml):
        normalized = normalize_url_name(match)
        if normalized:
            found.append(normalized)
    return found


def split_markdown_sections(md: str) -> list[tuple[str, str]]:
    matches = list(HEADING_RE.finditer(md))
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


def chunk_article(url_name: str, title: str, markdown: str, now_iso: str) -> list[dict]:
    canonical = canonical_help_url(url_name)
    chunks: list[dict] = []
    for section_title, body in split_markdown_sections(markdown):
        breadcrumb = f"{title} > {section_title}"
        if len(body) <= 1800:
            chunks.append(
                {
                    "document": f"# {breadcrumb}\n\n{body}",
                    "metadata": {
                        "url": canonical,
                        "doc_title": title,
                        "section_title": section_title,
                        "breadcrumb": breadcrumb,
                        "category": "help-data-360",
                        "pillar": "Data_360",
                        "source_domain": SOURCE_DOMAIN,
                        "char_count": len(body),
                        "crawled_at": now_iso,
                    },
                }
            )
            continue
        paragraphs = body.split("\n\n")
        current: list[str] = []
        current_len = 0
        sub_idx = 1
        for p in paragraphs:
            if current_len + len(p) > 1400 and current:
                text = "\n\n".join(current)
                sec = f"{section_title} (Part {sub_idx})"
                crumb = f"{title} > {sec}"
                chunks.append(
                    {
                        "document": f"# {crumb}\n\n{text}",
                        "metadata": {
                            "url": canonical,
                            "doc_title": title,
                            "section_title": sec,
                            "breadcrumb": crumb,
                            "category": "help-data-360",
                            "pillar": "Data_360",
                            "source_domain": SOURCE_DOMAIN,
                            "char_count": len(text),
                            "crawled_at": now_iso,
                        },
                    }
                )
                current = [p]
                current_len = len(p)
                sub_idx += 1
            else:
                current.append(p)
                current_len += len(p)
        if current:
            text = "\n\n".join(current)
            sec = f"{section_title} (Part {sub_idx})"
            crumb = f"{title} > {sec}"
            chunks.append(
                {
                    "document": f"# {crumb}\n\n{text}",
                    "metadata": {
                        "url": canonical,
                        "doc_title": title,
                        "section_title": sec,
                        "breadcrumb": crumb,
                        "category": "help-data-360",
                        "pillar": "Data_360",
                        "source_domain": SOURCE_DOMAIN,
                        "char_count": len(text),
                        "crawled_at": now_iso,
                    },
                }
            )
    return chunks


def discover_url_names(session: requests.Session, fwuid: str, loaded: str, release: str) -> list[str]:
    queue = list(dict.fromkeys(SEED_URL_NAMES))
    seen: set[str] = set()
    ordered: list[str] = []
    while queue and len(ordered) < MAX_ARTICLES:
        name = queue.pop(0)
        if name in seen:
            continue
        seen.add(name)
        record = aura_get_article(session, name, fwuid, loaded, release)
        if not record:
            # Retry once after refreshing aura config
            fwuid, loaded, release = refresh_aura_config(session)
            record = aura_get_article(session, name, fwuid, loaded, release)
        if not record:
            print(f"  [SKIP] no record for {name}")
            continue
        ordered.append(name)
        content = record.get("Content__c") or ""
        for linked in extract_linked_url_names(content):
            if linked not in seen and linked not in queue and len(ordered) + len(queue) < MAX_ARTICLES * 2:
                queue.append(linked)
        if len(ordered) % 10 == 0:
            print(f"  discovered {len(ordered)} articles | queue {len(queue)}")
    return ordered[:MAX_ARTICLES]


def fetch_and_chunk(
    url_name: str,
    session: requests.Session,
    fwuid: str,
    loaded: str,
    release: str,
) -> list[dict]:
    record = aura_get_article(session, url_name, fwuid, loaded, release)
    if not record:
        fwuid, loaded, release = refresh_aura_config(session)
        record = aura_get_article(session, url_name, fwuid, loaded, release)
    if not record:
        print(f"  [WARN] failed to fetch {url_name}")
        return []
    title = (record.get("Title__c") or url_name).strip()
    markdown = xhtml_to_markdown(record.get("Content__c") or "")
    if len(markdown) < 40:
        print(f"  [WARN] empty body for {url_name}")
        return []
    return chunk_article(url_name, title, markdown, datetime.now(timezone.utc).isoformat())


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(CHROMA_DIR, exist_ok=True)

    print("\n===========================================================")
    print("   ArcGym: help.salesforce.com Data 360 Help Crawler       ")
    print("===========================================================\n")

    if ("--reindex-only" in sys.argv or "--cached" in sys.argv) and os.path.exists(
        CHUNKS_JSON_PATH
    ):
        print(f"Loading existing chunks from {CHUNKS_JSON_PATH}...")
        with open(CHUNKS_JSON_PATH, "r", encoding="utf-8") as f:
            all_chunks = json.load(f)
        print(f"Loaded {len(all_chunks)} chunks from local cache.")
    else:
        session = requests.Session(impersonate="chrome")
        fwuid, loaded, release = refresh_aura_config(session)
        print(f"Aura config ready (release={release})")
        print("Discovering articles from seeds + in-topic links...")
        url_names = discover_url_names(session, fwuid, loaded, release)
        print(f"Total articles to chunk: {len(url_names)}")

        all_chunks: list[dict] = []
        start = time.time()
        # Serial fetch is kinder to Aura; parallel lightly.
        with ThreadPoolExecutor(max_workers=4) as executor:

            def worker(name: str) -> list[dict]:
                sess = requests.Session(impersonate="chrome")
                return fetch_and_chunk(name, sess, fwuid, loaded, release)

            futures = {executor.submit(worker, n): n for n in url_names}
            done = 0
            for future in as_completed(futures):
                done += 1
                all_chunks.extend(future.result())
                if done % 15 == 0 or done == len(url_names):
                    print(f"  [{done}/{len(url_names)}] | chunks {len(all_chunks)}")
        print(f"\n✓ Crawl finished in {time.time() - start:.1f}s. Extracted {len(all_chunks)} chunks.")

    assign_stable_ids(all_chunks, "help")
    for c in all_chunks:
        c.setdefault("metadata", {})["source_domain"] = SOURCE_DOMAIN

    print(f"Saving JSON dump to {CHUNKS_JSON_PATH}...")
    with open(CHUNKS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2)
    size_mb = os.path.getsize(CHUNKS_JSON_PATH) / 1024 / 1024
    print(f"✓ Saved {len(all_chunks)} chunks ({size_mb:.2f} MB)")

    print(f"\nUpserting into ChromaDB at: {CHROMA_DIR}...")
    count = upsert_chunks(CHROMA_DIR, all_chunks, source_domain=SOURCE_DOMAIN)
    print(f"✓ ChromaDB upsert complete! Collection count: {count} vectors.\n")


if __name__ == "__main__":
    main()
