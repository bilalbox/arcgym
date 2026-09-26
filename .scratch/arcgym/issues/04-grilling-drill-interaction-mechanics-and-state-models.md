Type: grilling
Status: resolved
Blocked by:

# Define interactive state machine and mechanics for the 4 drill formats

## Question

What are the exact user flows, input schemas, state transitions, time horizons, and real-time coaching/feedback loops for Lesson (refactor), Rapid Fire (pattern recognition), Currency (budget allocation), and Scenario (stakeholder trust) drills, and how does the confidence calibration step integrate seamlessly into each?

## Answer

### 1. Universal Pre-Submit Gate (Uniform Calibration Flow)
Every atomic commit across all four drill formats enforces a **Universal Pre-Submit Gate**. 
- The user cannot submit an architectural decision until they actively select one of the four discrete SLDS confidence chips:
  - `50% Speculative` (Toss-up / Exploration)
  - `70% Plausible` (Heuristic pattern)
  - `85% High Conviction` (Well-Architected standard)
  - `95% Architectural Axiom` (Hard limit / Security boundary)
- This standardizes the telemetry schema: every logged action record stores `{ decisionId, optionChosen, confidenceRating, timeToCommitMs, brierScoreDelta }`, simplifying analytics, assessment pipelines, and metacognitive tracking.

---

### 2. Detailed Drill State Machines & Mechanics

#### A. Rapid Fire Format (Pattern Recognition)
- **Structure**: 6–8 high-velocity binary or ternary decision calls per drill session.
- **Pacing**: ~15 seconds per call; total drill duration < 2 minutes.
- **UI State Sequence**:
  1. *Prompt Display*: 1–2 constraint sentences highlighting volume, SLA, or integration boundaries.
  2. *Options*: 2–3 mutually exclusive architectural patterns/tools.
  3. *Confidence Gate*: 4-chip SLDS selector docked directly above the submit button.
  4. *Immediate Reveal*: On submit, option illuminates green/red with a concise 1-sentence Well-Architected rationale and link to `architect.salesforce.com`.
  5. *Advancement*: Smooth 300ms transition to the next call.
- **Scoring**: $BSS_{asym}$ scored per call; post-drill summary displays overall accuracy and calibration quadrant.

#### B. Currency Format (Architect Budget Allocation)
- **Structure**: Single-phase architectural optimization problem under hard platform constraints.
- **Budget Denominations**: Dynamically adapts to the problem domain:
  - *Core Platform*: Governor Capacity (e.g., 100 SOQL queries, 50k DML rows, 10,000ms CPU).
  - *Data 360*: Consumption Credits (Data Cloud processing units, query row limits, streaming credits).
  - *Agentforce*: Token/Context Window & Reasoning Step budget.
  - *Cross-Cutting*: Technical Debt / Complexity Points (100-point ceiling).
- **UI State Sequence**:
  1. *Scenario & Budget Meter*: Sticky visual gauge showing remaining budget vs. target SLA/throughput.
  2. *Action Catalog*: 4–6 architectural interventions (e.g. "Implement Custom Index: -20 pts", "Data Cloud Zero Copy Federation: -50 pts", "CDC to Snowflake: -35 pts").
  3. *Selection & Validation*: Real-time budget tally. If budget is exceeded (< 0), the submit button disables with limit warning.
  4. *Confidence Gate*: 4-chip selector enabled once a valid package is assembled.
  5. *Commit & Reveal*: Evaluates whether the chosen package satisfies non-functional requirements without exceeding budget or introducing hidden scalability traps.

#### C. Scenario Format (Stakeholder Negotiation & Politics)
- **Structure**: Multi-turn dialogue unfolding over 3 sequential moves with an executive or technical persona (CISO, CFO, VP Sales, Dev Lead).
- **Scoring Engine**: **Dual-Meter Tracking**:
  - *Stakeholder Trust (0–100)*: Measures political alignment and business satisfaction.
  - *Well-Architected Integrity (0–100)*: Measures adherence to Trust, Reliability, and Scalability.
- **UI State Sequence**:
  - *Move 1 (Initial Demand)*: Stakeholder presents an aggressive or risky demand (e.g., "Bypass Trust Layer to meet Friday launch deadline").
    - User selects from 3 architectural stances (Compromise, Firm Pushback, Alternative Pattern).
    - Confidence selected -> Submit -> Meters adjust.
  - *Move 2 (Escalation / Complication)*: Stakeholder reacts; new constraint introduced (e.g. audit team flags unmasked PII).
    - User adapts stance -> Confidence selected -> Submit -> Meters adjust.
  - *Move 3 (High-Stakes Resolution)*: Final architectural settlement.
    - Final compromise committed with confidence rating.
  - *Post-Scenario Debrief*: "Technical Debt Hangover" card highlights long-term maintenance impact of any integrity drops below 70.

#### D. Lesson Format (Architectural Refactor & Forensic Walkthrough)
- **v1 Implementation**: **4-Stage Progressive Reveal with In-Flight Coaching**:
  - *Stage 1: Forensic Diagnosis*: Review a failing architecture snippet/diagram; identify the root bottleneck (e.g., lookup skew causing lock contention). Confidence + Submit.
  - *Stage 2: Target State Selection*: Select the correct Well-Architected target pattern (e.g., decoupling via Platform Events + Queueable Apex). Confidence + Submit.
  - *Stage 3: Transition & Governance Guardrail*: Select phased migration and rollback strategy without downtime. Confidence + Submit.
  - *Stage 4: Post-Refactor Observability*: Determine which Event Monitoring / Session Tracing telemetry verifies success. Confidence + Submit.
  - *In-Flight Coaching*: If a sub-optimal choice is selected, an inline coach note explains the flaw immediately before the user retries.
- **Roadmap (v2)**: Interactive Architecture Diagram Builder (graduated to `Not yet specified`).
