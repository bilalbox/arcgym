#!/usr/bin/env python3
"""
Trailhead Community Discussion Scraper & SQLite Ingestion
Queries the public Trailhead Community GraphQL API, paginates through group feeds,
extracts rich question threads, verified Best Answers, and engagement signals,
and stores them in a local SQLite database using the Hybrid Document Pattern.
"""

import argparse
import json
import os
import sqlite3
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(ROOT_DIR, "data")
DEFAULT_DB_PATH = os.path.join(DATA_DIR, "trailhead.db")
GRAPHQL_ENDPOINT = "https://trailhead.salesforce.com/services/community/graphql"

# Group 0F94S000000kQixSAE = "* Data 360 *" official community group
DEFAULT_GROUP_ID = "0F94S000000kQixSAE"

GRAPHQL_QUERY = """
query GetGroupDiscussions(
  $groupId: ID!
  $first: Int = 25
  $after: String
  $filter: BasicFeedFilter
  $sort: BasicFeedSort
  $commentCount: Int = 25
) {
  group(groupId: $groupId) {
    detail {
      name
      description
      memberCount
    }
    feed(
      first: $first
      after: $after
      filter: $filter
      sort: $sort
    ) {
      edges {
        node {
          id
          url
          type
          createdAt
          lastModifiedAt
          headline {
            text
          }
          body {
            text
            segments {
              type
              text
              url
            }
          }
          capabilities {
            likes {
              total
            }
            comments {
              total
              items(first: $commentCount) {
                edges {
                  node {
                    id
                    createdAt
                    body {
                      text
                      segments {
                        type
                        text
                      }
                    }
                  }
                }
              }
            }
            bestAnswer {
              answer {
                id
                createdAt
                body {
                  text
                  segments {
                    type
                    text
                  }
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
"""


def init_db(db_path: str):
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS groups (
        group_id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        member_count INTEGER,
        last_crawled_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS discussions (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        type TEXT NOT NULL,
        headline TEXT,
        body_text TEXT,
        created_at TEXT NOT NULL,
        last_modified_at TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        has_best_answer BOOLEAN DEFAULT 0,
        best_answer_text TEXT,
        url TEXT NOT NULL,
        raw_payload JSON NOT NULL,
        crawled_at TEXT NOT NULL
    );
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_disc_group ON discussions(group_id);")
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_disc_dates ON discussions(created_at, last_modified_at);"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_disc_signals ON discussions(has_best_answer, comments_count);"
    )

    # FTS5 Full Text Search table
    cur.execute("""
    CREATE VIRTUAL TABLE IF NOT EXISTS discussions_fts USING fts5(
        headline,
        body_text,
        best_answer_text,
        content='discussions',
        content_rowid='rowid'
    );
    """)

    # FTS Triggers for syncing
    cur.execute("""
    CREATE TRIGGER IF NOT EXISTS discussions_ai AFTER INSERT ON discussions BEGIN
        INSERT INTO discussions_fts(rowid, headline, body_text, best_answer_text)
        VALUES (new.rowid, new.headline, new.body_text, new.best_answer_text);
    END;
    """)

    cur.execute("""
    CREATE TRIGGER IF NOT EXISTS discussions_ad AFTER DELETE ON discussions BEGIN
        INSERT INTO discussions_fts(discussions_fts, rowid, headline, body_text, best_answer_text)
        VALUES('delete', old.rowid, old.headline, old.body_text, old.best_answer_text);
    END;
    """)

    cur.execute("""
    CREATE TRIGGER IF NOT EXISTS discussions_au AFTER UPDATE ON discussions BEGIN
        INSERT INTO discussions_fts(discussions_fts, rowid, headline, body_text, best_answer_text)
        VALUES('delete', old.rowid, old.headline, old.body_text, old.best_answer_text);
        INSERT INTO discussions_fts(rowid, headline, body_text, best_answer_text)
        VALUES (new.rowid, new.headline, new.body_text, new.best_answer_text);
    END;
    """)

    conn.commit()
    return conn


def extract_clean_text(body_dict: dict) -> str:
    if not body_dict:
        return ""
    direct_text = body_dict.get("text")
    if direct_text and direct_text.strip():
        return direct_text.strip()

    segments = body_dict.get("segments") or []
    pieces = []
    for s in segments:
        stext = s.get("text")
        if stext:
            pieces.append(stext)
    return " ".join("".join(pieces).split()).strip()


