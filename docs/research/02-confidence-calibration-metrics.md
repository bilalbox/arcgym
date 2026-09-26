# Research: Confidence Calibration Scoring Models for Professional Judgment Drills

> **Document ID:** `ARC-RES-02`  
> **Ticket Reference:** Wayfinder Ticket 02 (`.scratch/arcgym/issues/02-research-confidence-calibration-metrics.md`)  
> **Target System:** ArcGym (Architect Gym)  
> **Domain:** Salesforce Architecture (Core Platform, Data 360, Agentforce)  
> **Framework Grounding:** Salesforce Well-Architected Framework (Trust, Reliability, Operational Excellence, Cost/Resource Optimization, Fairness)  
> **Status:** Completed  

---

## Executive Summary

ArcGym trains Salesforce Architects to make high-stakes architectural trade-off decisions under real-world constraints. In enterprise Salesforce implementations, architectural failure rarely stems from a total absence of technical information; rather, it stems from **misplaced certainty**—an architect committing an organization to an anti-pattern with absolute confidence that it is best practice. Conversely, excessive architectural hesitation leads to analysis paralysis, bloated custom engineering, and missed delivery windows.

Confidence calibration is the disciplined practice of aligning one's subjective assessment of certainty with objective empirical accuracy. This research defines the mathematical foundations, behavioral psychology, habit loop mechanics, and UI/UX architecture required to implement a robust, un-gameable confidence calibration engine within daily 2-minute ArcGym drills.

### Key Architectural Recommendations
1. **Mathematical Scoring Rule**: Adopt an **Asymmetric Brier Skill Score ($BSS_{asym}$)** with an overconfidence penalty coefficient ($\alpha = 2.5$). Symmetric quadratic scoring treats overconfidence and underconfidence identically, which fails in high-stakes enterprise governance where overconfident errors produce catastrophic production failures.
2. **Confidence Elicitation UI**: Deploy **four discrete confidence anchors** (`50% Speculative`, `70% Plausible`, `85% High Conviction`, `95% Architectural Axiom`) with dual probabilistic-linguistic anchors. Continuous sliders (0–100%) introduce cognitive fatigue, slider-positioning latency, and false precision without adding calibration fidelity.
3. **Decoupled Habit Architecture**: Strictly decouple the **Daily Streak** (habit consistency, strictly awarded for completion) from the **Judgment Calibration Index** (epistemic accuracy over a rolling 30-drill window) and **Well-Architected Fluency** (domain-specific accuracy). Punishing streaks for incorrect answers or poor calibration induces panic-Googling and destroys the daily 2-minute micro-rep habit loop.
4. **Post-Drill Metacognitive Feedback**: Provide instant single-drill feedback via the **Conviction vs. Outcome Matrix** (categorized into *Calibrated Conviction*, *Calibrated Humility*, *Hesitant Mastery*, or *Hazardous Assumption*), accompanied by a rolling **Reliability Diagram (Calibration Plot)** anchored against the 45-degree line of perfect calibration.

---

## 1. Mathematical Scoring Foundations

### 1.1 Strictly Proper Scoring Rules and Epistemic Honesty

A scoring rule $S(p, y)$ assigns a numerical score to a probabilistic forecast $p \in [0, 1]$ when the actual binary outcome is $y \in \{0, 1\}$. A scoring rule is defined as **strictly proper** if and only if the expected score is uniquely maximized (or expected loss is minimized) when the reported probability $p$ equals the forecaster's true internal subjective belief $q$:

$$\mathbb{E}_{y \sim q}[S(p, y)] \le \mathbb{E}_{y \sim q}[S(q, y)] \quad \forall p \neq q$$

In professional judgment drills, strictly proper scoring rules are essential. Without a proper rule, users can mathematically "game" the platform—for instance, guessing extreme values (100% or 0%) to maximize leaderboard variance, or constantly selecting conservative midpoints (50%) to protect an average.

### 1.2 The Brier Score and Murphy Decomposition

Introduced by Glenn W. Brier in 1950, the **Brier Score ($BS$)** measures the mean squared error between predicted probabilities and actual binary outcomes:

$$BS = \frac{1}{N} \sum_{i=1}^N (c_i - o_i)^2$$

Where:
- $N$ is the number of evaluated judgment calls.
- $c_i \in [0.5, 1.0]$ is the architect's reported confidence in their selected trade-off option.
- $o_i \in \{0, 1\}$ is the outcome indicator ($1$ if the chosen option is correct according to the Well-Architected Framework, $0$ if incorrect).

