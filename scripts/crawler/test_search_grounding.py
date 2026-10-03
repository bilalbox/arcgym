"""Seam tests for hybrid BM25 + dense grounding search (issue #8)."""

from __future__ import annotations

import unittest

from search_grounding import (
    GroundingHit,
    build_bm25_index,
    bm25_search,
    chunk_id_from_export,
    hits_to_json_items,
    hybrid_rerank,
    reciprocal_rank_fusion,
)


def _chunk_id_for(export: dict) -> str:
    return chunk_id_from_export(str(export["document"]), export["metadata"])


def _hit(chunk_id: str, content: str = "", score: float = 0.0) -> GroundingHit:
    return GroundingHit(
        chunk_id=chunk_id,
        content=content or f"body of {chunk_id}",
        metadata={"url": f"https://example.com/{chunk_id}", "section_title": chunk_id},
        score=score,
    )


class ReciprocalRankFusionTests(unittest.TestCase):
    def test_promotes_item_strong_in_both_lists(self) -> None:
        dense = [_hit("a"), _hit("b"), _hit("c")]
        sparse = [_hit("c"), _hit("a"), _hit("d")]
        merged = reciprocal_rank_fusion(dense, sparse, top_k=3)
        self.assertEqual([h.chunk_id for h in merged], ["a", "c", "b"])

    def test_truncates_to_top_k(self) -> None:
        dense = [_hit("a"), _hit("b"), _hit("c"), _hit("d")]
        sparse = [_hit("d"), _hit("c"), _hit("b"), _hit("a")]
        merged = reciprocal_rank_fusion(dense, sparse, top_k=2)
        self.assertEqual(len(merged), 2)


class Bm25IndexTests(unittest.TestCase):
    def test_exact_api_token_outranks_semantic_neighbor(self) -> None:
        chunks = [
            {
                "document": "Overview of query patterns and semantic retrieval strategies for architects.",
                "metadata": {
                    "url": "https://developer.salesforce.com/docs/a",
                    "section_title": "Overview",
                },
            },
            {
                "document": "ConnectApi.CdpQueryInput supports a QueryLimitOf50000 hard cap per request.",
                "metadata": {
                    "url": "https://developer.salesforce.com/docs/b",
                    "section_title": "Query limits",
                },
            },
            {
                "document": "General guidance on choosing APIs for Data Cloud integration projects.",
                "metadata": {
                    "url": "https://developer.salesforce.com/docs/c",
                    "section_title": "Choosing APIs",
                },
            },
        ]
        index = build_bm25_index(chunks)
        hits = bm25_search(index, "QueryLimitOf50000 ConnectApi.CdpQueryInput", top_k=2)
        self.assertGreaterEqual(len(hits), 1)
        self.assertEqual(hits[0].metadata["section_title"], "Query limits")


# Tiny offline corpus: dense buries the governing limit chunk; hybrid surfaces it.
_HYBRID_FIXTURE_CHUNKS = [
    {
        "document": (
            "Data Cloud query APIs support flexible retrieval patterns for architects "
            "comparing semantic and structured access strategies across orgs."
        ),
        "metadata": {
            "url": "https://developer.salesforce.com/docs/data/flex-query.html",
            "section_title": "Flexible query patterns",
            "doc_title": "Flexible query patterns",
        },
    },
    {
        "document": (
            "When tuning Connect API queries, review pagination and batching so large "
            "result sets remain reliable under concurrent load."
        ),
        "metadata": {
            "url": "https://developer.salesforce.com/docs/data/batching.html",
            "section_title": "Pagination and batching",
            "doc_title": "Pagination and batching",
        },
    },
    {
        "document": (
            "ConnectApi.CdpQueryInput enforces QueryLimitOf50000 as the hard maximum "
            "rows returned for a single Query ANSI SQL request."
        ),
        "metadata": {
            "url": "https://developer.salesforce.com/docs/data/query-limits.html",
            "section_title": "QueryLimitOf50000",
            "doc_title": "Query ANSI SQL limits",
        },
    },
]


class HybridWinsOfflineFixtureTests(unittest.TestCase):
    """Dense alone fails; hybrid (dense + BM25 via RRF) surfaces the governing chunk."""

    def setUp(self) -> None:
        self.index = build_bm25_index(_HYBRID_FIXTURE_CHUNKS)
        # Simulated dense ranking: semantic neighbors first; governing chunk buried/missing.
        self.dense_only = [
            GroundingHit(
                chunk_id=_chunk_id_for(export),
                content=str(export["document"]),
                metadata=export["metadata"],
                score=0.91 - i * 0.05,
            )
            for i, export in enumerate(_HYBRID_FIXTURE_CHUNKS[:2])
        ]

    def test_dense_alone_misses_governing_limit_chunk(self) -> None:
        top = [h.metadata["section_title"] for h in self.dense_only[:2]]
        self.assertNotIn("QueryLimitOf50000", top)

    def test_hybrid_surfaces_governing_limit_chunk(self) -> None:
        query = "QueryLimitOf50000 ConnectApi.CdpQueryInput"
        merged = hybrid_rerank(
            dense_hits=self.dense_only,
            bm25_index=self.index,
            query=query,
            top_k=2,
            bm25_candidate_k=5,
        )
        titles = [h.metadata["section_title"] for h in merged]
        self.assertIn("QueryLimitOf50000", titles)


class MetadataFilterTests(unittest.TestCase):
    def test_bm25_respects_pillar_filter(self) -> None:
        chunks = [
            {
                "document": "QueryLimitOf50000 applies in Data_360 ConnectApi queries.",
                "metadata": {
                    "url": "https://developer.salesforce.com/docs/a",
                    "section_title": "limits-a",
                    "pillar": "Data_360",
                },
            },
            {
                "document": "QueryLimitOf50000 mentioned under Trust retention guidance.",
                "metadata": {
                    "url": "https://architect.salesforce.com/docs/b",
                    "section_title": "limits-b",
                    "pillar": "Trust",
                },
            },
        ]
        index = build_bm25_index(chunks)
        hits = bm25_search(index, "QueryLimitOf50000", top_k=5, pillar="Data_360")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0].metadata["pillar"], "Data_360")


class JsonContractTests(unittest.TestCase):
    def test_json_items_keep_content_metadata_cosine_similarity(self) -> None:
        hits = [
            GroundingHit(
                chunk_id="x",
                content="chunk body",
                metadata={"url": "https://architect.salesforce.com/x", "section_title": "X"},
                score=0.87,
            )
        ]
        items = hits_to_json_items(hits)
        self.assertTrue(
            {"content", "metadata", "cosine_similarity"}.issubset(items[0].keys())
        )
        self.assertEqual(items[0]["content"], "chunk body")
        self.assertEqual(items[0]["cosine_similarity"], 0.87)

    def test_hybrid_json_keeps_dense_cosine_and_adds_rrf_score(self) -> None:
        dense = [
            GroundingHit(
                chunk_id="limit",
                content="QueryLimitOf50000",
                metadata={"section_title": "limits"},
                score=0.4,
            )
        ]
        sparse = [
            GroundingHit(
                chunk_id="limit",
                content="QueryLimitOf50000",
                metadata={"section_title": "limits"},
                score=12.0,
            )
        ]
        merged = reciprocal_rank_fusion(dense, sparse, top_k=1)
        items = hits_to_json_items(merged)
        self.assertEqual(items[0]["cosine_similarity"], 0.4)
        self.assertIn("rrf_score", items[0])
        self.assertGreater(items[0]["rrf_score"], 0)


if __name__ == "__main__":
    unittest.main()
