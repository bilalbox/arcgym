#!/usr/bin/env python3
"""
Friction Card Extraction & Review
Turns crawled Trailhead Community threads into Friction Cards: paraphrased records of
the architectural problem, the naive approaches practitioners tried, and the resolution.
The coding agent answers the extraction prompts; cards are staged in SQLite (data/trailhead.db),
reviewed by a human, and only approved cards are exported to data/friction_cards.json
(local only, git-ignored) for the drill generator.

Usage:
  python scripts/crawler/friction_cards.py prompt --limit 10 > /tmp/card-prompts.md
  python scripts/crawler/friction_cards.py prompt --thread 0D5KX00000jAOVQ0A4
  python scripts/crawler/friction_cards.py import /tmp/cards.json     # the agent's answers, as a JSON array
  python scripts/crawler/friction_cards.py audit-prompt --tier A --limit 20 > /tmp/audit-prompts.md
  python scripts/crawler/friction_cards.py apply-verdicts /tmp/verdicts.json
  python scripts/crawler/friction_cards.py review
  python scripts/crawler/friction_cards.py list --status approved
  python scripts/crawler/friction_cards.py export
"""

import argparse
import html
import json
import os
import sqlite3
import subprocess
import sys
from datetime import UTC, datetime

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DEFAULT_DB_PATH = os.path.join(ROOT_DIR, "data", "trailhead.db")
DEFAULT_EXPORT_PATH = os.path.join(ROOT_DIR, "data", "friction_cards.json")
CHROMA_SEARCH_SCRIPT = os.path.join(ROOT_DIR, "scripts", "crawler", "search_chroma.py")

# Must stay in sync with packages/drill-core/src/types/drill.ts
ARCHITECTURAL_DOMAINS = [
    "Platform_Core",
    "Data_Architecture",
    "Security_And_Access",
    "Integration_Apis",
    "Ai_And_Automation",
    "Infrastructure",
    "Devops_Lifecycle",
]
PILLARS = ["Trust", "Reliability", "Operational_Excellence", "Cost_Optimization", "Fairness"]
RESOLUTION_SOURCES = ["best_answer", "thread_consensus", "unresolved"]
STATUSES = ["pending", "approved", "rejected", "irrelevant"]
AUDIT_VERDICTS = ["approve", "reject", "fix", "irrelevant"]
AUDIT_TIERS = ["A", "B", "C", "D", "all"]

MAX_REPLIES = 15
MAX_TEXT_CHARS = 2500
MAX_REPLY_CHARS = 1500

AUDIT_PROMPT = """You are auditing a staged Friction Card for ArcGym against its source Trailblazer Community thread.

The card must stay faithful to the thread and useful for drill distractors / scenario realism. Official docs remain the source of correct answers; only judge the card and its doc query.

Rules:
- approve: problem, naive approaches, and resolution are faithful; domain/pillars sensible; doc query would find governing architect.salesforce.com guidance.
- reject: not useful for drills (too ops/UI-specific, no architectural tension, hallucinated naive approaches, or resolution contradicts the thread).
- fix: mostly good but needs a better official_doc_query (and optionally a short note). Leave status pending after the query is updated.
- irrelevant: thread has no architectural decision (learning path, UI glitch, licensing, Trailhead-org-only). Prefer this over reject when the extraction should have marked relevant=false.

Card id: {card_id}
Thread URL: {url}

=== Staged card ===
{card_json}

=== Source thread ===
Title: {title}

Question:
{question}

Accepted answer:
{best_answer}

Replies:
{replies}

=== Official doc preview (Chroma) ===
{doc_preview}

Output only JSON in this shape:
{{
  "card_id": "{card_id}",
  "verdict": "one of approve | reject | fix | irrelevant",
  "issues": ["short issue strings, empty if none"],
  "suggested_doc_query": "replacement query when verdict is fix, else empty string",
  "note": "one-line review note for provenance"
}}
"""

