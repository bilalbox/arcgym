#!/usr/bin/env python3
"""
ArcGym ChromaDB Architectural Search Tool
Queries the persistent ChromaDB collection of crawled Salesforce Architect documentation.

Dense cosine search is the default. Pass --hybrid to merge dense ranks with BM25 over
the same grounding chunk exports (Reciprocal Rank Fusion). See issue #8.
"""

import argparse
import os
import sys

import chromadb

from search_grounding import (
    GroundingHit,
    build_bm25_index,
    chunk_id_from_export,
    hits_to_json_items,
    hybrid_rerank,
    load_chunk_exports,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
CHROMA_DIR = os.path.join(ROOT_DIR, "data/chroma")
COLLECTION_NAME = "salesforce_architect_docs"
GROUNDING_CHUNK_EXPORTS = [
    os.path.join(ROOT_DIR, "data/architect_chunks.json"),
    os.path.join(ROOT_DIR, "data/developer_chunks.json"),
    os.path.join(ROOT_DIR, "data/help_chunks.json"),
]


def dense_hits_from_chroma(results: dict) -> list[GroundingHit]:
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    distances = results["distances"][0]
    hits: list[GroundingHit] = []
    for doc, meta, dist in zip(docs, metas, distances, strict=True):
        sim = max(0.0, 1.0 - dist)
        metadata = meta or {}
        hits.append(
            GroundingHit(
                chunk_id=chunk_id_from_export(doc, metadata),
                content=doc,
                metadata=metadata,
                score=sim,
            )
        )
    return hits


def main():
    parser = argparse.ArgumentParser(
        description="Query ArcGym ChromaDB for Salesforce Architect guidance"
    )
    parser.add_argument(
        "query",
        type=str,
        help="Search query (e.g., 'CDC vs Platform Events', 'Zero Copy Snowflake', 'Atlas reasoning')",
    )
    parser.add_argument(
        "--top-k", type=int, default=5, help="Number of results to return (default: 5)"
    )
    parser.add_argument(
        "--pillar",
        type=str,
        default=None,
        help="Filter by pillar (e.g. Trust, Reliability, Agentforce, Data_360)",
    )
    parser.add_argument(
        "--category",
        type=str,
        default=None,
        help="Filter by category (e.g. decision-guides, well-architected)",
    )
    parser.add_argument(
        "--hybrid",
        action="store_true",
        help="Merge dense Chroma ranks with BM25 over grounding chunk exports via RRF (opt-in)",
    )
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")

    args = parser.parse_args()

    if not os.path.exists(CHROMA_DIR):
        print(f"Error: Chroma directory not found at {CHROMA_DIR}. Run the crawler first:")
        print(
            "  uv run --with chromadb --with curl_cffi --with beautifulsoup4 --with lxml python scripts/crawler/crawl_architect.py"
        )
        sys.exit(1)

    client = chromadb.PersistentClient(path=CHROMA_DIR)
    try:
        collection = client.get_collection(COLLECTION_NAME)
    except Exception as e:
        print(f"Error: Collection '{COLLECTION_NAME}' not found in Chroma: {e}")
        sys.exit(1)

    where_filter = {}
    if args.pillar:
        where_filter["pillar"] = args.pillar
    if args.category:
        where_filter["category"] = args.category

    # Pull a wider dense pool when hybrid so RRF can resurface sparse-only winners.
    dense_n = max(args.top_k * 4, args.top_k) if args.hybrid else args.top_k
    query_kwargs = {
        "query_texts": [args.query],
        "n_results": dense_n,
    }
    if where_filter:
        query_kwargs["where"] = where_filter

    results = collection.query(**query_kwargs)
    dense_hits = dense_hits_from_chroma(results)

    if args.hybrid:
        exports = load_chunk_exports(GROUNDING_CHUNK_EXPORTS)
        if not exports:
            print(
                "Error: --hybrid requires grounding chunk exports "
                "(data/architect_chunks.json, data/developer_chunks.json, data/help_chunks.json).",
                file=sys.stderr,
            )
            sys.exit(1)
        bm25_index = build_bm25_index(exports)
        final_hits = hybrid_rerank(
            dense_hits=dense_hits,
            bm25_index=bm25_index,
            query=args.query,
            top_k=args.top_k,
            pillar=args.pillar,
            category=args.category,
        )
    else:
        final_hits = dense_hits[: args.top_k]

    if args.json:
        import json

        print(json.dumps(hits_to_json_items(final_hits), indent=2))
        return

    mode = "hybrid (dense + BM25 RRF)" if args.hybrid else "dense"
    print("\n===========================================================")
    print(f'  ArcGym Chroma Search: "{args.query}"')
    print(f"  Mode: {mode}")
    print(f"  Total Indexed Chunks in Collection: {collection.count()}")
    print("===========================================================\n")

    if not final_hits:
        print("No matching architectural documentation found.")
        return

    for i, hit in enumerate(final_hits):
        meta = hit.metadata
        sim_score = hit.score
        print(f"[{i + 1}] {meta.get('doc_title')} > {meta.get('section_title')}")
        print(
            f"    • Pillar: {meta.get('pillar')} | Category: {meta.get('category')} | Cosine Match: {sim_score:.2%}"
        )
        print(f"    • Citation URL: {meta.get('url')}")
        print("    -------------------------------------------------------")
        lines = [line.strip() for line in hit.content.split("\n") if line.strip()]
        for line in lines[1:7]:
            print(f"    {line}")
        if len(lines) > 7:
            print("    ...")
        print("\n")


if __name__ == "__main__":
    main()
