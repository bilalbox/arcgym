# Spec: Port 23p.tech diagram pipeline into ArcGym

**Status:** Implemented (domain live; diagram package + QA shipping)  
**Date:** 2026-10-02  
**Repo:** `arcgym`  
**Companion:** `23ptech` spec — `docs/specs/2026-10-02-retire-diagrams-links-into-faqs.md`  
  (path on disk: `/home/bilal/mycode/23ptech/docs/specs/2026-10-02-retire-diagrams-links-into-faqs.md`)

## Locked product decisions

| Decision | Choice |
| --- | --- |
| Site integration | ArcGym stays a separate app on **`practice.23p.tech`** (Cloudflare Pages custom domain). No subpath embed. |
| Monorepo | **Deferred.** Repos stay separate. |
| Diagram engine home | **ArcGym** — authoring and QA live here going forward. |
| 23p FAQ embeds | Static `<img>` / markdown images only (no live hover engine on FAQ pages). |
| Old 23p `/diagrams` | Redirect into FAQs (owned by the 23ptech companion spec). |

## Context

23p.tech built a strong **authored SVG** pipeline (Hono JSX primitives, arcgym visual skin, L1/L2 geometry QA). ArcGym today only ships **hand-written static SVGs** under `apps/arcgym-web/public/diagrams/` referenced by `diagramUrl`.

ILT use of a standalone diagram catalog is ending. New diagram work will be **drill-driven** (Rapid Fire option previews today; troubleshooting / richer formats later). The valuable 23p pieces to port are the **primitives + geometry QA**, not the `/diagrams` presentation chrome.

## Goals

1. Host ArcGym at **`practice.23p.tech`**.
2. Establish a **React-native diagram authoring package** in this monorepo (primitives + tokens), suitable for drill art and future formats.
3. Port **L1/L2 diagram geometry QA** from 23ptech so authored drill diagrams fail CI on overlaps / bad docks / soft aesthetic violations.
4. Keep the existing **`diagramUrl` → static SVG → `<img>` Inspect** learner contract unless a later format ADR changes it.
5. Provide a **SVG export** path so the same authored source can feed `public/diagrams/` (and optionally be copied into 23p FAQ assets).

## Non-goals (this workflow)

- Merging repos / monorepo with 23ptech.
- Porting Mermaid prerender, `diagrams.js` zoom/fullscreen, or the `/diagrams` catalog UI.
- Live React diagram components inside the learner Inspect lightbox (static SVG is enough for now).
- Rewriting all existing AGD-008xx hand SVGs on day one (migrate opportunistically as drills change).
- Changing drill session/scoring logic in `@arcgym/drill-core`.

## Source of truth in 23ptech (port from)

| Asset | Path | Port? |
| --- | --- | --- |
| Authored primitives | `src/diagrams/authored/primitives.tsx` (~1100 LOC) | **Yes** → React package |
| Sequence primitives | `src/diagrams/authored/sequencePrimitives.tsx` | **Yes** if sequence drill art is in scope soon; else later |
| ArcGym CSS tokens | `public/styles.css` (`--diagram-arcgym-*`) | **Yes** → package CSS/TS tokens |
| L1/L2 auditor | `tests/diagram-qa/auditSvgGeometry.ts` + `RULES.md` | **Yes** |
| Playwright harness | `tests/e2e/diagram-qa.spec.ts` + `test:diagram-qa` | **Yes** (adapted) |
| Scenario compositions | `src/diagrams/authored/*.tsx` (apiPolicy, zeroCopy, …) | **No** as a catalog — optional one-off SVG export if a FAQ needs them |
| Catalog / page chrome | `src/lib/diagrams.ts`, `routes/pages.tsx`, `diagramSupport.tsx`, `diagrams.js` | **No** |

## Target architecture (ArcGym)

```text
packages/diagrams/          # NEW — React SVG primitives + tokens + export helpers
packages/drill-core/        # unchanged domain logic
apps/arcgym-web/
  public/diagrams/          # emitted or hand SVGs (diagramUrl targets)
  src/.../RapidFireRunner   # keeps <img src={diagramUrl}>
  … diagram-qa tests        # ported auditor against emitted SVGs
```

Suggested package name: `@arcgym/diagrams`.

### JSX decision

23p primitives use **Hono JSX**. ArcGym is **React 19**. The port **rewrites attributes for React** (`class` → `className`, SVG prop casing, etc.). Do not try to share Hono JSX across repos.