def fetch_graphql_page(
    group_id: str,
    cursor: str | None = None,
    filter_type: str = "ALL_QUESTIONS",
    sort: str = "LAST_MODIFIED_DATE_DESC",
    batch_size: int = 25,
):
    variables = {"groupId": group_id, "first": batch_size, "commentCount": 25, "sort": sort}
    if cursor:
        variables["after"] = cursor
    if filter_type and filter_type != "NONE":
        variables["filter"] = filter_type

    payload = {"query": GRAPHQL_QUERY, "variables": variables}

    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    req = urllib.request.Request(
        GRAPHQL_ENDPOINT, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if "errors" in data:
                raise RuntimeError(f"GraphQL Errors: {json.dumps(data['errors'])}")
            return data.get("data", {}).get("group", {})
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        raise RuntimeError(f"HTTP {e.code}: {body}") from e


def crawl_group(
    group_id: str = DEFAULT_GROUP_ID,
    db_path: str = DEFAULT_DB_PATH,
    limit: int = 100,
    filter_type: str = "ALL_QUESTIONS",
    sort: str = "LAST_MODIFIED_DATE_DESC",
    rate_limit: float = 0.4,
):
    print(f"[Trailhead Crawler] Starting ingestion for Group ID: {group_id}")
    print(f"[Trailhead Crawler] SQLite target: {db_path}")
    print(
        f"[Trailhead Crawler] Filter: {filter_type} | Sort: {sort} | Target limit: {limit if limit > 0 else 'ALL'}"
    )

    conn = init_db(db_path)
    cur = conn.cursor()

    cursor = None
    total_fetched = 0
    total_upserted = 0
    group_info_saved = False

    while True:
        try:
            group_data = fetch_graphql_page(
                group_id=group_id,
                cursor=cursor,
                filter_type=filter_type,
                sort=sort,
                batch_size=min(50, limit - total_fetched) if limit > 0 else 50,
            )
        except Exception as e:
            print(f"[ERROR] Failed fetching page (cursor={cursor}): {e}")
            break

        if not group_info_saved and "detail" in group_data:
            detail = group_data["detail"] or {}
            now_iso = datetime.now(UTC).isoformat()
            cur.execute(
                """
            INSERT INTO groups (group_id, name, description, member_count, last_crawled_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(group_id) DO UPDATE SET
                name=excluded.name,
                description=excluded.description,
                member_count=excluded.member_count,
                last_crawled_at=excluded.last_crawled_at
            """,
                (
                    group_id,
                    detail.get("name"),
                    detail.get("description"),
                    detail.get("memberCount"),
                    now_iso,
                ),
            )
            conn.commit()
            group_info_saved = True
            print(f"[Group] Connected: {detail.get('name')} ({detail.get('memberCount')} members)")

        feed = group_data.get("feed") or {}
        edges = feed.get("edges") or []
        if not edges:
            print("[INFO] No more items found in feed.")
            break

        now_iso = datetime.now(UTC).isoformat()

        for edge in edges:
            node = edge.get("node") or {}
            node_id = node.get("id")
            if not node_id:
                continue

            node_type = node.get("type", "UNKNOWN")
            headline = (node.get("headline") or {}).get("text")
            body_text = extract_clean_text(node.get("body") or {})
            created_at = node.get("createdAt") or now_iso
            last_mod_at = node.get("lastModifiedAt") or created_at
            url = (
                node.get("url")
                or f"https://trailhead.salesforce.com/trailblazer-community/feed/{node_id}"
            )

            cap = node.get("capabilities") or {}
            likes_count = (cap.get("likes") or {}).get("total", 0)
            comments_count = (cap.get("comments") or {}).get("total", 0)

            best_ans_node = (cap.get("bestAnswer") or {}).get("answer")
            has_best_answer = bool(best_ans_node)
            best_answer_text = (
                extract_clean_text(best_ans_node.get("body")) if best_ans_node else None
            )

            raw_payload = json.dumps(node, ensure_ascii=False)

            cur.execute(
                """
            INSERT INTO discussions (
                id, group_id, type, headline, body_text, created_at, last_modified_at,
                likes_count, comments_count, has_best_answer, best_answer_text,
                url, raw_payload, crawled_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                last_modified_at=excluded.last_modified_at,
                likes_count=excluded.likes_count,
                comments_count=excluded.comments_count,
                has_best_answer=excluded.has_best_answer,
                best_answer_text=excluded.best_answer_text,
                raw_payload=excluded.raw_payload,
                crawled_at=excluded.crawled_at
            """,
                (
                    node_id,
                    group_id,
                    node_type,
                    headline,
                    body_text,
                    created_at,
                    last_mod_at,
                    likes_count,
                    comments_count,
                    has_best_answer,
                    best_answer_text,
                    url,
                    raw_payload,
                    now_iso,
                ),
            )
            total_upserted += 1

        conn.commit()
        total_fetched += len(edges)
        print(f"  [Progress] Fetched {total_fetched} discussions (upserted: {total_upserted})...")

        page_info = feed.get("pageInfo") or {}
        has_next = page_info.get("hasNextPage")
        cursor = page_info.get("endCursor")

        if not has_next or not cursor:
            print("[INFO] Reached end of discussion history.")
            break

        if limit > 0 and total_fetched >= limit:
            print(f"[INFO] Reached requested limit of {limit} discussions.")
            break

        time.sleep(rate_limit)

    conn.close()
    print(f"\n[Done] Finished crawling. Total processed in SQLite: {total_upserted} items.")


def main():
    parser = argparse.ArgumentParser(
        description="Scrape Trailhead Community discussions into SQLite."
    )
    parser.add_argument(
        "--group-id",
        default=DEFAULT_GROUP_ID,
        help="Trailhead Community Group ID (default: Data 360)",
    )
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH, help="Path to SQLite database")
    parser.add_argument("--limit", type=int, default=100, help="Max items to fetch (0 for all)")
    parser.add_argument(
        "--filter",
        default="ALL_QUESTIONS",
        choices=[
            "ALL_QUESTIONS",
            "SOLVED_QUESTIONS",
            "UNSOLVED_QUESTIONS",
            "UNANSWERED_QUESTIONS",
            "NONE",
        ],
        help="Feed filter",
    )
    parser.add_argument(
        "--sort",
        default="LAST_MODIFIED_DATE_DESC",
        choices=["LAST_MODIFIED_DATE_DESC", "CREATED_DATE_DESC"],
        help="Feed sort",
    )
    parser.add_argument(
        "--rate-limit", type=float, default=0.3, help="Seconds delay between page requests"
    )

    args = parser.parse_args()
    crawl_group(
        group_id=args.group_id,
        db_path=args.db_path,
        limit=args.limit,
        filter_type=args.filter,
        sort=args.sort,
        rate_limit=args.rate_limit,
    )


if __name__ == "__main__":
    main()
