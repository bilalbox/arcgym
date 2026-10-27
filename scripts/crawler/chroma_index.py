"""Shared non-destructive Chroma upsert for Well-Architected Grounding corpora."""

from __future__ import annotations

import contextlib
import hashlib
import os
import sys

import chromadb

COLLECTION_NAME = "salesforce_architect_docs"


def stable_chunk_id(prefix: str, url: str, section_title: str) -> str:
    digest = hashlib.sha256(f"{url}|{section_title}".encode()).hexdigest()[:16]
    return f"{prefix}_{digest}"


def assign_stable_ids(chunks: list[dict], prefix: str) -> None:
    """Assign stable ids; disambiguate rare url+section collisions with a suffix."""
    seen: dict[str, int] = {}
    for chunk in chunks:
        meta = chunk.get("metadata") or {}
        base = stable_chunk_id(
            prefix,
            str(meta.get("url", "")),
            str(meta.get("section_title", "")),
        )
        n = seen.get(base, 0)
        seen[base] = n + 1
        chunk["id"] = base if n == 0 else f"{base}_{n}"


def upsert_chunks(
    chroma_dir: str,
    chunks: list[dict],
    *,
    source_domain: str,
) -> int:
    """Replace one source_domain's vectors via delete-where + upsert (siblings untouched)."""
    os.makedirs(chroma_dir, exist_ok=True)
    client = chromadb.PersistentClient(path=chroma_dir)
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine", "source": "well-architected-grounding"},
    )

    # Drop prior vectors for this domain so stable-id migrations don't leave orphans,
    # without wiping sibling corpora (e.g. developer vs architect).
    with contextlib.suppress(Exception):
        collection.delete(where={"source_domain": source_domain})

    batch_size = 100
    total = len(chunks)
    for i in range(0, total, batch_size):
        batch = chunks[i : i + batch_size]
        metadatas = []
        for c in batch:
            meta = dict(c.get("metadata") or {})
            meta["source_domain"] = source_domain
            # Chroma metadata values must be str|int|float|bool
            metadatas.append(
                {
                    k: (v if isinstance(v, (str, int, float, bool)) else str(v))
                    for k, v in meta.items()
                }
            )
        collection.upsert(
            ids=[c["id"] for c in batch],
            documents=[c["document"] for c in batch],
            metadatas=metadatas,
        )
        sys.stdout.write(f"\r  Upserted {min(i + batch_size, total)}/{total} chunks")
        sys.stdout.flush()
    print()
    return collection.count()