EXTRACTION_PROMPT = """You are reviewing a Salesforce Trailblazer Community thread for ArcGym, a practice app for Salesforce architects.
Extract a Friction Card: the architectural problem, the approaches practitioners tried or proposed that do not work, and the resolution.

Rules:
- Paraphrase everything in your own words, and refer to people by role (practitioner, replier) rather than name.
- Set "relevant" to false (and leave other fields empty) if the thread has no architectural decision in it, for example a learning-path request, a UI glitch, or a licensing question.
- naive_approaches: each one faithful, meaning the thread itself attempts, proposes, or warns against it. Fewer faithful approaches beat more; an empty list is fine.
- resolution_source: "best_answer" if the accepted answer resolves the problem, "thread_consensus" if replies agree without an accepted answer, otherwise "unresolved".
- official_doc_query: the phrase you would type into architect.salesforce.com search to find the guidance that governs this problem.

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
  "discussion_id": "{discussion_id}",
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
    return datetime.now(UTC).isoformat()


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
    edges = (((payload.get("capabilities") or {}).get("comments") or {}).get("items") or {}).get(
        "edges"
    ) or []
    replies = []
    for edge in edges[:MAX_REPLIES]:
        text = (((edge.get("node") or {}).get("body")) or {}).get("text") or ""
        if text.strip():
            replies.append(truncate(text, MAX_REPLY_CHARS))
    return replies


def build_prompt(row: sqlite3.Row) -> str:
    replies = thread_replies(row["raw_payload"])
    return EXTRACTION_PROMPT.format(
        discussion_id=row["id"],
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
            approaches.append(
                {"approach": item["approach"].strip(), "why_it_fails": item["why_it_fails"].strip()}
            )

    card = {
        "relevant": True,
        "title": raw["title"].strip(),
        "domain": raw["domain"],
        "pillars": [p for p in raw.get("pillars") or [] if p in PILLARS],
        "problem": raw["problem"].strip(),
        "constraints": [
            c.strip() for c in raw.get("constraints") or [] if isinstance(c, str) and c.strip()
        ],
        "naive_approaches": approaches,
        "resolution": (raw.get("resolution") or "").strip(),
        "resolution_source": raw["resolution_source"],
        "official_doc_query": raw["official_doc_query"].strip(),
    }
    return "pending", card


def save_card(conn: sqlite3.Connection, discussion_id: str, status: str, card: dict, model: str):
    conn.execute(
        """
    INSERT INTO friction_cards (card_id, discussion_id, status, card, model, extracted_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(card_id) DO UPDATE SET
        status=excluded.status,
        card=excluded.card,
        model=excluded.model,
        extracted_at=excluded.extracted_at,
        reviewed_at=NULL,
        review_note=NULL
    """,
        (
            card_id_for(discussion_id),
            discussion_id,
            status,
            json.dumps(card, ensure_ascii=False),
            model,
            now_iso(),
        ),
    )
    conn.commit()


def cmd_prompt(args):
    conn = connect(args.db_path)
    if args.thread:
        rows = conn.execute("SELECT * FROM discussions WHERE id = ?", (args.thread,)).fetchall()
        if not rows:
            print(f"[ERROR] Thread {args.thread} not found in {args.db_path}.")
            sys.exit(1)
    else:
        existing = "" if args.force else "AND id NOT IN (SELECT discussion_id FROM friction_cards)"
        rows = conn.execute(
            f"""
        SELECT * FROM discussions
        WHERE comments_count >= ? {existing}
        ORDER BY has_best_answer DESC, comments_count DESC
        LIMIT ?
        """,
            (args.min_comments, args.limit if args.limit > 0 else -1),
        ).fetchall()

    print(f"[Friction Cards] {len(rows)} thread(s) selected.", file=sys.stderr)
    for row in rows:
        print(f"===== discussion_id: {row['id']} =====")
        print(build_prompt(row))
    conn.close()


def cmd_import(args):
    """Import the agent's answers to `prompt`: a JSON object or array, each entry carrying discussion_id."""
    conn = connect(args.db_path)
    with open(args.file, encoding="utf-8") as f:
        entries = json.load(f)
    if isinstance(entries, dict):
        entries = [entries]

    known = {r["id"] for r in conn.execute("SELECT id FROM discussions")}
    for entry in entries:
        discussion_id = entry.get("discussion_id")
        if not discussion_id or discussion_id not in known:
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


def select_cards(conn: sqlite3.Connection, status: str | None = None) -> list:
    sql = """
    SELECT fc.*, d.url AS thread_url FROM friction_cards fc
    JOIN discussions d ON d.id = fc.discussion_id
    """
    params = ()
    if status:
        sql += " WHERE fc.status = ?"
        params = (status,)
    return conn.execute(sql + " ORDER BY fc.card_id", params).fetchall()


def set_status(conn: sqlite3.Connection, card_id: str, status: str, note: str | None = None):
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
        print(
            f"{row['card_id']}  {row['status']:<10}  {len(card.get('naive_approaches', []))} naive  {title}"
        )
    print(f"\n{len(rows)} card(s).")
    conn.close()


def preview_docs(query: str, top_k: int = 5):
    """Show which official chunks the generator would retrieve for this query."""
    cmd = [
        "uv",
        "run",
        "--with",
        "chromadb",
        "python",
        CHROMA_SEARCH_SCRIPT,
        query,
        "--top-k",
        str(top_k),
        "--json",
    ]
    try:
        out = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True, check=True).stdout
        chunks = json.loads(out)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as e:
        print(f"  [WARN] Chroma search failed: {e}")
        return
    for c in chunks:
        meta = c.get("metadata", {})
        print(
            f"    {c.get('cosine_similarity', 0):.2f}  {meta.get('doc_title')} > {meta.get('section_title')}"
        )