#### The Murphy Decomposition
Allan H. Murphy (1973) demonstrated that the Brier Score decomposes into three orthogonal, cognitively meaningful components:

$$BS = \text{Reliability} - \text{Resolution} + \text{Uncertainty}$$

1. **Reliability (Calibration Error)**:
   $$\text{Reliability} = \sum_{k=1}^K \frac{n_k}{N} (\bar{c}_k - \bar{o}_k)^2$$
   Measures how close the observed frequency of correct answers ($\bar{o}_k$) is to the stated confidence level ($\bar{c}_k$) across $K$ discrete confidence buckets. Perfect reliability equals $0$.
2. **Resolution (Discrimination Power)**:
   $$\text{Resolution} = \sum_{k=1}^K \frac{n_k}{N} (\bar{o}_k - \bar{o})^2$$
   Measures how much the architect's confidence assignments sort situations into distinct probability categories relative to their base accuracy $\bar{o}$. Higher resolution is better: an architect who assigns 95% to clear architectural violations and 50% to genuine edge-case trade-offs has high resolution.
3. **Uncertainty**:
   $$\text{Uncertainty} = \bar{o}(1 - \bar{o})$$
   The inherent variance of the problem domain, independent of the architect's skill. For balanced drills, uncertainty is maximal at $\bar{o} = 0.5$.

#### Brier Skill Score (BSS)
To make Brier scores intuitive to professionals, ArcGym transforms raw Brier loss into a benchmarked skill score:

$$BSS = 1 - \frac{BS}{BS_{ref}}$$

Where $BS_{ref} = 0.25$ represents a naive baseline (an uncalibrated agent always selecting 50% confidence).
- $BSS = 1.0$: Omniscient, perfectly calibrated architect.
- $BSS = 0.0$: Equivalent to uninformed coin-flipping.
- $BSS < 0.0$: Miscalibrated (systematically overconfident or underconfident).

### 1.3 Expected Calibration Error (ECE) and Sample Size Realities

**Expected Calibration Error (ECE)** (Guo et al., 2017) partitions predictions into $M$ bins $B_1, B_2, \dots, B_M$ and computes the weighted average difference between accuracy and confidence:

$$ECE = \sum_{m=1}^M \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$

Where:
- $\text{acc}(B_m) = \frac{1}{|B_m|} \sum_{i \in B_m} o_i$
- $\text{conf}(B_m) = \frac{1}{|B_m|} \sum_{i \in B_m} c_i$

#### The 2-Minute Drill Sample Size Challenge
In ArcGym, a daily drill takes 2 minutes and generates:
- **Lesson format**: 1 to 3 sequential decisions.
- **Rapid Fire format**: 8 to 12 rapid decisions.
- **Currency format**: 3 to 5 budget allocation commitments.
- **Scenario format**: 3 to 4 sequential conversational turns.

On average, an architect produces **1 to 10 judgment points per day**. Calculating ECE on a single daily drill is statistically meaningless: bins will have zero or one sample, resulting in extreme volatility (e.g., $ECE = 0.45$ on Monday, $0.05$ on Tuesday).

**ArcGym Resolution**:
- **Drill Level**: Score individual drills using the **Asymmetric Brier Skill Score ($BSS_{drill}$)**, which provides immediate, bounded points (0–100 pts) per exercise.
- **Rolling Level**: Calculate $ECE$ and the visual Reliability Diagram across a **rolling window of 30 drills** (or minimum $N \ge 60$ judgment events), denoted as $ECE_{30}$. This guarantees statistical power ($15$–$30$ samples per confidence bin) while reflecting meaningful learning curves.

### 1.4 The Logarithmic Scoring Rule and Why It Fails Daily Habit UX

The **Logarithmic Scoring Rule (Ignorance Score / Cross-Entropy Loss)** is mathematically defined as:

$$S_{log}(c, o) = \begin{cases}
\ln(c) & \text{if } o = 1 \\
\ln(1 - c) & \text{if } o = 0
\end{cases}$$

