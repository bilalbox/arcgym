# ArcGym

Daily architectural judgment practice for Salesforce Architects — Core Platform, Data 360, and Agentic AI — grounded in the [Salesforce Well-Architected](https://architect.salesforce.com) framework.

Progress and confidence calibration live in the browser. There is no Salesforce org runtime dependency.

> **Note:** ArcGym is heavily inspired by [Analyst Gym](https://analystgym.com/).

## Stack

| Layer | Choice |
| --- | --- |
| App | React 19 + Vite 8 (`apps/arcgym-web`) |
| Design | Miro-inspired system (see [`design.md`](./design.md)) via Tailwind CSS 4 + Radix primitives |
| Domain | `@arcgym/drill-core` — scoring, calibration, recommendation types |
| Hosting & Analytics | Cloudflare Pages + Pages Functions + KV (Wrangler 4) + Cloudflare Web Analytics (cookieless) |
| Content | JSON drills under `content/drills/`, compiled by `scripts/build-drills.ts` |

## Monorepo layout

```
apps/arcgym-web/     Cloudflare Pages React app (UI + Functions + /privacy route)
packages/drill-core/ Pure TypeScript domain library (scoring, calibration, recommendations)
content/drills/      Authoritative drill JSON (38 drills across 6 architectural domains)
scripts/             Drill build, KV seed, RAG crawler, Friction Card tooling, drill generator
data/                Local-only RAG corpus, Trailhead SQLite, and Friction Card catalog (gitignored)
docs/research/       Domain research notes & architectural taxonomy
design.md            Visual system (Miro × Salesforce craft)
CONTEXT.md           Product language / glossary
```

## Prerequisites

- Node.js 24+ (see [`.nvmrc`](./.nvmrc))
- [pnpm](https://pnpm.io/)
- Cloudflare account + Wrangler login for deploy / KV seed

## Commands

```bash
pnpm install

# Local UI (Vite on :3000)
pnpm dev

# Compile drills → web data/public, then build packages + web
pnpm build

# Unit tests (drill-core)
pnpm test

# Preview production build
pnpm preview

# Deploy to Cloudflare Pages
pnpm deploy

# Push compiled drills into KV (after build)
pnpm seed
```

### Content authoring helpers

```bash
# Validate & emit published drills into canonical-drills.json only
pnpm build:drills

# Toggle editorial status (draft stays in content/; published enters the learner catalog)
pnpm drill:status --status draft --all
pnpm drill:status --status published --domain-label "Data 360"

# RAG crawl / index official docs (Python + Chroma under data/chroma/, gitignored)
python scripts/crawler/crawl_architect.py

# Ingest Trailhead Community discussions into local SQLite (data/trailhead.db, gitignored)
python scripts/crawler/crawl_trailhead.py --limit 100

# Friction Cards and drills are written by your coding agent (no LLM API keys). Project skills:
#   .cursor/skills/extracting-friction-cards  — agent answers `friction_cards.py prompt`, then `import`s
#   .cursor/skills/reviewing-friction-cards   — agent audits pending cards via `audit-prompt` / `apply-verdicts`
#   .cursor/skills/generating-drills          — agent answers `generate-drill.ts prompt`, then `ingest`s
# Human steps: review/approve cards (or apply agent verdicts), then export to data/friction_cards.json (gitignored)
python scripts/crawler/friction_cards.py audit-prompt --tier A --limit 20 --preview-docs > /tmp/audit.md
python scripts/crawler/friction_cards.py apply-verdicts /tmp/verdicts.json
python scripts/crawler/friction_cards.py review               # [p] previews official docs, [e] edits it
python scripts/crawler/friction_cards.py export

# Manual drill flow: build the grounded prompt, answer it, then validate and save as a draft
npx tsx scripts/generator/generate-drill.ts prompt --from-card FC-<discussion_id> [--format Lesson] [--query "…"] > prompt.md
npx tsx scripts/generator/generate-drill.ts ingest drill.json

# Legacy keyword clustering (superseded by Friction Cards; writes data/curated_community_patterns.json)
python scripts/crawler/analyze_trailhead_patterns.py
```

## Drill formats

- **Rapid Fire** — timed MCQ with confidence gate
- **Currency** — allocate a constrained architect budget across competing architectural requirements
- **Scenario** — multi-turn dual-meter decision simulation (stakeholder trust × Well-Architected integrity)
- **Lesson** — multi-stage forensic refactor walkthrough grounded in official architect fundamentals

Every format uses the universal pre-submit **confidence gate** (50%, 70%, 85%, 95%) for Brier score calibration telemetry.

## Calibration & Privacy Architecture

- **Metacognitive Calibration**: Drills map answers against subjective confidence into four quadrants (*Calibrated Conviction*, *Calibrated Humility*, *Hesitant Mastery*, *Hazardous Assumption*) to eliminate dangerous architectural blind spots.
- **Local-First Practice**: No account, login, or Salesforce org connection is required. Streaks, progress, and history stay inside your browser's `localStorage`.
- **Anonymous Drill Ratings**: Optional enum-pill feedback (no free text). Edge anti-sybil uses a short-lived HMAC over date + drill + connecting IP; raw IP is not stored in feedback records. See [`/privacy`](./apps/arcgym-web/src/pages/PrivacyPage.tsx).
- **Cookieless Telemetry**: Site analytics are aggregated via Cloudflare Web Analytics (no cookies, no cross-site advertising profiles).

## Edge secrets (required for Functions)

Do **not** put secrets in `wrangler.toml` `[vars]`. Configure three separate Cloudflare Pages secrets (and matching `.dev.vars` for local Functions):

| Secret | Purpose |
| --- | --- |
| `ARCGYM_HMAC_SECRET` | HMAC for `POST /api/webhooks/publish-drill` (`X-ArcGym-Signature`) |
| `ARCGYM_ADMIN_KEY` | Bearer for `GET /api/admin/feedback` (`X-ArcGym-Admin-Key` header only) |
| `ARCGYM_VOTE_HMAC_SECRET` | HMAC for ephemeral vote-dedup tokens |

```bash
# Production (Pages project "arcgym")
pnpm --filter @arcgym/web exec wrangler pages secret put ARCGYM_HMAC_SECRET --project-name=arcgym
pnpm --filter @arcgym/web exec wrangler pages secret put ARCGYM_ADMIN_KEY --project-name=arcgym
pnpm --filter @arcgym/web exec wrangler pages secret put ARCGYM_VOTE_HMAC_SECRET --project-name=arcgym

# Local Functions
cp apps/arcgym-web/.dev.vars.example apps/arcgym-web/.dev.vars
# edit .dev.vars with `openssl rand -hex 32` values
```

If you previously used the committed placeholder `arcgym_hmac_secret_2026_super_secure`, treat it as compromised and rotate all three secrets.

## Design

UI follows the Miro-adapted ArcGym design system: black-pill primary actions, Salesforce blue reserved for brand/links, hairline surfaces, Geist Sans. Details and tokens live in [`design.md`](./design.md).

## Notes

- `.archive/` may contain retired LWR / SFDX experiments; it is gitignored and not part of the runtime.
- Local scratch, Chroma indexes, SQLite databases (`data/*.db`), Wrangler caches, and env files are gitignored — see [`.gitignore`](./.gitignore).
