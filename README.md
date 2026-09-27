# ArcGym

Daily architectural judgment practice for Salesforce Architects — Core Platform, Data 360, and Agentic AI — grounded in the [Salesforce Well-Architected](https://architect.salesforce.com) framework.

Progress and confidence calibration live in the browser. There is no Salesforce org runtime dependency.

## Stack

| Layer | Choice |
| --- | --- |
| App | React 19 + Vite 8 (`apps/arcgym-web`) |
| Design | Miro-inspired system (see [`design.md`](./design.md)) via Tailwind CSS 4 + Radix primitives |
| Domain | `@arcgym/drill-core` — scoring, calibration, recommendation types |
| Hosting | Cloudflare Pages + Pages Functions + KV (Wrangler 4) |
| Content | JSON drills under `content/drills/`, compiled by `scripts/build-drills.ts` |

## Monorepo layout

```
apps/arcgym-web/     Cloudflare Pages React app (UI + Functions)
packages/drill-core/ Pure TypeScript domain library
content/drills/      Authoritative drill JSON
content/scenarios/   Curated recurring problem patterns (Trailhead Community)
scripts/             Drill build, KV seed, RAG crawler/generator
docs/research/       Domain research notes
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
# Validate & emit canonical-drills.json only
pnpm build:drills

# RAG crawl / index official docs (Python + Chroma under data/chroma/, gitignored)
python scripts/crawler/crawl_architect.py

# Ingest Trailhead Community discussions into local SQLite (data/trailhead.db, gitignored)
python scripts/crawler/crawl_trailhead.py --limit 100

# Extract recurring practitioner problem patterns & antipattern distractors
python scripts/crawler/analyze_trailhead_patterns.py

# Generate a draft drill from Chroma context & community scenarios
npx tsx scripts/generator/generate-drill.ts --topic "Your topic"
```


## Drill formats

- **Rapid Fire** — timed MCQ with confidence gate
- **Currency** — allocate a constrained architect budget
- **Scenario** — multi-turn dual-meter (stakeholder trust × Well-Architected integrity)
- **Lesson** — staged refactor walkthrough

Every format uses the universal pre-submit **confidence gate** for calibration telemetry.

## Design

UI follows the Miro-adapted ArcGym design system: black-pill primary actions, Salesforce blue reserved for brand/links, hairline surfaces, Geist Sans. Details and tokens live in [`design.md`](./design.md).

## Notes

- `.archive/` may contain retired LWR / SFDX experiments; it is gitignored and not part of the runtime.
- Local scratch, Chroma indexes, SQLite databases (`data/*.db`), Wrangler caches, and env files are gitignored — see [`.gitignore`](./.gitignore).