### Export contract

- Authored diagram modules render to a string SVG (Vitest or a small Node/Playwright script).
- Output lands in `apps/arcgym-web/public/diagrams/<id>.svg`.
- `build-drills` continues to validate that `diagramUrl` paths exist.
- Optional: document a copy step for 23p FAQ static assets (owned by 23ptech; no runtime coupling).

## Workstreams

### A. Custom domain — `practice.23p.tech`

1. Cloudflare Pages project `arcgym`: attach custom domain `practice.23p.tech`.
2. DNS (likely CNAME) under the `23p.tech` zone.
3. Confirm HTTPS, SPA `_redirects`, and Pages Functions (`/api/*`) still work on the custom host.
4. Update ArcGym canonical URLs / privacy copy if they hardcode the old `*.pages.dev` host.
5. Smoke: home, `/drills/:id`, `/cases/:id`, `/api/drills/today`.

### B. Package `@arcgym/diagrams`

1. Scaffold `packages/diagrams` in the existing pnpm workspace.
2. Port primitives + arcgym tokens (start with architecture topology primitives used by Data 360 drill art; sequence later if needed).
3. Preserve the DOM contract the QA auditor expects where applicable:
   - `data-node-id`, `data-edge-from` / `data-edge-to`
   - classes like `diagram-node`, `diagram-node-body`, `diagram-edge`
   - `data-layout-role="zone-header"`, `data-qa-allow="…"`
4. Add a minimal authoring example that emits one SVG into `public/diagrams/` and is referenced by a drill (or a fixture drill).
5. Export tokens so light/dark (if ArcGym theme needs it) can stay CSS-variable based.

### C. Port diagram QA

1. Copy `RULES.md` semantics into `packages/diagrams` or `apps/arcgym-web` tests (keep rule ids stable).
2. Port `auditSvgGeometry.ts` (pure TS — should move cleanly).
3. Adapt the Playwright (or Vitest + happy-dom/`getBBox` if viable) harness to audit **emitted drill SVGs** (and any package fixtures), not the 23p `/diagrams` catalog.
4. Wire `pnpm` script e.g. `test:diagram-qa`; gate `deploy` / CI the same way 23p does (zero L1+L2 violations).
5. Document intentional `data-qa-allow` exceptions for drill thumbnails that are deliberately dense (prefer fixing layout first).

### D. Drill authoring workflow

Document the happy path in README or `CONTEXT.md`:

1. Author topology in `@arcgym/diagrams` (or a drill-local module importing primitives).
2. Export SVG → `public/diagrams/…`.
3. Set `diagramUrl` on the option / exhibit.
4. `pnpm build:drills` + `pnpm test:diagram-qa`.
5. Ship.

Leave room for a future ADR if troubleshooting Rapid Fire or a new format needs **inline** interactive SVG (out of scope here).

## Acceptance criteria

- [x] `https://practice.23p.tech` serves the ArcGym SPA (and APIs) successfully.
- [x] `@arcgym/diagrams` exists and can author at least one topology SVG used by a published or fixture drill.
- [x] L1+L2 QA runs in CI against authored/emitted SVGs with rule parity to 23ptech `RULES.md`.
- [x] Existing hand-authored SVGs continue to work via `diagramUrl` (QA may apply only to package-emitted SVGs initially, then expand).
- [x] No dependency on the 23ptech Worker at runtime.

## Suggested sequencing

1. Domain cutover (`practice.23p.tech`) — unblocks the 23p nav CTA. **Done** (custom domain + DNS live; no hardcoded `*.pages.dev` hosts in app copy).
2. Scaffold `@arcgym/diagrams` + one exported SVG proof. **Done** (full topology set + all drill `*-topology.svg` emitted).
3. Port QA auditor + CI gate. **Done**.
4. Use the package for the next new/changed drill diagrams; migrate old SVGs as touched. **Done** for topologies; orphan non-topology hand SVGs removed.

## Open implementation details (resolve during build)

- Exact package public API surface (shell/node/card/zone/edge only vs full 23p primitive set).
- Whether QA runs in Playwright only or also as a pure unit pass on serialized SVG.
- Whether sequence primitives ship in v1 of the package or wait for a drill that needs them.
- Hosting of SVGs that 23p FAQs embed: copy into 23p `public/`, R2, or hotlink `practice.23p.tech/diagrams/…` (prefer **copy or same-site static** on 23p so FAQ pages do not depend on ArcGym uptime — decide in the companion spec).