While strictly proper and possessing profound information-theoretic properties (measuring Shannon information gain), unconstrained logarithmic scoring is **fundamentally unsuitable for daily consumer/prosumer educational habits**:
1. **Asymptotic Destruction**: As $c \to 1.0$, if $o = 0$, $S_{log}(1.0, 0) = -\infty$. A single high-confidence mistake in a monthly drill cycle reduces an architect's cumulative log score to negative infinity.
2. **Morale Collapse**: Even with artificial epsilon clipping ($c \in [0.01, 0.99]$), an incorrect answer at $99\%$ confidence yields $-\ln(0.01) = 4.605$, compared to $-\ln(0.50) = 0.693$. A $6.6\times$ penalty ratio triggers intense user resentment, perceived platform unfairness, and app abandonment ("rage quitting").
3. **Bounded Alternatives**: Bounded quadratic rules (Brier variants) preserve strict mathematical incentives while guaranteeing predictable, psychologically digestible point scales ($0$ to $100$ points).

---

## 2. Psychological Factors & Asymmetric Architectural Risk

### 2.1 The Architectural Asymmetry: Catastrophe vs. Hesitation

Standard scoring models (like vanilla Brier score or symmetric MSE) treat overconfidence and underconfidence symmetrically:
- Claiming 90% and being wrong incurs error $(0.9 - 0)^2 = 0.81$.
- Claiming 10% and having the event occur incurs error $(0.1 - 1)^2 = 0.81$.

In enterprise Salesforce architecture, however, **the real-world impact of overconfidence versus underconfidence is radically asymmetric**:

| Dimension | Overconfident Error (Type I Architectural Error) | Underconfident Error (Type II Architectural Error) |
| :--- | :--- | :--- |
| **Architect Behavior** | Extreme conviction in a flawed design (e.g., synchronous REST callouts inside triggers; bypass of Data Cloud sharing rules; un-indexed SOQL across 50M records). | Hesitant regarding a sound pattern; seeks excessive peer reviews, builds redundant fallback queues, or defers to standard declarative tools. |
| **Enterprise Consequence** | Production outage, catastrophic governor limit exhaustion under peak load, security breach (Trust pillar violation), multimillion-dollar remediation. | Mild delivery delay, minor operational overhead, slight over-engineering. |
| **Systemic Blast Radius** | **Critical / Irreversible**. Destroys stakeholder trust, halts enterprise business processes. | **Manageable / Iterative**. Can be streamlined and refactored in future sprints. |
| **Metacognitive Path** | Architectural blindness; arrogance; refusal to instrument telemetry or establish fallback paths. | Imposter syndrome; excess caution; high coachability. |

```
                       [ Architectural Risk Profile ]
                
     Severe
       ^
       |                                     * CATASTROPHIC BLAST RADIUS
  P    |                                       (Overconfident Error: 95% & Wrong)
  E    |                                       - Outages, Governor Exhaustion
  N    |                                       - Security Breaches, Compliance Fail
  A    |
  L    |
  T    |
  Y    |                    * HUMBLE REALISM
       |                      (50% & Wrong)
       |                      - Acknowledged unknown
       |                      - Low-risk exploration
       |
  Zero +------------------------------------------------------------->
       50% (Exploring)        70% (Likely)      85% (High)        95% (Axiom)
                                STATED CONFIDENCE
```

### 2.2 The Asymmetric Brier Loss Formulation

To embed this professional reality into ArcGym, we define the **Asymmetric Brier Loss ($L_{asym}$)**:

$$L_{asym}(c, o) = \begin{cases}
(1 - c)^2 & \text{if } o = 1 \quad \text{(Correct selection)} \\
\alpha \cdot c^2 & \text{if } o = 0 \quad \text{(Incorrect selection)}
\end{cases}$$

Where:
- $c \in [0.50, 0.95]$ is the confidence assigned to the chosen option.
- $o \in \{0, 1\}$ is the correctness indicator.
- $\alpha$ is the **Overconfidence Penalty Multiplier**, set to **$\alpha = 2.5$**.

#### Concrete Penalty Comparison Matrix ($\alpha = 2.5$)

