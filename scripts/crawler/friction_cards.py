#!/usr/bin/env python3
"""
Friction Card Extraction & Review
Turns crawled Trailhead Community threads into Friction Cards: paraphrased records of
the architectural problem, the naive approaches practitioners tried, and the resolution.
Cards are staged in SQLite (data/trailhead.db), reviewed by a human, and only approved
cards are exported to data/friction_cards.json (local only, git-ignored) for the drill generator.

Usage:
  python scripts/crawler/friction_cards.py extract --limit 10          # needs GEMINI_API_KEY or OPENAI_API_KEY
  python scripts/crawler/friction_cards.py extract --prompt-only --thread 0D5KX00000jAOVQ0A4
  python scripts/crawler/friction_cards.py import responses.json      # cards produced from --prompt-only output
  python scripts/crawler/friction_cards.py review
  python scripts/crawler/friction_cards.py list --status approved
  python scripts/crawler/friction_cards.py export
"""

import os
import sys
import html
import json
import sqlite3
import argparse
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timezone

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DEFAULT_DB_PATH = os.path.join(ROOT_DIR, "data", "trailhead.db")
DEFAULT_EXPORT_PATH = os.path.join(ROOT_DIR, "data", "friction_cards.json")
CHROMA_SEARCH_SCRIPT = os.path.join(ROOT_DIR, "scripts", "crawler", "search_chroma.py")

# Must stay in sync with packages/drill-core/src/types/drill.ts
ARCHITECTURAL_DOMAINS = [
    "Platform_Core", "Data_Architecture", "Security_And_Access", "Integration_Apis",
    "Ai_And_Automation", "Infrastructure", "Devops_Lifecycle",
]
PILLARS = ["Trust", "Reliability", "Operational_Excellence", "Cost_Optimization", "Fairness"]
RESOLUTION_SOURCES = ["best_answer", "thread_consensus", "unresolved"]
STATUSES = ["pending", "approved", "rejected", "irrelevant"]

MAX_REPLIES = 15
MAX_TEXT_CHARS = 2500
MAX_REPLY_CHARS = 1500

EXTRACTION_PROMPT = """You are reviewing a Salesforce Trailblazer Community thread for ArcGym, a practice app for Salesforce architects.
Extract a Friction Card: the architectural problem, the approaches practitioners tried or proposed that do not work, and the resolution.

Rules:
- Paraphrase everything. Do not quote posts. Do not include any person's name or @mention.
- Set "relevant" to false (and leave other fields empty) if the thread has no architectural decision in it, for example a learning-path request, a UI glitch, or a licensing question.
- naive_approaches: only approaches the thread itself attempts, proposes, or warns against. Do not invent any. An empty list is acceptable.
- resolution_source: "best_answer" if the accepted answer resolves the problem, "thread_consensus" if replies agree without an accepted answer, otherwise "unresolved".
- official_doc_query: a short search phrase for finding the matching official Salesforce architecture guidance on architect.salesforce.com.

Thread title: {title}
Thread URL: {url}

Question:
{question}

Accepted answer:
{best_answer}

Replies:
{replies}

Output only JSON in this shape:
{{
  "relevant": true,
  "title": "Short sentence-case title for the problem",
  "domain": "one of {domains}",
  "pillars": ["subset of {pillars}"],
  "problem": "2-3 sentence paraphrase of the situation and what the practitioner needs",
  "constraints": ["volume, latency, licensing, or org constraints stated in the thread"],
  "naive_approaches": [{{"approach": "What was tried or proposed", "why_it_fails": "Why the thread says it does not work"}}],
  "resolution": "Paraphrase of the approach the thread converged on, or empty if unresolved",
  "resolution_source": "one of {sources}",
  "official_doc_query": "search phrase"
}}
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect(db_path: str) -> sqlite3.Connection:
    if not os.path.exists(db_path):
        print(f"[ERROR] Database {db_path} does not exist. Run crawl_trailhead.py first.")
        sys.exit(1)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("""
    CREATE TABLE IF NOT EXISTS friction_cards (
        card_id TEXT PRIMARY KEY,
        discussion_id TEXT NOT NULL UNIQUE REFERENCES discussions(id),
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'irrelevant')),
        card JSON NOT NULL,
        model TEXT,
        extracted_at TEXT NOT NULL,
        reviewed_at TEXT,
        review_note TEXT
    );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cards_status ON friction_cards(status);")
    conn.commit()
    return conn


def card_id_for(discussion_id: str) -> str:
    return f"FC-{discussion_id}"


def truncate(text: str, limit: int = MAX_TEXT_CHARS) -> str:
    text = " ".join(html.unescape(text or "").split())
    return text if len(text) <= limit else text[:limit] + "..."


