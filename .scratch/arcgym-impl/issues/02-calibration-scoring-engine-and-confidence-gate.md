# 02: Core Calibration Scoring Engine & Universal Pre-Submit Gate

**What to build:**
A pure TypeScript scoring engine in `packages/drill-core` implementing the Asymmetric Brier Skill Score ($BSS_{asym}$) with the $2.5\times$ overconfidence penalty, rolling 30-drill $ECE$/$JCI$ algorithms, paired with the shared presentational LWC `c-confidence-gate` in `packages/drill-ui` rendering the 4 discrete SLDS confidence chips (`50% Speculative`, `70% Plausible`, `85% High Conviction`, `95% Architectural Axiom`).

**Blocked by:** 01: Monorepo Scaffold & Open-Source LWR Shell on Cloudflare

**Status:** completed

## Acceptance criteria

- [x] `packages/drill-core` exports `ArcGymScoringEngine` implementing $BSS_{asym}$ with $\alpha = 2.5$ overconfidence multiplier.
- [x] Longitudinal metric functions implemented: $ECE_{30}$, $JCI_{30}$ ($0$–$1,000$ index), and metacognitive quadrant mapping.
- [x] 100% test coverage on calibration calculations using Vitest.
- [x] `c-confidence-gate` LWC authored in `packages/drill-ui` without `@salesforce/*` dependencies.
- [x] Gate enforces selection before dispatching `confidenceselected` event; visually highlights selected chip using SLDS tokens.
