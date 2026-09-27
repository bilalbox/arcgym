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
| Hosting & Analytics | Cloudflare Pages + Pages Functions + KV (Wrangler 4) + Cloudflare Web Analytics (privacy-preserving, zero-PII) |
| Content | JSON drills under `content/drills/`, compiled by `scripts/build-drills.ts` |

## Monorepo layout

```
apps/arcgym-web/     Cloudflare Pages React app (UI + Functions + /privacy route)
packages/drill-core/ Pure TypeScript domain library (scoring, calibration, recommendations)
content/drills/      Authoritative drill JSON (38 drills across 6 architectural domains)
content/scenarios/   Curated recurring problem patterns (Trailhead Community)
scripts/             Drill build, KV seed, RAG crawler, pattern analyzer, drill generator
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

# Extract recurring practitioner problem patterns & antipattern distractors
python scripts/crawler/analyze_trailhead_patterns.py

# Generate a draft drill from Chroma context & community scenarios (status defaults to draft)
npx tsx scripts/generator/generate-drill.ts --topic "Your topic"
```

## Drill formats

- **Rapid Fire** — timed MCQ with confidence gate
- **Currency** — allocate a constrained architect budget across competing architectural requirements
- **Scenario** — multi-turn dual-meter decision simulation (stakeholder trust × Well-Architected integrity)
- **Lesson** — multi-stage forensic refactor walkthrough grounded in official architect fundamentals

Every format uses the universal pre-submit **confidence gate** (50%, 70%, 85%, 95%) for Brier score calibration telemetry.

## Calibration & Privacy Architecture

- **Metacognitive Calibration**: Drills map answers against subjective confidence into four quadrants (*Calibrated Conviction*, *Calibrated Humility*, *Hesitant Mastery*, *Hazardous Assumption*) to eliminate dangerous architectural blind spots.
- **Zero-PII & Local-First**: No account, login, or Salesforce org connection is required. Streaks, progress, and history stay inside your browser's `localStorage`.
- **Cookieless Telemetry**: Site analytics are strictly aggregated and anonymous via Cloudflare Web Analytics (no cookies, no IP logging, no cross-site tracking). See [`/privacy`](./apps/arcgym-web/src/pages/PrivacyPage.tsx).

## Design

UI follows the Miro-adapted ArcGym design system: black-pill primary actions, Salesforce blue reserved for brand/links, hairline surfaces, Geist Sans. Details and tokens live in [`design.md`](./design.md).

## Notes

- `.archive/` may contain retired LWR / SFDX experiments; it is gitignored and not part of the runtime.
- Local scratch, Chroma indexes, SQLite databases (`data/*.db`), Wrangler caches, and env files are gitignored — see [`.gitignore`](./.gitignore).