def thread_replies(raw_payload: str) -> list:
    payload = json.loads(raw_payload)
    edges = (((payload.get("capabilities") or {}).get("comments") or {}).get("items") or {}).get("edges") or []
    replies = []
    for edge in edges[:MAX_REPLIES]:
        text = (((edge.get("node") or {}).get("body")) or {}).get("text") or ""
        if text.strip():
            replies.append(truncate(text, MAX_REPLY_CHARS))
    return replies


def build_prompt(row: sqlite3.Row) -> str:
    replies = thread_replies(row["raw_payload"])
    return EXTRACTION_PROMPT.format(
        title=truncate(row["headline"], 300),
        url=row["url"],
        question=truncate(row["body_text"]) or "(empty)",
        best_answer=truncate(row["best_answer_text"]) if row["has_best_answer"] else "(none)",
        replies="\n".join(f"{i + 1}. {r}" for i, r in enumerate(replies)) or "(none)",
        domains=" | ".join(ARCHITECTURAL_DOMAINS),
        pillars=" | ".join(PILLARS),
        sources=" | ".join(RESOLUTION_SOURCES),
    )


def normalize_card(raw: dict) -> tuple:
    """Validate model output. Returns (status, card) or raises ValueError."""
    if not isinstance(raw, dict):
        raise ValueError("card is not a JSON object")
    if raw.get("relevant") is False:
        return "irrelevant", {"relevant": False}

    for field in ("title", "problem", "official_doc_query"):
        if not isinstance(raw.get(field), str) or not raw[field].strip():
            raise ValueError(f"missing {field}")
    if raw.get("domain") not in ARCHITECTURAL_DOMAINS:
        raise ValueError(f"invalid domain {raw.get('domain')!r}")
    if raw.get("resolution_source") not in RESOLUTION_SOURCES:
        raise ValueError(f"invalid resolution_source {raw.get('resolution_source')!r}")

    approaches = []
    for item in raw.get("naive_approaches") or []:
        if isinstance(item, dict) and item.get("approach") and item.get("why_it_fails"):
            approaches.append({"approach": item["approach"].strip(), "why_it_fails": item["why_it_fails"].strip()})

    card = {
        "relevant": True,
        "title": raw["title"].strip(),
        "domain": raw["domain"],
        "pillars": [p for p in raw.get("pillars") or [] if p in PILLARS],
        "problem": raw["problem"].strip(),
        "constraints": [c.strip() for c in raw.get("constraints") or [] if isinstance(c, str) and c.strip()],
        "naive_approaches": approaches,
        "resolution": (raw.get("resolution") or "").strip(),
        "resolution_source": raw["resolution_source"],
        "official_doc_query": raw["official_doc_query"].strip(),
    }
    return "pending", card


