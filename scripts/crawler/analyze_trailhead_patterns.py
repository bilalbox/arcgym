#!/usr/bin/env python3
"""
Trailhead Community Discussion Pattern Analyzer
Analyzes discussions in SQLite, detects recurring architectural friction points,
identifies common naive antipatterns (for drill distractors) and vetted solutions,
and outputs a curated catalog in data/curated_community_patterns.json (local only, git-ignored).
"""

import os
import re
import sys
import json
import sqlite3
import argparse
from datetime import datetime, timezone
from collections import defaultdict

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(ROOT_DIR, "data")
DEFAULT_DB_PATH = os.path.join(DATA_DIR, "trailhead.db")
OUTPUT_PATH = os.path.join(DATA_DIR, "curated_community_patterns.json")

# Architectural Taxonomy & Topic Signatures for Data 360 / Agentforce / Core Platform
TAXONOMY = {
    "Identity_Resolution_Rules": {
        "pillar": "Data_360",
        "well_architected_domain": "Identity Resolution & Unification",
        "keywords": [
            "identity resolution", "exact match", "fuzzy match", "reconciliation rule",
            "unification", "clientid", "individual", "contact point", "unified profile", "dedup"
        ],
        "default_tradeoff": "Trust & Data Integrity vs. Computational Latency and Over-consolidation"
    },
    "Data_Activation_CrossCloud": {
        "pillar": "Data_360",
        "well_architected_domain": "Audience Segmentation & Activation",
        "keywords": [
            "activation", "activate segment", "account engagement", "marketing cloud",
            "fan-out", "activation target", "contact point activation", "audience sync"
        ],
        "default_tradeoff": "Timeliness & Egress Throughput vs. Downstream Consumer Fan-out Limits"
    },
    "Zero_Copy_Data_Federation": {
        "pillar": "Data_360",
        "well_architected_domain": "Zero Copy & External Lakehouse Integration",
        "keywords": [
            "zero copy", "snowflake", "databricks", "bigquery", "fabric", "data share",
            "related list", "virtualization", "external lakehouse"
        ],
        "default_tradeoff": "Real-time Access & Zero Storage Egress vs. UI Query Latency & Governor Limits"
    },
    "Data_Model_Mapping_DLO_DMO": {
        "pillar": "Data_360",
        "well_architected_domain": "Data Lake Object (DLO) to Data Model Object (DMO) Modeling",
        "keywords": [
            "data kit", "dlo", "dmo", "mapping", "data stream", "sales data kit",
            "schema", "field mapping", "custom dmo", "bridge object", "sspc"
        ],
        "default_tradeoff": "Packaged Standard Acceleration vs. Schema Brittleness and Customization Lock-in"
    },
    "Large_Data_Volumes_Hierarchy_Aggregations": {
        "pillar": "Reliability",
        "well_architected_domain": "Large Data Volumes & Asynchronous Aggregations",
        "keywords": [
            "hierarchy", "bulk email", "transcript analysis", "account hierarchy",
            "rollup", "roll-up", "high volume", "asynchronous", "staleness", "ultimate parent"
        ],
        "default_tradeoff": "Pre-computed Materialization vs. Real-time Traversal & Hierarchy Reparenting Drift"
    },
    "Data_Stream_Diagnostics_Governance": {
        "pillar": "Operational_Excellence",
        "well_architected_domain": "Ingestion Monitoring, Diagnostics & Governance",
        "keywords": [
            "refresh history", "error message", "data stream error", "backup",
            "diagnostics", "ingestion failure", "sandbox", "audit"
        ],
        "default_tradeoff": "Operational Observability vs. Ingestion Overhead and Diagnostic Latency"
    }
}

def clean_html(text: str) -> str:
    if not text:
        return ""
    # Remove HTML entities and tags
    text = re.sub(r'<[^>]+>', ' ', text)
    text = text.replace("&quot;", '"').replace("&amp;", '&').replace("&#39;", "'").replace("&gt;", ">").replace("&lt;", "<").replace("\u00a0", " ")
    return " ".join(text.split()).strip()

def extract_antipattern_signals(body_text: str, comments: list) -> list:
    """Extract common misconceptions or naive attempts surfaced in the question or comment threads."""
    antipatterns = []
    
    # Patterns indicating naive proposals or pitfalls
    pitfall_triggers = [
        (r'query(?:ing)?\s+the\s+entire\s+[^\.]+\s+synchronously', 'Attempting synchronous live queries across multi-million row tables instead of async pre-aggregation.'),
        (r're-?writing\s+every\s+week\s+on\s+millions\s+of\s+records', 'Full weekly batch re-computation over unchanged records causing severe processing costs.'),
        (r'resolving\s+it\s+at\s+query\s+time', 'Resolving complex recursive hierarchies at query time rather than materializing hierarchy paths at ingest.'),
        (r'altering\s+existing\s+mappings', 'Deploying generic data kits without validating collision boundaries with bespoke field mappings.'),
        (r'direct\s+sync\s+without\s+bridge', 'Failing to model bridge fan-out DMOs when activating multiple contact points per unified profile.')
    ]

    combined = body_text + " " + " ".join(comments)
    for regex, desc in pitfall_triggers:
        if re.search(regex, combined, re.IGNORECASE):
            antipatterns.append(desc)

    return list(set(antipatterns))