def update_doc_query(conn: sqlite3.Connection, card_id: str, query: str):
    row = conn.execute("SELECT card FROM friction_cards WHERE card_id = ?", (card_id,)).fetchone()
    card = json.loads(row["card"])
    card["official_doc_query"] = query
    conn.execute(
        "UPDATE friction_cards SET card = ? WHERE card_id = ?",
        (json.dumps(card, ensure_ascii=False), card_id),
    )
    conn.commit()


def cmd_review(args):
    conn = connect(args.db_path)
    rows = select_cards(conn, args.status)
    print(
        f"[Review] {len(rows)} {args.status} card(s). "
        "Keys: [a]pprove  [r]eject  [s]kip  [p]review docs  [e]dit doc query  [q]uit"
    )
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
    if not conn.execute(
        "SELECT 1 FROM friction_cards WHERE card_id = ?", (args.card_id,)
    ).fetchone():
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
        cards.append(
            {
                "card_id": row["card_id"],
                "thread_url": row["thread_url"],
                **card,
                "reviewed_at": row["reviewed_at"],
            }
        )
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


def card_tier(card: dict, has_best_answer: bool) -> str:
    """Drill-readiness tier for pending cards. A is highest priority for agent audit."""
    naives = len(card.get("naive_approaches") or [])
    source = card.get("resolution_source")
    if source == "unresolved":
        return "D"
    if naives == 0:
        return "C"
    if source == "best_answer" and has_best_answer and naives >= 1:
        return "A"
    if source in ("best_answer", "thread_consensus") and naives >= 1:
        return "B"
    return "D"


