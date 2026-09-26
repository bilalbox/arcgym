# 04: Currency & Scenario Drill Runners (Vertical Slice #2)

**What to build:**
The Currency and Scenario drill interaction runners in `packages/drill-ui`:
- **Currency (`c-budget-meter`)**: Live gauge tracking remaining Governor limits, Data Cloud credits, or token windows as users toggle architectural options, disabling submit when the budget is exceeded.
- **Scenario (`c-dual-meter-scenario`)**: 3-move dialogue tree tracking both *Stakeholder Trust* (0–100) and *Well-Architected Integrity* (0–100) with a post-drill "Technical Debt Hangover" card.

**Blocked by:** 03: Rapid Fire Drill Runner (Tracer Bullet Vertical Slice #1)

**Status:** completed

## Acceptance criteria

- [x] `c-budget-meter` visualizes budget depletion dynamically (Governor capacity, Data Cloud credits, Token windows).
- [x] Prevents package submission if allocated points exceed available budget limit.
- [x] `c-dual-meter-scenario` renders stakeholder persona dialogue across 3 sequential moves.
- [x] Dual meters dynamically adjust based on user stances; displays post-scenario Technical Debt Hangover debrief.
- [x] Universal Pre-Submit Gate enforced before final budget commit and each scenario move.