def analyze_patterns(db_path: str = DEFAULT_DB_PATH, out_path: str = OUTPUT_PATH):
    if not os.path.exists(db_path):
        print(f"[ERROR] Database {db_path} does not exist. Run crawl_trailhead.py first.")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("""
    SELECT id, headline, body_text, has_best_answer, best_answer_text, likes_count, comments_count, url, raw_payload, created_at
    FROM discussions
    ORDER BY comments_count DESC, likes_count DESC
    """)
    rows = cur.fetchall()

    print(f"[Trailhead Analyzer] Loaded {len(rows)} discussions from SQLite.")

    cluster_matches = defaultdict(list)
    unmatched = []

    for row in rows:
        d_id, headline, body_text, has_best, best_answer, likes, comments, url, raw_payload_str, created_at = row
        headline_clean = clean_html(headline or "")
        body_clean = clean_html(body_text or "")
        best_clean = clean_html(best_answer or "")
        full_text = f"{headline_clean} {body_clean}".lower()

        # Parse comments from raw payload
        raw_payload = json.loads(raw_payload_str)
        raw_comments = []
        try:
            edge_items = raw_payload.get("capabilities", {}).get("comments", {}).get("items", {}).get("edges", [])
            for c_edge in edge_items:
                c_node = c_edge.get("node", {})
                c_body = clean_html(c_node.get("body", {}).get("text", ""))
                if c_body:
                    raw_comments.append(c_body)
        except Exception:
            pass

        matched_key = None
        for key, conf in TAXONOMY.items():
            for kw in conf["keywords"]:
                if kw in full_text:
                    matched_key = key
                    break
            if matched_key:
                break

        disc_summary = {
            "id": d_id,
            "headline": headline_clean,
            "url": url,
            "created_at": created_at,
            "likes_count": likes,
            "comments_count": comments,
            "has_best_answer": bool(has_best),
            "question_body_snippet": body_clean[:350] + ("..." if len(body_clean) > 350 else ""),
            "best_answer_snippet": best_clean[:400] + ("..." if len(best_clean) > 400 else "") if has_best else None,
            "antipattern_cues": extract_antipattern_signals(body_clean, raw_comments)
        }

        if matched_key:
            cluster_matches[matched_key].append(disc_summary)
        else:
            unmatched.append(disc_summary)

    # Build Curated Patterns Catalog
    curated_patterns = []

    for cluster_key, conf in TAXONOMY.items():
        discussions = cluster_matches[cluster_key]
        if not discussions:
            continue

        total_questions = len(discussions)
        total_replies = sum(d["comments_count"] for d in discussions)
        solved_count = sum(1 for d in discussions if d["has_best_answer"])

        # Collect unique antipatterns
        all_antipatterns = []
        for d in discussions:
            all_antipatterns.extend(d["antipattern_cues"])
        if not all_antipatterns:
            all_antipatterns.append("Applying standard operational configurations without evaluating architectural concurrency and schema limits.")

        # Top exemplary discussions for grounding
        exemplary = sorted(discussions, key=lambda x: (x["has_best_answer"], x["comments_count"]), reverse=True)[:3]

        pattern = {
            "pattern_id": f"TCP-{cluster_key}",
            "topic_cluster": cluster_key.replace("_", " "),
            "pillar": conf["pillar"],
            "well_architected_domain": conf["well_architected_domain"],
            "recurrence_metrics": {
                "question_frequency": total_questions,
                "total_replies": total_replies,
                "solved_count": solved_count,
                "community_engagement_score": total_replies + (solved_count * 2)
            },
            "architectural_tension": conf["default_tradeoff"],
            "sample_scenario_prompt": exemplary[0]["headline"] if exemplary else "",
            "antipattern_distractors": list(set(all_antipatterns)),
            "grounding_discussions": exemplary
        }
        curated_patterns.append(pattern)

    # Sort patterns by engagement score
    curated_patterns.sort(key=lambda p: p["recurrence_metrics"]["community_engagement_score"], reverse=True)

    catalog = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "Trailhead Community (* Data 360 * Group 0F94S000000kQixSAE)",
            "total_discussions_analyzed": len(rows),
            "matched_discussions": len(rows) - len(unmatched),
            "unmatched_discussions": len(unmatched),
            "cluster_count": len(curated_patterns)
        },
        "curated_patterns": curated_patterns
    }

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)

    print(f"\n[Trailhead Analyzer] Successfully wrote curated patterns to: {out_path}")
    print(f"  - Total Patterns Identified: {len(curated_patterns)}")
    for p in curated_patterns:
        m = p["recurrence_metrics"]
        print(f"    * {p['topic_cluster']}: {m['question_frequency']} questions ({m['solved_count']} solved), {m['total_replies']} replies")

    conn.close()

def main():
    parser = argparse.ArgumentParser(description="Analyze Trailhead discussions and export curated problem patterns.")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH, help="Path to SQLite database")
    parser.add_argument("--out-path", default=OUTPUT_PATH, help="Output path for curated patterns JSON")
    args = parser.parse_args()

    analyze_patterns(db_path=args.db_path, out_path=args.out_path)

if __name__ == "__main__":
    main()