def call_llm(prompt: str, model: str = None) -> tuple:
    """Returns (response_text, model_name). Uses the same providers as generate-drill.ts."""
    gemini_key = os.environ.get("GEMINI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if gemini_key:
        model = model or "gemini-1.5-pro"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
        body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json"}}
        data = post_json(url, body, {})
        return data["candidates"][0]["content"]["parts"][0]["text"], model

    if openai_key:
        model = model or "gpt-4o"
        body = {"model": model, "response_format": {"type": "json_object"}, "messages": [{"role": "user", "content": prompt}]}
        data = post_json("https://api.openai.com/v1/chat/completions", body, {"Authorization": f"Bearer {openai_key}"})
        return data["choices"][0]["message"]["content"], model

    print("[ERROR] No GEMINI_API_KEY or OPENAI_API_KEY set. Use --prompt-only and then `import` the responses.")
    sys.exit(1)


def post_json(url: str, body: dict, headers: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode('utf-8')[:500]}")


def save_card(conn: sqlite3.Connection, discussion_id: str, status: str, card: dict, model: str):
    conn.execute("""
    INSERT INTO friction_cards (card_id, discussion_id, status, card, model, extracted_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(card_id) DO UPDATE SET
        status=excluded.status,
        card=excluded.card,
        model=excluded.model,
        extracted_at=excluded.extracted_at,
        reviewed_at=NULL,
        review_note=NULL
    """, (card_id_for(discussion_id), discussion_id, status, json.dumps(card, ensure_ascii=False), model, now_iso()))
    conn.commit()


def cmd_extract(args):
    conn = connect(args.db_path)
    if args.thread:
        rows = conn.execute("SELECT * FROM discussions WHERE id = ?", (args.thread,)).fetchall()
        if not rows:
            print(f"[ERROR] Thread {args.thread} not found in {args.db_path}.")
            sys.exit(1)
    else:
        existing = "" if args.force else "AND id NOT IN (SELECT discussion_id FROM friction_cards)"
        rows = conn.execute(f"""
        SELECT * FROM discussions
        WHERE comments_count >= ? {existing}
        ORDER BY has_best_answer DESC, comments_count DESC
        LIMIT ?
        """, (args.min_comments, args.limit if args.limit > 0 else -1)).fetchall()

    print(f"[Friction Cards] {len(rows)} thread(s) selected.", file=sys.stderr)
    counts = {"pending": 0, "irrelevant": 0, "failed": 0}
    for row in rows:
        prompt = build_prompt(row)
        if args.prompt_only:
            print(f"===== discussion_id: {row['id']} =====")
            print(prompt)
            continue
        try:
            text, model = call_llm(prompt, args.model)
            status, card = normalize_card(json.loads(text))
        except (RuntimeError, ValueError, KeyError, json.JSONDecodeError) as e:
            counts["failed"] += 1
            print(f"  [SKIP] {row['id']}: {e}", file=sys.stderr)
            continue
        save_card(conn, row["id"], status, card, model)
        counts[status] += 1
        print(f"  [{status.upper()}] {card_id_for(row['id'])}: {card.get('title', row['headline'][:60])}", file=sys.stderr)

    if not args.prompt_only:
        print(f"[Friction Cards] pending: {counts['pending']}, irrelevant: {counts['irrelevant']}, failed: {counts['failed']}", file=sys.stderr)
    conn.close()


def cmd_import(args):
    """Import cards produced externally from --prompt-only output. Each entry needs discussion_id plus card fields."""
    conn = connect(args.db_path)
    with open(args.file, encoding="utf-8") as f:
        entries = json.load(f)
    if isinstance(entries, dict):
        entries = [entries]

    known = {r["id"] for r in conn.execute("SELECT id FROM discussions")}
    for entry in entries:
        discussion_id = entry.get("discussion_id")
        if discussion_id not in known:
            print(f"  [SKIP] unknown discussion_id {discussion_id!r}")
            continue
        try:
            status, card = normalize_card(entry)
        except ValueError as e:
            print(f"  [SKIP] {discussion_id}: {e}")
            continue
        save_card(conn, discussion_id, status, card, args.model)
        print(f"  [{status.upper()}] {card_id_for(discussion_id)}")
    conn.close()


def print_card(row: sqlite3.Row, thread_url: str):
    card = json.loads(row["card"])
    print(f"\n{row['card_id']}  [{row['status']}]  {thread_url}")
    if not card.get("relevant", True):
        print("  (marked irrelevant by extraction)")
        return
    print(f"  Title:      {card['title']}")
    print(f"  Domain:     {card['domain']}  Pillars: {', '.join(card['pillars']) or '-'}")
    print(f"  Problem:    {card['problem']}")
    for c in card["constraints"]:
        print(f"  Constraint: {c}")
    for i, a in enumerate(card["naive_approaches"], 1):
        print(f"  Naive {i}:    {a['approach']}")
        print(f"              fails because: {a['why_it_fails']}")
    print(f"  Resolution: ({card['resolution_source']}) {card['resolution'] or '-'}")
    print(f"  Doc query:  {card['official_doc_query']}")
    if row["review_note"]:
        print(f"  Note:       {row['review_note']}")


def select_cards(conn: sqlite3.Connection, status: str = None) -> list:
    sql = """
    SELECT fc.*, d.url AS thread_url FROM friction_cards fc
    JOIN discussions d ON d.id = fc.discussion_id
    """
    params = ()
    if status:
        sql += " WHERE fc.status = ?"
        params = (status,)
    return conn.execute(sql + " ORDER BY fc.card_id", params).fetchall()


def set_status(conn: sqlite3.Connection, card_id: str, status: str, note: str = None):
    conn.execute(
        "UPDATE friction_cards SET status = ?, reviewed_at = ?, review_note = ? WHERE card_id = ?",
        (status, now_iso(), note, card_id),
    )
    conn.commit()


def cmd_list(args):
    conn = connect(args.db_path)
    rows = select_cards(conn, args.status)
    for row in rows:
        card = json.loads(row["card"])
        title = card.get("title") or "(irrelevant)"
        print(f"{row['card_id']}  {row['status']:<10}  {len(card.get('naive_approaches', []))} naive  {title}")
    print(f"\n{len(rows)} card(s).")
    conn.close()


def preview_docs(query: str, top_k: int = 5):
    """Show which official chunks the generator would retrieve for this query."""
    cmd = ["uv", "run", "--with", "chromadb", "python", CHROMA_SEARCH_SCRIPT, query, "--top-k", str(top_k), "--json"]
    try:
        out = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True, check=True).stdout
        chunks = json.loads(out)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as e:
        print(f"  [WARN] Chroma search failed: {e}")
        return
    for c in chunks:
        meta = c.get("metadata", {})
        print(f"    {c.get('cosine_similarity', 0):.2f}  {meta.get('doc_title')} > {meta.get('section_title')}")