def format_doc_preview(query: str, top_k: int = 3) -> str:
    if not query or not query.strip():
        return "(no official_doc_query on card)"
    cmd = [
        "uv",
        "run",
        "--with",
        "chromadb",
        "python",
        CHROMA_SEARCH_SCRIPT,
        query,
        "--top-k",
        str(top_k),
        "--json",
    ]
    try:
        out = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True, check=True).stdout
        chunks = json.loads(out)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as e:
        return f"(Chroma search failed: {e})"
    if not chunks:
        return "(no chunks retrieved)"
    lines = []
    for c in chunks:
        meta = c.get("metadata") or {}
        lines.append(
            f"- {c.get('cosine_similarity', 0):.2f}  {meta.get('doc_title')} > {meta.get('section_title')}"
        )
    return "\n".join(lines)


def select_audit_rows(
    conn: sqlite3.Connection, tier: str, status: str, limit: int, card_ids: list | None = None
) -> list:
    sql = """
    SELECT fc.*, d.url AS thread_url, d.headline, d.body_text, d.best_answer_text,
           d.has_best_answer, d.raw_payload, d.comments_count
    FROM friction_cards fc
    JOIN discussions d ON d.id = fc.discussion_id
    WHERE fc.status = ?
    """
    params = [status]
    if card_ids:
        placeholders = ",".join("?" * len(card_ids))
        sql += f" AND fc.card_id IN ({placeholders})"
        params.extend(card_ids)
    sql += " ORDER BY d.has_best_answer DESC, d.comments_count DESC, fc.card_id"
    rows = conn.execute(sql, params).fetchall()

    selected = []
    for row in rows:
        card = json.loads(row["card"])
        if not card.get("relevant", True):
            continue
        t = card_tier(card, bool(row["has_best_answer"]))
        if tier != "all" and t != tier:
            continue
        selected.append(row)
        if limit > 0 and len(selected) >= limit:
            break
    return selected


def cmd_audit_prompt(args):
    """Print agent audit packs for staged cards, filtered by drill-readiness tier."""
    conn = connect(args.db_path)
    card_ids = None
    if args.card_id:
        card_ids = [args.card_id]
    rows = select_audit_rows(conn, args.tier, args.status, args.limit, card_ids)
    print(
        f"[Friction Cards] {len(rows)} audit pack(s) selected "
        f"(tier={args.tier}, status={args.status}).",
        file=sys.stderr,
    )
    for row in rows:
        card = json.loads(row["card"])
        replies = thread_replies(row["raw_payload"])
        doc_preview = (
            format_doc_preview(card.get("official_doc_query") or "", args.doc_top_k)
            if args.preview_docs
            else "(skipped; pass --preview-docs to include Chroma hits)"
        )
        print(f"===== card_id: {row['card_id']} =====")
        print(
            AUDIT_PROMPT.format(
                card_id=row["card_id"],
                url=row["thread_url"],
                card_json=json.dumps(card, indent=2, ensure_ascii=False),
                title=truncate(row["headline"], 300),
                question=truncate(row["body_text"]) or "(empty)",
                best_answer=truncate(row["best_answer_text"])
                if row["has_best_answer"]
                else "(none)",
                replies="\n".join(f"{i + 1}. {r}" for i, r in enumerate(replies)) or "(none)",
                doc_preview=doc_preview,
            )
        )
    conn.close()


