# Deterministic Quality & Maintainability Gates

## Context

While our existing baseline employs `tsc`, Biome, and Vitest test suites, LLM coding agents routinely introduce structural degradation: runaway cognitive complexity, subtle circular dependencies across modules, layer boundary leakage (e.g. client code importing backend functions), speculative dead code, and clone duplication.

To maintain architectural integrity and developer ergonomics across agentic workflows, we require unyielding, stepped deterministic gates that fail fast and prevent regressions.

---

## Decision

We adopt the shared **quality-kit** pipeline (see repo root scripts + `AGENTS.md`). **Supersedes** the Phase 1/2 tooling named below (dependency-cruiser, knip, jscpd, file-level Biome complexity overrides, and `pnpm verify` as DoD).

```
pnpm gate:fast
├── biome check .                         # format + lint (tabs, double quotes)
├── lint:graph                            # rev-dep: cycles, boundaries, orphans, unused, clones
├── lint:complexity                       # Biome cognitive-complexity shrink-only ratchet (max 25)
├── typecheck                             # tsc -b (strict + noUncheckedIndexedAccess)
└── lint:py                               # ruff + basedpyright + tach + vulture (scripts/crawler)

pnpm gate = gate:fast && pnpm test        # CI + pre-push
```

Pre-commit is `lint-staged` only (Biome on staged JS/TS; Ruff on staged Python).

---

## Implementation notes

### Biome
- Main `biome.json`: kit defaults (tabs, double quotes); no per-file complexity overrides.
- Complexity lives in `biome.complexity.json` + `baselines/complexity.json` (shrink-only ratchet via `scripts/ratchets/`).

### rev-dep
- Replaces dependency-cruiser (cycles + layer boundaries), knip (orphans / unused), and jscpd (duplication snapshots).
- Config: `rev-dep.config.json` with `moduleBoundaries` mirroring the former drill-core / client / functions / scripts rules.
- Baselines: `.rev-dep.baseline.json`, `.rev-dep.duplicates.json` (seed only via `--update-snapshot`).

### TypeScript
- `tsconfig.json` extends `tsconfig.base.json` (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, …).

### Python (`scripts/crawler`)
- `lint:py` via uvx pins; `tach.toml` forbids circular deps; `vulture_whitelist.py` for acknowledged dead code.

### CI / hooks
- Node 24 (`.nvmrc` / `engines`); composite actions under `.github/actions/`; workflow runs `pnpm gate` + ratchet contract tests.

---

## Historical Phase 3 Roadmap: Test Depth & Mutation Testing

To prevent agents from generating superficial tests that hit line-coverage targets without verifying business invariants:
- **Target Scope**: Pure algorithmic packages ([`packages/drill-core/src/scoring/`](../../packages/drill-core/src/scoring/), [`recommendation/`](../../packages/drill-core/src/recommendation/), [`caseSession/`](../../packages/drill-core/src/caseSession/)).
- **Evaluation**: Run `@stryker-mutator/core` targeted on mutated scoring algorithms with a mutation score threshold $\ge 80\%$.
- **CRAP Metric Target**: Maintain Change Risk Anti-Patterns score $\text{CRAP}(m) < 30$ for critical domain scoring functions:
  $$\text{CRAP}(m) = \text{comp}(m)^2 \times (1 - \text{cov}(m))^3 + \text{comp}(m)$$