def update_doc_query(conn: sqlite3.Connection, card_id: str, query: str):
    row = conn.execute("SELECT card FROM friction_cards WHERE card_id = ?", (card_id,)).fetchone()
    card = json.loads(row["card"])
    card["official_doc_query"] = query
    conn.execute("UPDATE friction_cards SET card = ? WHERE card_id = ?", (json.dumps(card, ensure_ascii=False), card_id))
    conn.commit()


def cmd_review(args):
    conn = connect(args.db_path)
    rows = select_cards(conn, args.status)
    print(f"[Review] {len(rows)} {args.status} card(s). "
          "Keys: [a]pprove  [r]eject  [s]kip  [p]review docs  [e]dit doc query  [q]uit")
    for row in rows:
        print_card(row, row["thread_url"])
        query = json.loads(row["card"]).get("official_doc_query")
        while True:
            choice = input("  > ").strip().lower()
            if choice == "p" and query:
                print(f"  Top official chunks for: {query}")
                preview_docs(query)
                continue
            if choice == "e" and query:
                new_query = input("  new doc query: ").strip()
                if new_query:
                    query = new_query
                    update_doc_query(conn, row["card_id"], query)
                    print("  Saved. Press [p] to preview.")
                continue
            if choice in ("a", "r"):
                note = input("  note (optional): ").strip() or None
                set_status(conn, row["card_id"], "approved" if choice == "a" else "rejected", note)
                break
            if choice == "s":
                break
            if choice == "q":
                conn.close()
                return
    conn.close()


def cmd_set_status(args):
    conn = connect(args.db_path)
    if not conn.execute("SELECT 1 FROM friction_cards WHERE card_id = ?", (args.card_id,)).fetchone():
        print(f"[ERROR] {args.card_id} not found.")
        sys.exit(1)
    set_status(conn, args.card_id, args.status, args.note)
    print(f"{args.card_id} → {args.status}")
    conn.close()


def cmd_export(args):
    conn = connect(args.db_path)
    cards = []
    for row in select_cards(conn, "approved"):
        card = json.loads(row["card"])
        card.pop("relevant", None)
        cards.append({"card_id": row["card_id"], "thread_url": row["thread_url"], **card, "reviewed_at": row["reviewed_at"]})
    conn.close()

    catalog = {
        "metadata": {
            "description": "Human-reviewed Friction Cards paraphrased from Trailblazer Community threads. "
                           "They source Antipattern Distractors and scenario realism only; correct answers "
                           "must be grounded in official architect.salesforce.com documentation.",
            "card_count": len(cards),
        },
        "cards": cards,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Exported {len(cards)} approved card(s) → {args.out}")


def main():
    parser = argparse.ArgumentParser(description="Extract, review, and export Friction Cards from Trailhead threads.")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH, help="Path to SQLite database")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("extract", help="Extract cards from threads that do not have one yet")
    p.add_argument("--limit", type=int, default=10, help="Max threads to process (0 for all)")
    p.add_argument("--thread", help="Extract a single discussion ID (re-extracts if a card exists)")
    p.add_argument("--min-comments", type=int, default=1, help="Skip threads with fewer replies")
    p.add_argument("--force", action="store_true", help="Re-extract threads that already have a card")
    p.add_argument("--model", help="Override the provider's default model")
    p.add_argument("--prompt-only", action="store_true", help="Print extraction prompts instead of calling an LLM")
    p.set_defaults(func=cmd_extract)

    p = sub.add_parser("import", help="Import cards (JSON object or array with discussion_id) produced externally")
    p.add_argument("file")
    p.add_argument("--model", default="external", help="Model name to record for provenance")
    p.set_defaults(func=cmd_import)

    p = sub.add_parser("list", help="List staged cards")
    p.add_argument("--status", choices=STATUSES)
    p.set_defaults(func=cmd_list)

    p = sub.add_parser("review", help="Interactively approve or reject cards")
    p.add_argument("--status", choices=STATUSES, default="pending")
    p.set_defaults(func=cmd_review)

    p = sub.add_parser("set-status", help="Set a card's review status non-interactively")
    p.add_argument("card_id")
    p.add_argument("status", choices=STATUSES)
    p.add_argument("--note")
    p.set_defaults(func=cmd_set_status)

    p = sub.add_parser("export", help="Write approved cards to the tracked catalog")
    p.add_argument("--out", default=DEFAULT_EXPORT_PATH)
    p.set_defaults(func=cmd_export)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
