# Well-Architected Grounding hosts, Citation Manifest, and soft ingest

## Status

Accepted (issue #4)

## Context

Drill authors need correct options grounded in precise official guidance for Data 360 / Data Cloud (API limits, Connect API, query semantics, SDKs). The crawled corpus and Citation Manifest were architect.salesforce.com-only, while `build-drills` rejected any correct-option URL that was not an exact crawled architect chunk URL. Host allowlisting also included Trailhead, which is learning content rather than Well-Architected Grounding.

Separately, ingest hard-rolled back failed drafts (delete or restore), discarding Case File work and leaving no durable findings handoff for repair.

## Decision

1. **Grounding hosts** for correct-option citations: `architect.salesforce.com`, `developer.salesforce.com`, and `help.salesforce.com` only. Trailhead is removed from the citation host allowlist. Engineering blogs, practitioner blogs, and Friction Cards never ground correct options.
2. **Citation Manifest**: exact crawled URL membership required for correct options (host allowlist alone is insufficient). Materialized at build time by unioning `metadata.url` from all grounding chunk exports (`data/architect_chunks.json`, `data/developer_chunks.json`, …). No separate hand-maintained manifest file.
3. **Developer corpus**: curated Data 360 guides discovered via `llms-data-cloud.txt` path prefixes; fetch `.md` siblings; store canonical `.html` URLs. DMO Mapping keeps non-DLO pages under that guide (Standard/SSOT object leaves, mapping pages, and conceptual object pages; pure DLO noise dropped). Integrations keeps first-party / platform connectors (Ingestion API, S3/GCS/Azure storage, MuleSoft, Web/Mobile SDK); third-party vendor catalog leaves remain deferred. See the filter table in `scripts/crawler/crawl_developer.py`.
4. **Chroma**: one shared collection; metadata includes `source_domain`; reindex replaces one domain via delete-where + upsert so sibling corpora are not wiped.
5. **Soft ingest**: on wording or build validation failure, keep the draft Drill, write `content/drills/<id>.findings.json`, exit non-zero; on success, delete any prior findings sidecar.

## Consequences

- Authors may cite crawled developer.salesforce.com pages for Data 360 Stations; uncrawled allowlisted URLs still fail build.
- Architect reindex no longer deletes the whole collection (developer vectors survive).
- Failed ingest is recoverable: repair the kept JSON using the findings sidecar, then rerun ingest. The `reviewing-drills` skill (issue #6) loads that sidecar, applies surgical fixes, and re-ingests with `--force` (max 3 attempts; Citation Manifest / missing-grounding cases hand back to `generating-drills` with sharper `--query` values). No auto-publish.
- Help corpus (issue #5): curated Data 360 / architecture-adjacent `help.salesforce.com` articles are crawled via Aura into `data/help_chunks.json` and unioned into the Citation Manifest; full Help catalog dump remains out of scope.
- DMO Mapping / Integrations phased widen (issue #7): Standard/SSOT object and mapping leaves plus first-party connector pages enter the developer chunk export and Citation Manifest; pure DLO noise and third-party vendor catalog leaves stay out (filter table in `crawl_developer.py`).
- Explicitly deferred (later waves): engineering/practitioner blog ingestion; remaining third-party Integrations vendor leaves / full ~3600-leaf dump; hybrid BM25; Architect Linter adversarial CTA red-team tier; progressive authoring automation; LLM query auto-decomposition.