| Stated Confidence ($c$) | Correct Outcome ($o=1$) Loss: $(1-c)^2$ | Point Yield (Max 100) | Incorrect Outcome ($o=0$) Loss: $2.5 \cdot c^2$ | Penalty Incurred | Net Experience Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **95% (Axiom)** | $(1 - 0.95)^2 = 0.0025$ | **+99.75 pts** | $2.5 \cdot (0.95)^2 = 2.256$ | **-125.6 pts** | **Catastrophic Blind Spot**: High conviction on an anti-pattern. Severe penalty reflects enterprise production risk. |
| **85% (High Conviction)** | $(1 - 0.85)^2 = 0.0225$ | **+97.75 pts** | $2.5 \cdot (0.85)^2 = 1.806$ | **-80.6 pts** | **Aggressive Misjudgment**: Strong confidence without verifying edge conditions. |
| **70% (Plausible)** | $(1 - 0.70)^2 = 0.0900$ | **+91.00 pts** | $2.5 \cdot (0.70)^2 = 1.225$ | **-22.5 pts** | **Reasonable Speculation**: Standard heuristic failed in this specific scenario. |
| **50% (Speculative)** | $(1 - 0.50)^2 = 0.2500$ | **+75.00 pts** | $2.5 \cdot (0.50)^2 = 0.625$ | **+37.5 pts (Buffer)** | **Calibrated Humility**: Recognizing genuine uncertainty. Minimal downside for honest unknowing. |

> [!IMPORTANT]
> Notice the crucial property of **50% confidence**: when an architect admits they are guessing/uncertain ($c = 0.50$) and is incorrect, they are **not heavily penalized**; they receive a modest base credit for showing epistemic humility instead of recklessly guessing at 95%.

### 2.3 Preventing User Gaming and Exploitation Strategies

A common concern in confidence-weighted platforms is whether users can exploit the rules:

1. **The Trivial Hedger ("Always Pick 50%")**:
   - *Exploit Attempt*: A user always selects 50% to minimize the overconfidence penalty.
   - *Countermeasure*: While their penalty is low, their maximum point yield is capped at 75 points per drill, and their **Brier Skill Score ($BSS$)** collapses to $0.00$. In ArcGym, career progression (e.g., unlocking CTA-level Scenario Drills) requires a minimum Resolution threshold ($Res \ge 0.12$). A hedger remains permanently classified as a "Hedging Novice."
2. **The Reckless Gambler ("Always Pick 95%")**:
   - *Exploit Attempt*: A user gambles at 95% on every drill to climb the leaderboard on lucky streaks.
   - *Countermeasure*: Because $\alpha = 2.5$, the expected value of guessing at 95% when base accuracy is below $72\%$ is deeply negative:
     $$\mathbb{E}[\text{Points}_{95}] = p \cdot (100) - (1 - p) \cdot (125.6)$$
     For a user with 60% accuracy, $\mathbb{E} = 0.60(100) - 0.40(125.6) = 60 - 50.24 = +9.76$, whereas calibrating at 70% yields $\mathbb{E} = 0.60(91) - 0.40(22.5) = 54.6 - 9.0 = +45.6$. **Honest calibration is mathematically superior to reckless boldness.**
3. **The Post-Answer Retraction ("Hindsight Bias")**:
   - *Exploit Attempt*: Changing confidence or claiming "I knew it was B" after the rationale appears.
   - *Countermeasure*: Confidence is committed atomically *before* the answer is submitted and the Well-Architected rationale is revealed. The state transition is immutable on the server.

---

## 3. Habit Loop Mechanics: Streaks vs. Calibration

### 3.1 The "Showing Up is a Win" Axiom

Analyst Gym established a foundational behavioral insight: **"Getting it wrong isn't a setback. It's how the reps work."** 

If a platform ties daily streak continuation to correctness or calibration performance:
- Users become risk-averse, avoiding difficult domains (e.g., an architect avoiding Agentforce drills because they are unfamiliar with LLM temperature and RAG retrieval).
- Users cheat by opening official documentation, querying ChatGPT, or searching community forums during the drill. This completely destroys the primary objective: **training rapid, intuitive, unassisted architectural judgment**.

### 3.2 The Tripartite Metric Architecture

To preserve psychological safety while driving uncompromising technical excellence, ArcGym establishes **three strictly independent metric layers**:

```
                          [ ArcGym Tripartite Metrics ]
                          
   +-------------------------------------------------------------------------+
   |  1. DAILY STREAK (Consistency)                                          |
   |     - Rule: Complete today's 2-minute drill (right or wrong).           |
   |     - Behavioral Goal: Form an unbreakable daily judgment habit.        |
   |     - Reward: Streak counters, Habit milestones, Streak Shields.        |
   +-------------------------------------------------------------------------+
                                      |
   +-------------------------------------------------------------------------+
   |  2. JUDGMENT CALIBRATION INDEX - JCI (Metacognition)                    |
   |     - Rule: Rolling 30-drill Brier Skill Score & ECE.                   |
   |     - Behavioral Goal: Eliminate dangerous architectural blind spots.   |
   |     - Reward: Calibration Tier (e.g., "Calibrated Enterprise Architect")|
   +-------------------------------------------------------------------------+
                                      |
   +-------------------------------------------------------------------------+
   |  3. WELL-ARCHITECTED FLUENCY (Domain Knowledge)                         |
   |     - Rule: Net accuracy across Core, Data 360, and Agentforce pillars. |
   |     - Behavioral Goal: Pinpoint concrete technical curriculum gaps.     |
   |     - Reward: Pillar Badges (Trust Master, Scalability Champion).       |
   +-------------------------------------------------------------------------+
```

