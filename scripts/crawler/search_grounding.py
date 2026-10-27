"""
Hybrid BM25 + dense merge helpers for Well-Architected Grounding search.

Sparse index is built from the same grounding chunk exports that feed the
Citation Manifest. Dense rankings come from Chroma; merge uses Reciprocal Rank
Fusion. See issue #8 / ADR 0003 Wave D.
"""

from __future__ import annotations

import math
import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

_TOKEN_RE = re.compile(r"[A-Za-z0-9_./]+")


@dataclass(frozen=True)
class GroundingHit:
    chunk_id: str
    content: str
    metadata: Mapping[str, Any]
    score: float = 0.0
    rrf_score: float | None = None


@dataclass
class Bm25Index:
    chunks: list[GroundingHit]
    tokenized: list[list[str]]
    doc_freq: dict[str, int]
    avgdl: float
    k1: float = 1.5
    b: float = 0.75


def chunk_id_from_export(_document: str, metadata: Mapping[str, Any]) -> str:
    """Stable join key for dense/sparse RRF (url + section; matches Citation Manifest leaves)."""
    url = str(metadata.get("url") or "")
    section = str(metadata.get("section_title") or "")
    return f"{url}::{section}"


def metadata_matches(
    metadata: Mapping[str, Any],
    *,
    pillar: str | None = None,
    category: str | None = None,
) -> bool:
    if pillar is not None and metadata.get("pillar") != pillar:
        return False
    return category is None or metadata.get("category") == category


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text)]


def build_bm25_index(chunk_exports: Sequence[Mapping[str, Any]]) -> Bm25Index:
    chunks: list[GroundingHit] = []
    tokenized: list[list[str]] = []
    doc_freq: dict[str, int] = {}

    for export in chunk_exports:
        document = str(export.get("document") or "")
        metadata = export.get("metadata") or {}
        if not isinstance(metadata, Mapping):
            metadata = {}
        hit = GroundingHit(
            chunk_id=chunk_id_from_export(document, metadata),
            content=document,
            metadata=dict(metadata),
        )
        tokens = tokenize(document)
        chunks.append(hit)
        tokenized.append(tokens)
        for term in set(tokens):
            doc_freq[term] = doc_freq.get(term, 0) + 1

    total_len = sum(len(toks) for toks in tokenized)
    avgdl = (total_len / len(tokenized)) if tokenized else 0.0
    return Bm25Index(chunks=chunks, tokenized=tokenized, doc_freq=doc_freq, avgdl=avgdl)


def _idf(term: str, index: Bm25Index) -> float:
    n = len(index.chunks)
    df = index.doc_freq.get(term, 0)
    # Lucene-style IDF; floor at epsilon so unknown terms don't dominate
    return math.log(1 + (n - df + 0.5) / (df + 0.5))


def bm25_search(
    index: Bm25Index,
    query: str,
    top_k: int,
    *,
    pillar: str | None = None,
    category: str | None = None,
) -> list[GroundingHit]:
    if top_k <= 0 or not index.chunks:
        return []
    q_tokens = tokenize(query)
    if not q_tokens:
        return []

    scores: list[tuple[float, int]] = []
    for i, doc_tokens in enumerate(index.tokenized):
        if not doc_tokens:
            continue
        if not metadata_matches(index.chunks[i].metadata, pillar=pillar, category=category):
            continue
        tf: dict[str, int] = {}
        for t in doc_tokens:
            tf[t] = tf.get(t, 0) + 1
        dl = len(doc_tokens)
        score = 0.0
        for term in q_tokens:
            freq = tf.get(term, 0)
            if freq == 0:
                continue
            denom = freq + index.k1 * (1 - index.b + index.b * dl / index.avgdl)
            score += _idf(term, index) * (freq * (index.k1 + 1)) / denom
        if score > 0:
            scores.append((score, i))

    scores.sort(key=lambda x: (-x[0], x[1]))
    hits: list[GroundingHit] = []
    for score, i in scores[:top_k]:
        base = index.chunks[i]
        hits.append(
            GroundingHit(
                chunk_id=base.chunk_id,
                content=base.content,
                metadata=base.metadata,
                score=score,
            )
        )
    return hits


def reciprocal_rank_fusion(
    dense_ranks: Sequence[GroundingHit],
    bm25_ranks: Sequence[GroundingHit],
    top_k: int,
    rrf_k: int = 60,
) -> list[GroundingHit]:
    """Merge two ranked lists with Reciprocal Rank Fusion; truncate to top_k."""
    if top_k <= 0:
        return []

    scores: dict[str, float] = {}
    by_id: dict[str, GroundingHit] = {}
    dense_sim: dict[str, float] = {}

    for rank, hit in enumerate(dense_ranks, start=1):
        scores[hit.chunk_id] = scores.get(hit.chunk_id, 0.0) + 1.0 / (rrf_k + rank)
        by_id[hit.chunk_id] = hit
        dense_sim[hit.chunk_id] = hit.score

    for rank, hit in enumerate(bm25_ranks, start=1):
        scores[hit.chunk_id] = scores.get(hit.chunk_id, 0.0) + 1.0 / (rrf_k + rank)
        # Prefer dense hit payload when both lists contain the id (keeps cosine_similarity)
        by_id.setdefault(hit.chunk_id, hit)

    ordered = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    merged: list[GroundingHit] = []
    for chunk_id, rrf_score in ordered[:top_k]:
        base = by_id[chunk_id]
        merged.append(
            GroundingHit(
                chunk_id=base.chunk_id,
                content=base.content,
                metadata=base.metadata,
                # cosine_similarity contract: dense score only (0.0 if sparse-only)
                score=dense_sim.get(chunk_id, 0.0),
                rrf_score=rrf_score,
            )
        )
    return merged


def hybrid_rerank(
    dense_hits: Sequence[GroundingHit],
    bm25_index: Bm25Index,
    query: str,
    top_k: int,
    bm25_candidate_k: int | None = None,
    *,
    pillar: str | None = None,
    category: str | None = None,
) -> list[GroundingHit]:
    """Run BM25 over the sparse index and merge with dense ranks via RRF."""
    sparse_k = bm25_candidate_k if bm25_candidate_k is not None else max(top_k * 4, top_k)
    bm25_hits = bm25_search(
        bm25_index,
        query,
        top_k=sparse_k,
        pillar=pillar,
        category=category,
    )
    return reciprocal_rank_fusion(dense_hits, bm25_hits, top_k=top_k)


def load_chunk_exports(paths: Iterable[str]) -> list[dict[str, Any]]:
    import json
    import os

    chunks: list[dict[str, Any]] = []
    for path in paths:
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            chunks.extend(data)
    return chunks


def hits_to_json_items(hits: Sequence[GroundingHit]) -> list[dict[str, Any]]:
    """Stable --json contract: content, metadata, cosine_similarity (+ optional rrf_score)."""
    items: list[dict[str, Any]] = []
    for h in hits:
        item: dict[str, Any] = {
            "content": h.content,
            "metadata": dict(h.metadata),
            "cosine_similarity": float(h.score),
        }
        if h.rrf_score is not None:
            item["rrf_score"] = float(h.rrf_score)
        items.append(item)
    return items
