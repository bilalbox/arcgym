#!/usr/bin/env python3
"""
ArcGym ChromaDB Architectural Search Tool
Queries the persistent ChromaDB collection of crawled Salesforce Architect documentation.
"""

import os
import sys
import argparse
import chromadb

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
CHROMA_DIR = os.path.join(ROOT_DIR, "data/chroma")
COLLECTION_NAME = "salesforce_architect_docs"

def main():
    parser = argparse.ArgumentParser(description="Query ArcGym ChromaDB for Salesforce Architect guidance")
    parser.add_argument("query", type=str, help="Search query (e.g., 'CDC vs Platform Events', 'Zero Copy Snowflake', 'Atlas reasoning')")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to return (default: 5)")
    parser.add_argument("--pillar", type=str, default=None, help="Filter by pillar (e.g. Trust, Reliability, Agentforce, Data_360)")
    parser.add_argument("--category", type=str, default=None, help="Filter by category (e.g. decision-guides, well-architected)")
    
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")
    
    args = parser.parse_args()
    
    if not os.path.exists(CHROMA_DIR):
        print(f"Error: Chroma directory not found at {CHROMA_DIR}. Run the crawler first:")
        print("  uv run --with chromadb --with curl_cffi --with beautifulsoup4 --with lxml python scripts/crawler/crawl_architect.py")
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
        
    query_kwargs = {
        "query_texts": [args.query],
        "n_results": args.top_k,
    }
    if where_filter:
        query_kwargs["where"] = where_filter
        
    results = collection.query(**query_kwargs)
    
    if args.json:
        import json
        output_items = []
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        distances = results["distances"][0]
        for doc, meta, dist in zip(docs, metas, distances):
            output_items.append({
                "content": doc,
                "metadata": meta,
                "cosine_similarity": max(0.0, 1.0 - dist)
            })
        print(json.dumps(output_items, indent=2))
        return

    print("\n===========================================================")
    print(f"  ArcGym Chroma Search: \"{args.query}\"")
    print(f"  Total Indexed Chunks in Collection: {collection.count()}")
    print("===========================================================\n")
    
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    distances = results["distances"][0]
    
    if not docs:
        print("No matching architectural documentation found.")
        return
        
    for i, (doc, meta, dist) in enumerate(zip(docs, metas, distances)):
        sim_score = max(0.0, 1.0 - dist)
        print(f"[{i + 1}] {meta.get('doc_title')} > {meta.get('section_title')}")
        print(f"    • Pillar: {meta.get('pillar')} | Category: {meta.get('category')} | Cosine Match: {sim_score:.2%}")
        print(f"    • Citation URL: {meta.get('url')}")
        print("    -------------------------------------------------------")
        # Print first few lines of content
        lines = [line.strip() for line in doc.split("\n") if line.strip()]
        for line in lines[1:7]:
            print(f"    {line}")
        if len(lines) > 7:
            print("    ...")
        print("\n")

if __name__ == "__main__":
    main()