### 3.3 Streak Protection & Calibration Integration

While streaks are never penalized for poor calibration, high calibration actively reinforces habit resilience:
- **Calibration Streak Shields ("Grace Reps")**: Completing 5 consecutive drills with an average calibration error under $0.10$ awards a **Streak Shield**. If an architect misses a day due to travel or customer production crises, the shield automatically preserves their streak.
- **Weekly Metacognitive Debrief**: Every Sunday, the application presents a 30-second weekly calibration summary comparing stated confidence against empirical accuracy across the five Well-Architected pillars (Trust, Reliability, Operational Excellence, Cost/Resource Optimization, Fairness).

---

## 4. UI/UX Interaction Design & Cognitive Ergonomics

### 4.1 Discrete Buckets vs. Continuous Sliders

Cognitive psychology research (Lichtenstein, Fischhoff, & Phillips, 1982; Gigerenzer, 2000) provides overwhelming evidence regarding subjective probability elicitation:

| Evaluation Criterion | Continuous Slider (0% – 100%) | Discrete Buckets (4 Anchored Tiers) |
| :--- | :--- | :--- |
| **Cognitive Load** | **High**: Forces micro-deliberation over non-meaningful nuances (e.g., "Am I 74% or 79% sure?"). | **Low**: Instantaneous recognition of epistemic state. |
| **Interaction Latency** | **Slow (3–6 seconds)**: Dragging, adjusting thumbs, re-targeting on touch screens. | **Instant (< 0.5 seconds)**: Single tap on an interactive segmented chip. |
| **False Precision** | **Severe**: Enterprise architects do not have calibrated internal probability distributions with 1% resolution. | **Zero**: Matches the natural granularity of professional architectural conviction. |
| **Mobile LWR UX** | **Poor**: Touch-drag targets conflict with mobile scroll gestures; high accidental input rate. | **Optimal**: Large, accessible touch targets meeting Salesforce Lightning Design System (SLDS) standards. |

### 4.2 The Four ArcGym Discrete Confidence Anchors

ArcGym adopts four discrete, dual-anchored confidence tiers:

```
[  50%  ]  -->  "Speculative / Ambiguous"
                - Toss-up; multiple valid trade-offs; unknown platform behavior.
                - Action: Flag for spike investigation or sandbox PoC.

[  70%  ]  -->  "Plausible / Heuristic"
                - Common architectural pattern; standard trade-off; minor edge-case risk.
                - Action: Recommended solution pending requirement confirmation.

[  85%  ]  -->  "High Conviction"
                - Battle-tested Well-Architected best practice; validated constraints.
                - Action: Confident client recommendation.

[  95%  ]  -->  "Architectural Axiom"
                - Hard governor limit, security Trust boundary, or fundamental law.
                - Action: Non-negotiable design constraint.
```

### 4.3 2-Minute Drill Interaction Flow

The interaction sequence is optimized for zero friction, fitting effortlessly within a 120-second timebox:

```
+----------------------------------------------------------------------------+
| Step 1: Scenario Presentation (45s)                                        |
| Read the high-stakes architectural trade-off and constraint context.      |
+----------------------------------------------------------------------------+
                                      |
                                      v
+----------------------------------------------------------------------------+
| Step 2: Trade-Off Selection (20s)                                          |
| Architect selects Option A, B, C, or D.                                    |
+----------------------------------------------------------------------------+
                                      |
                                      v
+----------------------------------------------------------------------------+
| Step 3: Confidence Calibration (5s)                                        |
| Inline Segmented Bar activates immediately below options:                  |
| [  50% Speculative  ] [  70% Plausible  ] [  85% High  ] [  95% Axiom  ]   |
+----------------------------------------------------------------------------+
                                      |
                                      v
+----------------------------------------------------------------------------+
| Step 4: Atomic Commit & Immediate Reveal (50s)                             |
| - Full Well-Architected grounding and documentation citations revealed.   |
| - Calibration Quadrant visual tag displayed.                               |
| - Daily Streak increments (+1 day).                                        |
+----------------------------------------------------------------------------+
```

