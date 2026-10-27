# Architecture Decision Records (ADRs)

Canonical architectural decisions for ArcGym. Consult relevant ADRs before modifying domain core, persistence, formats, or verification pipelines.

## ADR Index

| ADR | Title | Status | Scope / Topic |
|---|---|---|---|
| [0001](0001-rapid-fire-sole-format.md) | Single Rapid Fire Drill Architecture | Superseded by 0007 | Historic: Rapid Fire as sole daily-streak format. |
| [0002](0002-case-file-format.md) | Case File alongside Rapid Fire | Accepted (streak clause superseded by 0007) | Multi-step scenario evaluation with Brief and Probe Budget stations. |
| [0003](0003-well-architected-grounding-corpus.md) | Grounding Corpus & Well-Architected Hierarchy | Accepted | Salesforce Well-Architected Framework and Trailblazer community grounding. |
| [0004](0004-troubleshooting-format.md) | Troubleshooting Format (Incident Drills) | Accepted (streak clause superseded by 0007) | Scarce-probe incident diagnosis with CLEF Workers AI root-cause grading. |
| [0005](0005-passwordless-learner-auth-and-d1-sync.md) | Passwordless Learner Auth & D1 Persistence | Accepted | Google/GitHub OAuth, pseudonymous zero-PII IDs, D1 telemetry & feedback sync. |
| [0006](0006-deterministic-quality-and-maintainability-gates.md) | Deterministic Quality & Maintainability Gates | Accepted | Quality-kit gates (`pnpm gate` / `gate:fast`): Biome, rev-dep, complexity ratchet, `tsc -b`, Python crawler lint, Vitest. |
| [0007](0007-retire-rapid-fire.md) | Retire Rapid Fire | Accepted | Case File + Troubleshooting are the only formats; either earns the Practice Streak. |
| [0008](0008-incident-fix-and-graded-first-call.md) | Incident Fix (First Call Shelved) | Accepted | Incidents end with a cause-revealed MCQ Fix; First Call is shelved. |
| [0009](0009-mermaid-pele-diagram-pipeline.md) | Mermaid Architecture Diagrams with Obsidian Pele | Accepted | Self-contained Mermaid topology diagrams rendered via Obsidian Pele; retired `@arcgym/diagrams`. |

## Data Architecture & Storage Separation

ArcGym maintains a strict separation between static drill content and dynamic telemetry:

| Layer | Storage Technology | Access Pattern | Content |
|---|---|---|---|
| **Drill Catalog** | Immutable JSON (`canonicalDrills.json`) + Cloudflare KV (`drill:<id>`, `drill:today`) | Edge cache, 0ms load, offline capable | Authored drill definitions, scenarios, options, diagrams. |
| **Learner Telemetry** | Cloudflare D1 (`DB` binding, `learner_progress` table) | HTTP API (`/api/learner/sync`) | Pseudonymous IDs, streak dates, completed drill IDs, points. |
| **Drill Feedback** | Cloudflare D1 (`DB` binding, `drill_rating_stats` & `drill_feedback`) | HTTP API (`/api/drills/:id/feedback`, `/api/admin/feedback`) | Aggregated thumbs up/down, tag counts, deduped feedback submissions. |
| **Historic Snapshots** | Local JSON (`data/feedback.json`) | Admin CLI (`pnpm feedback:report`, `pnpm feedback:migrate`) | Offline feedback analysis and D1 backfill seed. |

## Common Workflows

* **Database Migrations**: Apply with `pnpm db:migrate:local` (local dev) or `pnpm db:migrate:remote` (production).
* **Feedback Operations**: Inspect with `pnpm feedback:report`, pull remote data with `pnpm feedback:pull`, or backfill with `pnpm feedback:migrate --remote`.
* **Quality Verification**: Execute `pnpm gate:fast` before concluding tasks (`pnpm gate` includes tests).