def cmd_apply_verdicts(args):
    """Apply agent audit verdicts: approve/reject/irrelevant statuses, optional doc-query fixes."""
    conn = connect(args.db_path)
    with open(args.file, encoding="utf-8") as f:
        entries = json.load(f)
    if isinstance(entries, dict):
        entries = [entries]

    known = {r["card_id"]: r for r in conn.execute("SELECT * FROM friction_cards")}
    counts = {v: 0 for v in AUDIT_VERDICTS}
    counts["skip"] = 0

    for entry in entries:
        card_id = entry.get("card_id")
        verdict = (entry.get("verdict") or "").strip().lower()
        if not card_id or card_id not in known:
            print(f"  [SKIP] unknown card_id {card_id!r}")
            counts["skip"] += 1
            continue
        if verdict not in AUDIT_VERDICTS:
            print(f"  [SKIP] {card_id}: invalid verdict {verdict!r}")
            counts["skip"] += 1
            continue

        note = (entry.get("note") or "").strip() or None
        issues = entry.get("issues") or []
        if issues and note:
            note = f"{note} | issues: {'; '.join(issues)}"
        elif issues:
            note = f"issues: {'; '.join(issues)}"

        suggested = (entry.get("suggested_doc_query") or "").strip()

        if args.dry_run:
            print(f"  [DRY] {card_id} → {verdict}" + (f" query={suggested!r}" if suggested else ""))
            counts[verdict] += 1
            continue

        if verdict == "fix":
            if suggested:
                update_doc_query(conn, card_id, suggested)
                set_status(conn, card_id, "pending", note or "doc query updated by audit")
                print(f"  [FIX] {card_id} doc query updated; still pending")
            else:
                if note:
                    set_status(conn, card_id, "pending", note)
                print(
                    f"  [FIX] {card_id} left pending"
                    + (f" ({note})" if note else " (no query suggested)")
                )
            counts["fix"] += 1
            continue

        status = {"approve": "approved", "reject": "rejected", "irrelevant": "irrelevant"}[verdict]
        if suggested and verdict == "approve":
            update_doc_query(conn, card_id, suggested)
        set_status(conn, card_id, status, note)
        print(f"  [{status.upper()}] {card_id}")
        counts[verdict] += 1

    conn.close()
    summary = ", ".join(f"{k}={v}" for k, v in counts.items() if v)
    print(f"\n[Done] {summary}")


def main():
    parser = argparse.ArgumentParser(
        description="Extract, review, and export Friction Cards from Trailhead threads."
    )
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH, help="Path to SQLite database")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser(
        "prompt", help="Print extraction prompts for threads that do not have a card yet"
    )
    p.add_argument("--limit", type=int, default=10, help="Max threads to include (0 for all)")
    p.add_argument(
        "--thread", help="Prompt for a single discussion ID, even if it already has a card"
    )
    p.add_argument("--min-comments", type=int, default=1, help="Skip threads with fewer replies")
    p.add_argument("--force", action="store_true", help="Include threads that already have a card")
    p.set_defaults(func=cmd_prompt)

    p = sub.add_parser(
        "import", help="Import the agent's answers (JSON object or array with discussion_id)"
    )
    p.add_argument("file")
    p.add_argument("--model", default="coding-agent", help="Model name to record for provenance")
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

    p = sub.add_parser(
        "audit-prompt",
        help="Print agent audit packs for staged cards (tier A=best+naive, B=resolved+naive, C=no naive, D=unresolved)",
    )
    p.add_argument(
        "--tier", choices=AUDIT_TIERS, default="A", help="Drill-readiness tier (default A)"
    )
    p.add_argument("--status", choices=STATUSES, default="pending")
    p.add_argument("--limit", type=int, default=20, help="Max packs (0 for all matching)")
    p.add_argument("--card-id", help="Audit a single card id")
    p.add_argument(
        "--preview-docs",
        action="store_true",
        help="Include Chroma top hits for the card's doc query",
    )
    p.add_argument(
        "--doc-top-k", type=int, default=3, help="Chroma hits when --preview-docs is set"
    )
    p.set_defaults(func=cmd_audit_prompt)

    p = sub.add_parser("apply-verdicts", help="Apply agent audit verdicts from a JSON file")
    p.add_argument(
        "file",
        help="JSON object or array of {card_id, verdict, issues?, suggested_doc_query?, note?}",
    )
    p.add_argument("--dry-run", action="store_true", help="Print actions without writing")
    p.set_defaults(func=cmd_apply_verdicts)

    p = sub.add_parser(
        "export", help="Write approved cards to the local catalog used by the drill generator"
    )
    p.add_argument("--out", default=DEFAULT_EXPORT_PATH)
    p.set_defaults(func=cmd_export)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