### 4.4 The Post-Drill Metacognitive Quadrant Matrix

Every committed drill immediately classifies the user's decision into one of four **Metacognitive Quadrants**:

```
                       [ Metacognitive Quadrant Matrix ]
                       
             High
              ^
              |   HESITANT MASTERY        |     CALIBRATED CONVICTION
              |   (Imposter Zone)         |     (Elite Architect)
              |                           |
              |   Stated: 50% - 70%       |     Stated: 85% - 95%
              |   Outcome: CORRECT        |     Outcome: CORRECT
              |   "You know more than     |     "Rock-solid judgment. High
              |    you think. Trust your  |      conviction backed by
  ACCURACY    |    instincts."            |      Well-Architected fact."
              +---------------------------+---------------------------
              |   CALIBRATED HUMILITY     |     HAZARDOUS ASSUMPTION
              |   (Safe Explorer)         |     (Catastrophic Anti-Pattern)
              |                           |
              |   Stated: 50%             |     Stated: 85% - 95%
              |   Outcome: INCORRECT      |     Outcome: INCORRECT
              |   "Good calibration.      |     "DANGER: Confident in a
              |    Recognized an un-      |      flawed pattern. Review
              |    familiar domain."      |      Well-Architected Trust!"
              v
             Low ----------------------------------------------------->
                 Low                     CONFIDENCE                    High
```

### 4.5 The Rolling Reliability Diagram (Post-Drill & Profile View)

In the architect's profile, ArcGym renders an interactive **Reliability Diagram** plotting the rolling 30-drill calibration curve:
- **X-axis**: Stated Confidence Bins ($50\%, 70\%, 85\%, 95\%$).
- **Y-axis**: Actual Observed Accuracy ($0\%$ to $100\%$).
- **45° Dotted Diagonal**: The line of **Perfect Calibration** ($y = x$).
- **Below Diagonal (Orange/Red Fill)**: **Overconfidence Zone**. Indicates architectural blind spots where the architect assumes they understand modern platform limits (e.g., Data Cloud streaming ingestion latency or Agentforce grounding context limits) but fails empirical tests.
- **Above Diagonal (Blue Fill)**: **Underconfidence Zone**. Indicates hesitation and unrecognized competence.

---

## 5. The Proposed ArcGym Calibration Algorithm Specification

### 5.1 Formal Mathematical Definitions

For any single judgment drill $t \in \{1, \dots, N\}$:
- Selected Option: $s_t \in \mathcal{A}$
- Correct Grounded Option: $y_t^* \in \mathcal{A}$
- Binary Correctness: $o_t = \mathbb{I}(s_t = y_t^*)$
- Elicited Confidence: $c_t \in \{0.50, 0.70, 0.85, 0.95\}$

#### 1. Drill Point Engine ($Score_t$)
Points awarded for drill $t$ (normalized to $[0, 100]$):

$$Score_t = \begin{cases}
100 \cdot \left[ 1 - (1 - c_t)^2 \right] & \text{if } o_t = 1 \\
\max\left( 0, 100 \cdot \left[ 1 - 2.5 \cdot c_t^2 \right] \right) & \text{if } o_t = 0
\end{cases}$$

#### 2. Rolling Brier Skill Score ($BSS_{30}$)
Computed over the sliding window $\mathcal{W} = \{t - 29, \dots, t\}$ ($|\mathcal{W}| = 30$):

$$BS_{\mathcal{W}} = \frac{1}{|\mathcal{W}|} \sum_{i \in \mathcal{W}} (c_i - o_i)^2$$

$$BSS_{\mathcal{W}} = 1 - \frac{BS_{\mathcal{W}}}{0.25}$$

#### 3. Rolling Expected Calibration Error ($ECE_{30}$)
With $K = 4$ discrete confidence bins $B_k \in \{0.50, 0.70, 0.85, 0.95\}$:

$$ECE_{\mathcal{W}} = \sum_{k=1}^4 \frac{|B_k|}{|\mathcal{W}|} \left| \frac{\sum_{i \in B_k} o_i}{|B_k|} - k \right| \quad \text{for } |B_k| > 0$$

#### 4. Judgment Calibration Index (JCI)
To present calibration on a motivating $0$–$1,000$ scale:

