# ArcGym

Architectural judgment practice for Salesforce Architects — Core Platform, Data 360, and Agentic AI — grounded in the [Salesforce Well-Architected](https://architect.salesforce.com) framework.

Progress and confidence calibration live in the browser. There is no Salesforce org runtime dependency.

Live: **https://practice.23p.tech**

> Inspired by [Analyst Gym](https://analystgym.com/).

Content pipeline (RAG, Friction Cards, drill lint): [`docs/pipeline.md`](./docs/pipeline.md). Glossary: [`CONTEXT.md`](./CONTEXT.md).

## Stack

| Layer | Choice |
| --- | --- |
| App | React 19 + Vite 8 (`apps/arcgym-web`) |
| Design | Miro-inspired system (see [`design.md`](./design.md)) via Tailwind CSS 4 + Radix primitives |
| Domain | `@arcgym/drill-core` — scoring, calibration, recommendation types |
| Diagrams | Self-contained Mermaid (`diagramSource`) rendered via Obsidian Pele (`pele`) |
| Hosting | Cloudflare Pages + Pages Functions + KV (Wrangler 4) + cookieless Web Analytics |
| Content | JSON drills under `content/drills/`, compiled by `scripts/build-drills.ts` |

## Monorepo layout

```
apps/arcgym-web/     Cloudflare Pages React app (UI + Functions + /privacy route)
packages/drill-core/ Pure TypeScript domain library (scoring, calibration, recommendations)
content/drills/      Authoritative drill JSON
scripts/             Drill build, KV seed, RAG crawler, Friction Card tooling, drill generator
data/                Local-only RAG corpus / SQLite / Friction Card catalog (gitignored)
docs/                ADRs, research, pipeline guide
design.md            Visual system
CONTEXT.md           Product language / glossary
```

## Prerequisites

- Node.js 24+ (see [`.nvmrc`](./.nvmrc))
- [pnpm](https://pnpm.io/)
- Cloudflare account + Wrangler login for deploy / KV seed

## Commands

```bash
pnpm install
pnpm dev          # Vite UI on :3000
pnpm typecheck
pnpm check        # Biome
pnpm build        # drills → web + typecheck + Biome + web build
pnpm test
pnpm preview
pnpm deploy       # gates then Cloudflare Pages
pnpm seed         # push compiled drills to KV (after build)
```

Authoring / crawler commands: [`docs/pipeline.md`](./docs/pipeline.md#content-authoring-helpers).

## Drill format

- **Rapid Fire** — timed multi-rep decisions with confidence gate; options may embed optional topology previews (`diagramUrl`) with Inspect lightbox

Every drill uses the universal pre-submit **confidence gate** (50%, 70%, 85%, 95%) for Brier score calibration telemetry.

## Calibration & privacy

- **Metacognitive calibration** — answers × confidence → four quadrants (Conviction, Humility, Hesitant Mastery, Hazardous Assumption).
- **Zero-PII sync** — practice without login; optional Google/GitHub under a pseudonymous D1 model (no passwords, names, or emails stored). No Salesforce org connection.
- **Anonymous ratings** — enum pills only; short-lived HMAC anti-sybil; see [`/privacy`](./apps/arcgym-web/src/pages/PrivacyPage.tsx).
- **Cookieless analytics** — Cloudflare Web Analytics.

## Edge secrets

Do **not** put secrets in `wrangler.toml` `[vars]`. Use Pages secrets (and `.dev.vars` locally):

| Secret | Purpose |
| --- | --- |
| `ARCGYM_HMAC_SECRET` | HMAC for `POST /api/webhooks/publish-drill` |
| `ARCGYM_ADMIN_KEY` | Bearer for `GET /api/admin/feedback` |
| `ARCGYM_VOTE_HMAC_SECRET` | HMAC for ephemeral vote-dedup tokens |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth (if enabled) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth (if enabled) |
| `SESSION_SECRET` / `LEARNER_PEPPER` | Session + pseudonymous IDs |

```bash
pnpm --filter @arcgym/web exec wrangler pages secret put ARCGYM_HMAC_SECRET --project-name=arcgym
# …same for the other names…

cp apps/arcgym-web/.dev.vars.example apps/arcgym-web/.dev.vars
# fill with `openssl rand -hex 32` (and OAuth ids) for local Functions
```

## Design

UI follows the Miro-adapted ArcGym design system: black-pill primary actions, Salesforce blue for brand/links, hairline surfaces, Geist Sans. Details in [`design.md`](./design.md).

## Notes

- `.archive/` may contain retired LWR / SFDX experiments; gitignored, not runtime.
- Local scratch, Chroma, SQLite (`data/*.db`), Wrangler caches, and env files are gitignored — see [`.gitignore`](./.gitignore).

## License

MIT — see [LICENSE](LICENSE).
