# 03: Rapid Fire Drill Runner (Tracer Bullet Vertical Slice #1)

**What to build:**
A complete, playable Rapid Fire drill in the web application: 6–8 high-velocity architectural trade-off calls (e.g., CDC vs Platform Events, Custom Index vs Skinny Table). Features constraint prompts, the Universal Pre-Submit Gate, immediate green/red reveals with 1-sentence Well-Architected rationales and documentation links, automatic 300ms transitions, and a post-drill Metacognitive Calibration summary with streak increment.

**Blocked by:** 02: Core Calibration Scoring Engine & Universal Pre-Submit Gate

**Status:** completed

## Acceptance criteria

- [x] `c-rapid-fire-card` and `c-rapid-fire-runner` LWCs authored in `packages/drill-ui`.
- [x] Renders sequential 6–8 decision prompts with constraint context and 2–3 options.
- [x] Enforces confidence selection on each call prior to submission.
- [x] Displays immediate visual feedback (correct/incorrect) with concise Well-Architected explanation.
- [x] Post-drill summary card reveals Brier points earned, accuracy %, calibration quadrant, and increments daily streak.
- [x] Local state persistence in browser `localStorage`/`IndexedDB` for streak tracking.