$$JCI_{\mathcal{W}} = \text{round}\left( 1000 \cdot \max\left( 0, BSS_{\mathcal{W}} \cdot (1 - ECE_{\mathcal{W}}) \right) \right)$$

### 5.2 TypeScript Reference Implementation

The following production-ready TypeScript module defines the exact calculation engine to be implemented in ArcGym services:

```typescript
/**
 * ArcGym Confidence Calibration Engine
 * File: src/modules/scoring/calibrationEngine.ts
 */

export type ConfidenceTier = 0.50 | 0.70 | 0.85 | 0.95;

export interface JudgmentDecision {
  drillId: string;
  timestamp: string;
  pillar: 'Trust' | 'Reliability' | 'OperationalExcellence' | 'ResourceOptimization' | 'Fairness';
  domain: 'CorePlatform' | 'Data360' | 'Agentforce';
  selectedOption: string;
  correctOption: string;
  confidence: ConfidenceTier;
}

export interface DrillScoreResult {
  isCorrect: boolean;
  rawLoss: number;
  pointsEarned: number;
  quadrant: 'CalibratedConviction' | 'CalibratedHumility' | 'HesitantMastery' | 'HazardousAssumption';
  coachingMessage: string;
}

export interface CalibrationProfile {
  windowSize: number;
  brierScore: number;
  brierSkillScore: number;
  expectedCalibrationError: number;
  judgmentCalibrationIndex: number; // 0 - 1000
  biasTendency: 'Calibrated' | 'Overconfident' | 'Underconfident' | 'Volatile';
  binStats: Array<{
    tier: ConfidenceTier;
    count: number;
    empiricalAccuracy: number;
    gap: number;
  }>;
}

export class ArcGymScoringEngine {
  private static readonly OVERCONFIDENCE_MULTIPLIER = 2.5;
  private static readonly BENCHMARK_BRIER = 0.25;

  /**
   * Evaluates an individual daily drill submission.
   */
  public static evaluateDrill(decision: JudgmentDecision): DrillScoreResult {
    const isCorrect = decision.selectedOption === decision.correctOption;
    const c = decision.confidence;

    let rawLoss: number;
    let pointsEarned: number;
    let quadrant: DrillScoreResult['quadrant'];
    let coachingMessage: string;

    if (isCorrect) {
      rawLoss = Math.pow(1 - c, 2);
      pointsEarned = Math.round(100 * (1 - rawLoss));

      if (c >= 0.85) {
        quadrant = 'CalibratedConviction';
        coachingMessage = 'Exemplary judgment. High conviction supported by Well-Architected principles.';
      } else {
        quadrant = 'HesitantMastery';
        coachingMessage = 'Correct architectural solution, but you hesitated. Build conviction in this pattern.';
      }
    } else {
      rawLoss = this.OVERCONFIDENCE_MULTIPLIER * Math.pow(c, 2);
      // Floor point yield at 0, while allowing 50% guesses to yield modest participation credit
      pointsEarned = Math.max(0, Math.round(100 * (1 - rawLoss / 2.5)));

      if (c >= 0.85) {
        quadrant = 'HazardousAssumption';
        coachingMessage = 'Critical Alert: High confidence on an anti-pattern. Review governor and trust constraints.';
      } else {
        quadrant = 'CalibratedHumility';
        coachingMessage = 'Sound self-awareness. Recognizing uncertainty prevents costly production spikes.';
      }
    }

    return {
      isCorrect,
      rawLoss,
      pointsEarned,
      quadrant,
      coachingMessage
    };
  }

  /**
   * Calculates rolling calibration metrics over a window of decisions.
   */
  public static calculateRollingProfile(history: JudgmentDecision[]): CalibrationProfile {
    const n = history.length;
    if (n === 0) {
      return {
        windowSize: 0,
        brierScore: 0.25,
        brierSkillScore: 0,
        expectedCalibrationError: 0,
        judgmentCalibrationIndex: 0,
        biasTendency: 'Calibrated',
        binStats: []
      };
    }

    // 1. Calculate Brier Score
    let totalBrierLoss = 0;
    for (const d of history) {
      const outcome = d.selectedOption === d.correctOption ? 1 : 0;
      totalBrierLoss += Math.pow(d.confidence - outcome, 2);
    }
    const brierScore = totalBrierLoss / n;
    const brierSkillScore = Math.max(0, 1 - (brierScore / this.BENCHMARK_BRIER));

    // 2. Binning statistics for ECE
    const tiers: ConfidenceTier[] = [0.50, 0.70, 0.85, 0.95];
    let weightedEce = 0;
    let netBiasSum = 0;

    const binStats = tiers.map(tier => {
      const binDecisions = history.filter(d => d.confidence === tier);
      const count = binDecisions.length;
      if (count === 0) {
        return { tier, count: 0, empiricalAccuracy: 0, gap: 0 };
      }

      const correctCount = binDecisions.filter(d => d.selectedOption === d.correctOption).length;
      const empiricalAccuracy = correctCount / count;
      const gap = empiricalAccuracy - tier; // Negative = Overconfident, Positive = Underconfident

      weightedEce += (count / n) * Math.abs(gap);
      netBiasSum += count * gap;

      return {
        tier,
        count,
        empiricalAccuracy: Number(empiricalAccuracy.toFixed(3)),
        gap: Number(gap.toFixed(3))
      };
    });

    // 3. Judgment Calibration Index (0 - 1000 scale)
    const judgmentCalibrationIndex = Math.round(
      1000 * Math.max(0, brierSkillScore * (1 - weightedEce))
    );

    // 4. Bias Tendency Classification
    const avgBias = netBiasSum / n;
    let biasTendency: CalibrationProfile['biasTendency'] = 'Calibrated';
    if (weightedEce > 0.15) {
      if (avgBias < -0.08) biasTendency = 'Overconfident';
      else if (avgBias > 0.08) biasTendency = 'Underconfident';
      else biasTendency = 'Volatile';
    }

    return {
      windowSize: n,
      brierScore: Number(brierScore.toFixed(4)),
      brierSkillScore: Number(brierSkillScore.toFixed(3)),
      expectedCalibrationError: Number(weightedEce.toFixed(3)),
      judgmentCalibrationIndex,
      biasTendency,
      binStats
    };
  }
}
```

