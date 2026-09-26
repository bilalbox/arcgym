# 05: Lesson Drill Runner: 4-Stage Progressive Refactor (Vertical Slice #3)

**What to build:**
The 4-stage guided architectural refactoring component (`c-lesson-stepper`) in `packages/drill-ui`:
1. *Forensic Diagnosis* (bottleneck discovery).
2. *Target Pattern Selection* (Well-Architected target state).
3. *Governance & Migration Sequence* (safe phased transition).
4. *Post-Refactor Observability* (telemetry & monitoring verification).
Features in-flight coaching guidance explaining trade-offs immediately if a sub-optimal choice is selected.

**Blocked by:** 03: Rapid Fire Drill Runner (Tracer Bullet Vertical Slice #1)

**Status:** completed

## Acceptance criteria

- [x] `c-lesson-stepper` renders sequential progress across the 4 stages.
- [x] Universal Pre-Submit Gate enforced on each stage prior to advancing.
- [x] If a sub-optimal choice is selected, inline coaching callout explains why before letting the user retry.
- [x] Successful completion awards points, updates calibration profile, and logs completion.
