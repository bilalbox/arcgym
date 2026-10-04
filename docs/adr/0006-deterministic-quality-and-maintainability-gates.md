# Deterministic Quality & Maintainability Gates

## Context

While our existing baseline employs `tsc`, `biome`, and Vitest test suites, LLM coding agents routinely introduce structural degradation: runaway cognitive complexity, subtle circular dependencies across modules, layer boundary leakage (e.g. client code importing backend functions), speculative dead code, and clone duplication.

To maintain architectural integrity and developer ergonomics across agentic workflows, we require unyielding, stepped deterministic gates that fail fast and prevent regressions.

---

## Decision

We adopt a four-stage deterministic verification pipeline. **Phase 1** is integrated immediately into active development loops; **Phase 2** is specified with concrete configuration blueprints for follow-up rollout.

```
Stage 1: Syntax & Types (Fast fail)
└── pnpm typecheck && pnpm check (Biome format + lint + cognitive complexity <= 15)

Stage 2: Behavioral Correctness & Regressions
└── pnpm test (Vitest across all workspace packages + diagram QA)

Stage 3: Architectural Boundaries & Acyclic Graph
└── pnpm check:arch (dependency-cruiser with strict layer rules & zero cycles)

Stage 4: Dead Code & Duplication
└── pnpm check:dead (Knip) && pnpm check:clones (jscpd AST clone detection)
```

The composite gate `pnpm verify` executes Stages 1 through 4 sequentially.

---

## Phase 1 Implementation

### 1. Cognitive Complexity Guard (Biome)
- **Rule**: `complexity/noExcessiveCognitiveComplexity` configured at severity `error` with `maxAllowedComplexity: 15`.
- **Ratchet Strategy**: All newly authored or modified code must satisfy $\le 15$. Existing hotspot functions (29 legacy files with complexity up to 255) are grandfathered via explicit `overrides` in [`biome.json`](../../biome.json). As legacy files are touched, their overrides are removed.

### 2. Architectural Boundaries & Circular Dependencies (`dependency-cruiser`)
Configured in [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs) using `@swc/core` AST parsing to support modern TypeScript:
- **`no-circular`**: Zero runtime dependency cycles permitted across the entire repository. Legacy cycles between `types/drill.ts`, `formats/`, `validator/`, and `lint/` were resolved by extracting pure type contracts into dedicated `types.ts` modules.
- **`drill-core-pure`**: [`packages/drill-core`](../../packages/drill-core) is strictly domain logic; it must never import UI, React, DOM, Cloudflare Workers/Pages runtimes, or scripts.
- **`diagrams-pure`**: [`packages/diagrams`](../../packages/diagrams) must never import web application chrome or tooling scripts.
- **`web-client-no-functions`**: [`apps/arcgym-web/src`](../../apps/arcgym-web/src) must never import Cloudflare Pages Functions ([`apps/arcgym-web/functions`](../../apps/arcgym-web/functions)) directly.
- **`web-functions-no-client`**: Cloudflare Pages Functions must never import React components or client-only hooks.
- **`no-importing-scripts`**: Monorepo packages and applications must never import build or crawler scripts from [`scripts/`](../../scripts).

### 3. Pipeline Integration
- `pnpm check`: Runs Biome check (used in [`.husky/pre-commit`](../../.husky/pre-commit) for instant commit gating).
- `pnpm check:arch`: Executes `dependency-cruiser` against all workspace layers.
- `pnpm check:dead`: Executes `knip` across all workspaces to catch dead files, dependencies, and unlisted packages.
- `pnpm check:clones`: Executes `jscpd` to enforce the $< 2.0\%$ code duplication threshold.
- `pnpm verify`: Executes `pnpm typecheck && pnpm check && pnpm test && pnpm check:arch && pnpm check:dead && pnpm check:clones`. Agents run this command as the definition of done before concluding tasks.

---

## Phase 2 Implementation (Dead Code & Duplication)

### 1. Knip (Dead Code & Surface Area Minimization)
Configured in [`knip.json`](../../knip.json) with tailored workspace entry points:
- **Cloudflare Pages Functions**: `apps/arcgym-web/functions/**/!(*.test).ts`
- **Vite Web Client**: `apps/arcgym-web/src/main.tsx`
- **Workspace Package Entries**:
  - `@arcgym/drill-core`: `packages/drill-core/src/index.ts`
  - `@arcgym/diagrams`: `packages/diagrams/src/index.ts`, `packages/diagrams/src/qa/auditSvgGeometry.ts`
- **Tooling Scripts**: `scripts/*.ts`, `scripts/**/*.ts`

**Enforcement**:
- Pruned orphaned `slider.tsx` component and uninstalled unused `@radix-ui/react-slider`.
- `pnpm check:dead` strictly fails on dead files, unused dependencies, or unlisted binaries.

### 2. `jscpd` (Copy/Paste & Token Duplication Detection)
Configured in [`.jscpd.json`](../../.jscpd.json) with AST-level token duplication detection:
- **Threshold**: Fails if duplicated tokens exceed $2.0\%$ (repository baseline: $0.59\%$).
- **Configuration**:
  - `minTokens: 80`
  - Ignores `node_modules`, `dist`, `.wrangler`, `crawler`, `*.test.ts`, `prototypes`, and generated `canonical*.json` catalogs.
- **Enforcement**: Integrated into `pnpm verify` via `pnpm check:clones`.

---

## Phase 3 Roadmap: Test Depth & Mutation Testing

To prevent agents from generating superficial tests that hit line-coverage targets without verifying business invariants:
- **Target Scope**: Pure algorithmic packages ([`packages/drill-core/src/scoring/`](../../packages/drill-core/src/scoring/), [`recommendation/`](../../packages/drill-core/src/recommendation/), [`caseSession/`](../../packages/drill-core/src/caseSession/)).
- **Evaluation**: Run `@stryker-mutator/core` targeted on mutated scoring algorithms with a mutation score threshold $\ge 80\%$.
- **CRAP Metric Target**: Maintain Change Risk Anti-Patterns score $\text{CRAP}(m) < 30$ for critical domain scoring functions:
  $$\text{CRAP}(m) = \text{comp}(m)^2 \times (1 - \text{cov}(m))^3 + \text{comp}(m)$$