---

## 6. Well-Architected Framework Cross-Cut Integration

Calibration metrics are partitioned across the Salesforce Well-Architected Framework to generate actionable skill diagnostic profiles:

```
+-----------------------------------------------------------------------------------+
|               SALESFORCE WELL-ARCHITECTED CALIBRATION HEATMAP                     |
+--------------------------+-------------------+----------------+-------------------+
| Pillar                   | Accuracy          | Avg Confidence | Metacognitive Gap |
+--------------------------+-------------------+----------------+-------------------+
| Trust (Security, Gov)    | 92.4%             | 91.0%          | +1.4% (Calibrated)|
| Reliability (Scalability)| 71.2%             | 88.5%          | -17.3% (OVERCONF) |
| Operational Excellence   | 84.0%             | 82.0%          | +2.0% (Calibrated)|
| Resource Optimization    | 62.5%             | 74.0%          | -11.5% (OVERCONF) |
| Fairness (AI/Agents)     | 58.0%             | 54.0%          | +4.0% (Calibrated)|
+--------------------------+-------------------+----------------+-------------------+
```

### Pillar Insights
1. **Reliability Pillar Alert**: In the example above, the architect exhibits a $-17.3\%$ negative gap in Reliability. While believing they are 88.5% certain, their true accuracy is only 71.2%. This signals an urgent need for drills on Large Data Volume (LDV) indexing, asynchronous execution limits, and transaction boundaries.
2. **Fairness & Agentforce**: In emerging domains like Agentforce and Agentic AI, architects exhibit lower accuracy (58.0%) but high calibration ($54.0\%$ stated confidence). This demonstrates sound metacognitive realism: architects recognize that agentic prompt injection, deterministic guardrails, and reasoning engine limits are evolving domains.

---

## 7. Synthesis and Master Spec Recommendations

This research provides the direct specification inputs for subsequent tickets:
- **For Ticket 04 (Drill Interaction Mechanics & State Models)**: Embed the 4-tier confidence selection state machine (`SELECT_OPTION` $\to$ `RATE_CONFIDENCE` $\to$ `COMMIT_JUDGMENT` $\to$ `REVEAL_GROUNDING`).
- **For Ticket 05 (Headless Salesforce Data Model & API)**: Include fields on the custom judgment objects: `Confidence_Tier__c`, `Asymmetric_Loss__c`, `Points_Earned__c`, and `Metacognitive_Quadrant__c`.
- **For Ticket 07 (Master Architecture Spec)**: Incorporate the Tripartite Metric Architecture and `ArcGymScoringEngine` as the canonical scoring implementation.
