# ArcGym (Architect Gym): Technical & Experience Architecture Specification

> **Version:** 1.0.0  
> **Status:** Approved Architecture Specification  
> **Canonical Location:** `.scratch/arcgym/spec.md`  
> **Foundational Grounding:** [Salesforce Well-Architected Framework](https://architect.salesforce.com/) & [Analyst Gym](https://analystgym.com)

---

## 1. Executive Summary & Vision

### 1.1 The Problem
Generative AI tools (e.g. Agentforce, Claude, ChatGPT, GitHub Copilot) write Apex triggers, draft SOQL queries, and generate Flow definitions in seconds. However, **enterprise architectural judgment remains the non-delegable responsibility of human architects**:
- Knowing *when not* to use an Apex trigger.
- Recognizing when a shiny streaming ingestion architecture will bankrupt an organization in Data Cloud credits.
- Understanding the catastrophic security blast radius of an ungrounded autonomous agent accessing unmasked PII.
- Navigating the political pressure from business stakeholders demanding rapid workarounds that introduce irreversible technical debt.

### 1.2 The Solution
**ArcGym** is a daily, 2-minute judgment practice platform built specifically for Salesforce Architects. Modeled after the cognitive and habit-forming mechanics of [Analyst Gym](https://analystgym.com), ArcGym adapts high-stakes decision drills across **Core Platform**, **Data 360**, and **Agentforce**, directly grounded in the official documentation, patterns, and decision guides of [`architect.salesforce.com`](https://architect.salesforce.com/).

### 1.3 Key Architectural Differentiators
1. **Dog-Fooding without Cloud Bills**: A hybrid "Headless Salesforce" architecture combining an ultra-fast, free edge frontend (Salesforce Open-Source Lightning Web Runtime on Cloudflare Pages) with a permanent free Salesforce Developer Edition org serving as the headless System of Record.
2. **Dual-Surface Delivery**: The exact same drill components run on the public web and inside an installable Salesforce **Utility Bar LWC**, letting architects practice directly within their work orgs.
3. **Epistemic Calibration**: An Asymmetric Brier Skill Score ($BSS_{asym}$) with a $2.5\times$ overconfidence penalty that penalizes reckless architectural assumptions while rewarding calibrated humility.
4. **Universal Pre-Submit Gate**: A uniform 4-chip SLDS confidence selector (`50% Speculative`, `70% Plausible`, `85% High Conviction`, `95% Architectural Axiom`) enforced before any architectural commitment.
5. **Zero-API Edge Distribution**: Salesforce Content Approval triggers an event-driven webhook that pushes drills to Cloudflare Workers KV, delivering sub-10ms global loads with **zero runtime API consumption** against the Salesforce Dev Org.

---

## 2. Domain Curriculum & Well-Architected Grounding

### 2.1 The Balanced Triad (1:1:1 Curriculum Weighting)
ArcGym rotates evenly through three core technical domains, cross-cut by the **5 Well-Architected Pillars**:

```
                       ┌──────────────────────────────┐
                       │   WELL-ARCHITECTED PILLARS   │
                       │   • Trust                    │
                       │   • Reliability              │
                       │   • Operational Excellence   │
                       │   • Cost & Resource Opt.     │
                       │   • Fairness                 │
                       └──────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
  ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
  │     CORE PLATFORM     │ │     DATA 360      │ │      AGENTFORCE       │
  │ • Automation Guide    │ │ • Lakehouse/DMOs  │ │ • ADLC Methodology    │
  │ • LDV & Skew Patterns │ │ • Identity Resol. │ │ • Atlas Engine Graphs │
  │ • Security & Sharing  │ │ • Zero Copy Fed.  │ │ • Trust Layer Defense │
  │ • Enterprise Integr.  │ │ • Data Actions    │ │ • Multi-Agent Routing │
  └───────────────────────┘ └───────────────────┘ └───────────────────────┘
```

### 2.2 The 19 Core Curriculum Domains
1. **Core Platform: Automation Decision Guide** (Before-Save Flow vs. After-Save Flow vs. Apex Triggers vs. Invocable Actions).
2. **Core Platform: Large Data Volumes (LDV) & Indexing** (Standard/Custom index selectivity thresholds, skinny tables, formula determinism).
3. **Core Platform: Data Skew Avoidance** (Ownership skew >10k, Lookup skew >10k, parent locking, sharing recalc freezes).
4. **Core Platform: Record-Level Security & Sharing Architecture** (OWD, implicit sharing, Restriction Rules vs. Scoping Rules, Grant maps).
5. **Core Platform: Asynchronous Processing & Governor Safeguards** (Queueable vs. Batch vs. Scheduled Apex, transaction finalizers, flex queues).
6. **Core Platform: Enterprise Integration Patterns** (Request-Reply, Fire-and-Forget, Named Credentials v2, Pub/Sub API gRPC replay).
7. **Core Platform: Encryption & Telemetry Governance** (Shield Platform Encryption deterministic vs. probabilistic, Event Monitoring, Audit Trail).
8. **Data 360: Lakehouse Architecture & Storage Tiering** (Apache Iceberg metadata, Parquet storage, Low Latency Store NVMe, Data Spaces).
9. **Data 360: Ingestion & Canonical DMO Modeling** (DLO/UDLO to DMO mapping, Cloud Information Model CIM, Party & Engagement models).
10. **Data 360: Identity Resolution & Clustering** (Blocking keys, exact/fuzzy matching, reconciliation rules: Most Recent vs. Source Priority).
11. **Data 360: Calculated Insights & Streaming Transforms** (Real-time vs. batch aggregations, dimensional segmentation, stateful windowing).
12. **Data 360: Zero Copy Inbound Federation & Outbound Sharing** (Snowflake, BigQuery, Databricks, Redshift Iceberg sharing, DaaS APIs).
13. **Data 360: Data Actions & Event-Driven Activation** (Storage Native Change Events SNCE, Platform Events, Webhooks, CRM automation).
14. **Agentforce: Agent Development Lifecycle (ADLC)** (Ideation ➔ Development Inner Loop ➔ Testing Center ➔ Explicit Activation ➔ STDM Tuning).
15. **Agentforce: Atlas Reasoning Engine Architecture** (Deterministic state machines vs. probabilistic LLM routing, plan decomposition).
16. **Agentforce: Topic, Action & Guardrail Hygiene** (Boundary instructions, parameter sanitation, human escalation gates).
17. **Agentforce: Einstein Trust Layer Security** (Prompt Defense, PII/PHI masking, zero data retention agreements, toxicity scoring).
18. **Agentforce: Multi-Agent Topology & A2A Routing** (SOMA single org, MOMA multi-org via Data Cloud One, Model Context Protocol MCP).
19. **Agentforce: Agentic Archetypes** (Greeter, Operator, Orchestrator/Swarm, Workspace Radar, Zen Data Gardener, Judge & Jury).

### 2.3 The 19 Canonical Antipatterns
Drills explicitly condition distractors on these real-world architectural failure modes:
1. *Process Frankenstein*: Layering multiple Record-Triggered Flows and Apex triggers on the same object without deterministic re-entrancy control.
2. *The God Account*: Assigning >10,000 child records to a single parent account, triggering constant `UNABLE_TO_LOCK_ROW` errors.
3. *Scoping Rules as Security*: Misusing UI-level Scoping Rules instead of Restriction Rules to enforce data access compliance.
4. *Formula Filter Degradation*: Filtering on non-deterministic formulas across 5M+ rows, forcing unindexed full-table scans.
5. *Chained Queueable Infinite Recursion*: Chaining queueables without transaction finalizers or max-depth guards, exhausting daily limits.
6. *Direct Point-to-Point Spaghetti*: Hardcoding REST callouts in synchronous trigger contexts without retry queues.
7. *Streaming Everything*: Defaulting to real-time Data Cloud streaming for high-latency batch analytics, exhausting consumption credits.
8. *Fuzzy Over-Clustering*: Setting lax fuzzy matching thresholds on first name and postal code, accidentally merging distinct customer profiles.
9. *DLO-as-DMO Bypass*: Querying raw unmapped DLOs directly in CRM applications, breaking unified data governance.
10. *Direct-to-Prod Prompting*: Modifying agent system instructions directly in production without running the Agent Testing Center suite.
11. *Trust Layer Bypass*: Making direct Apex callouts to third-party LLM endpoints, violating corporate zero-data-retention compliance.
12. *Tool Sprawl / Hallucinated Action Invocation*: Over-equipping an agent with 50+ actions under a single topic, degrading Atlas plan reasoning.
13. *Unbounded Agent Autonomy*: Allowing an agent to execute financial DML transactions without human-in-the-loop Omni-Channel verification.
14. *Synchronous Callout Blocking*: Blocking UI threads on external REST calls instead of using continuation or Platform Events.
15. *Single-Key Identity Trap*: Relying solely on email as an identity match key, fracturing records when emails change.
16. *Data Space Boundary Leak*: Failing to logically isolate multi-brand customer profiles within distinct Data Spaces.
17. *Un-Replayed Platform Events*: Publishing non-persistent platform events for critical financial ledger transactions.
18. *Over-Privileged Connected App*: Granting `full` OAuth scope to an edge proxy instead of least-privilege scoped permissions.
19. *The Technical Debt Surrender*: Conceding to business delivery deadlines by skipping bulkification and unit test mocking.

---

## 3. Product Experience & Drill Mechanics

### 3.1 Daily Habit Architecture
- **2-Minute Target**: Every drill is strictly designed for completion within 120 seconds on desktop or mobile.
- **"Showing Up is a Win"**: Daily Streaks increment unconditionally upon completing the drill (regardless of score). This eliminates the perverse incentive to look up answers or cheat.
- **Streak Shields**: Consistent high calibration earns "Grace Reps" to prevent streak loss during travel or outages.

### 3.2 Universal Pre-Submit Gate
Every atomic submission across all four formats requires passing the Universal Pre-Submit Gate. The submit button remains disabled until one of the four discrete SLDS confidence chips is selected:

| Confidence Anchor | Epistemic Meaning | Architectural Context | Score Multiplier ($w$) |
| :--- | :--- | :--- | :--- |
| **50% Speculative** | Toss-up / Exploration | "I have an intuition, but I would prototype or test in sandbox before committing." | Low risk, safe base yield |
| **70% Plausible** | Heuristic Pattern | "This follows standard Salesforce design patterns in most scenarios." | Standard reward/penalty |
| **85% High Conviction** | Well-Architected Standard | "This is documented best practice in official Salesforce Decision Guides." | High reward, strong penalty |
| **95% Architectural Axiom** | Hard Platform Limit / Law | "Violating this causes a governor limit exception or compliance data breach." | Maximum reward, $2.5\times$ overconfidence penalty |

### 3.3 The Four Drill Formats

#### A. Lesson Format (Architectural Refactor & Forensic Walkthrough)
- **Time**: ~90–120 seconds.
- **Mental Faculty**: Procedural patience, forensic diagnosis, and phased migration.
- **Flow**:
  1. *Stage 1: Forensic Diagnosis*: User reviews a flawed architecture diagram or code/Flow snippet. Identifies the root bottleneck (e.g. lookup skew, unindexed formula). Selects confidence ➔ Submits.
  2. *Stage 2: Target Pattern Selection*: User selects the optimal Well-Architected target state. Selects confidence ➔ Submits.
  3. *Stage 3: Governance & Migration Sequence*: User selects the safest deployment and rollback plan with zero downtime. Selects confidence ➔ Submits.
  4. *Stage 4: Post-Refactor Verification*: User identifies the exact Event Monitoring or Session Tracing telemetry to monitor in production. Selects confidence ➔ Submits.
- **In-Flight Coaching**: If a sub-optimal choice is selected, an inline coach note explains the flaw immediately before the user re-attempts.
- **Roadmap (v2)**: Interactive Architecture Diagram Builder (connecting nodes to fix data flow).

#### B. Rapid Fire Format (High-Velocity Pattern Recognition)
- **Time**: ~60–90 seconds.
- **Mental Faculty**: Fast intuitive pattern matching across Salesforce Decision Guides.
- **Flow**:
  - 6 to 8 focused calls in sequence.
  - Each call consists of 1–2 constraint sentences and 2–3 mutually exclusive options (e.g. *Platform Events vs. CDC vs. Pub/Sub API*).
  - Single-tap confidence selection docked directly above the submit button.
  - On submit: Instant green/red reveal with a 1-sentence Well-Architected rationale and link to `architect.salesforce.com`.
  - Automatic 300ms transition to the next call.

#### C. Currency Format (Architect Budget Allocation)
- **Time**: ~90–120 seconds.
- **Mental Faculty**: Resource discipline and trade-off optimization under hard platform constraints.
- **Budget Denominations**: Dynamically adapts to the problem domain:
  - *Core Platform*: Governor Capacity (e.g., 100 SOQL queries, 50,000 DML rows, 10,000ms CPU).
  - *Data 360*: Consumption Credits (Data Cloud processing units, query row limits, streaming credits).
  - *Agentforce*: Token / Context Window & Reasoning Step budget.
  - *Cross-Cutting*: Technical Debt / Complexity Points (100-point ceiling).
- **Flow**:
  - Sticky gauge displays remaining budget vs. target SLA/throughput.
  - User toggles architectural components (e.g. "Add Custom Index: -20 pts", "Zero Copy Inbound Federation: -50 pts", "Batch ETL Sync: -30 pts").
  - Submit button disables if budget < 0.
  - User passes Universal Pre-Submit Gate and commits the package.

#### D. Scenario Format (Stakeholder Politics & Technical Debt)
- **Time**: ~90–120 seconds.
- **Mental Faculty**: Navigating political trade-offs and non-functional requirements across C-suite personas.
- **Scoring Engine**: **Dual-Meter Tracking**:
  - *Stakeholder Trust (0–100)*: Measures executive alignment and business delivery satisfaction.
  - *Well-Architected Integrity (0–100)*: Measures adherence to Trust, Reliability, and Scalability.
- **Flow**:
  - 3 sequential moves with an executive persona (e.g. CISO, CFO, VP Sales, Dev Lead).
  - *Move 1 (Initial Demand)*: Stakeholder pushes for an aggressive shortcut (e.g. bypassing the Trust Layer). User chooses a stance ➔ Confidence Gate ➔ Meters adjust.
  - *Move 2 (Complication)*: Stakeholder reacts to the stance; new constraint introduced. User adapts ➔ Confidence Gate ➔ Meters adjust.
  - *Move 3 (High-Stakes Settlement)*: Final architectural compromise committed.
  - *Post-Scenario Debrief*: "Technical Debt Hangover" card displays the 1-year maintenance impact of any integrity drops below 70.

---

## 4. Metacognitive Calibration & Scoring Engine

### 4.1 Asymmetric Brier Skill Score ($BSS_{asym}$)
To reflect the severe real-world cost of high-confidence architectural failures, ArcGym implements an asymmetric quadratic scoring rule:

$$\text{Loss}(p, y) = \begin{cases} (1 - p)^2 & \text{if } y = 1 \text{ (Correct)} \\ \alpha \cdot p^2 & \text{if } y = 0 \text{ (Incorrect, Overconfident)} \end{cases}$$

Where:
- $p \in \{0.50, 0.70, 0.85, 0.95\}$ is the stated confidence.
- $y \in \{0, 1\}$ is empirical correctness.
- $\alpha = 2.5$ is the **Overconfidence Penalty Multiplier**.

### 4.2 Point Yield Matrix
Points awarded per decision ($100 \times [1 - \text{Loss}]$):

| Confidence Level | Stated $p$ | Correct ($y=1$) | Incorrect ($y=0$) | Expected Yield @ 50% Accuracy | Expected Yield @ 80% Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Speculative** | $0.50$ | $+75.0\text{ pts}$ | $+37.5\text{ pts}$ | $+56.3\text{ pts}$ | $+67.5\text{ pts}$ |
| **Plausible** | $0.70$ | $+91.0\text{ pts}$ | $-22.5\text{ pts}$ | $+34.3\text{ pts}$ | $+68.3\text{ pts}$ |
| **High Conviction** | $0.85$ | $+97.8\text{ pts}$ | $-80.6\text{ pts}$ | $+8.6\text{ pts}$ | $+62.1\text{ pts}$ |
| **Architectural Axiom** | $0.95$ | $+99.8\text{ pts}$ | $-125.6\text{ pts}$ | $-12.9\text{ pts}$ | $+54.7\text{ pts}$ |

*Key Incentive:* Gambling with 95% confidence on uncertain architectures yields heavily negative expected points unless accuracy exceeds $72\%$. Acknowledging uncertainty at 50% yields safe positive points even when wrong.

### 4.3 Longitudinal Calibration Metrics
- **Expected Calibration Error ($ECE_{30}$)**: Calculated over a rolling 30-drill window:
  $$ECE = \sum_{m=1}^{M} \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$
- **Judgment Calibration Index ($JCI_{30}$)**: Normalized $0$–$1,000$ rating:
  $$JCI = \max\left(0, \min\left(1000, 1000 \cdot (1 - 2.5 \cdot ECE)\right)\right)$$
- **Metacognitive Quadrants**:
  1. *Calibrated Conviction* (Green): High Confidence, Correct.
  2. *Calibrated Humility* (Blue): Low Confidence, Incorrect (Safely hedged).
  3. *Hesitant Mastery* (Yellow): Low Confidence, Correct (Room for bolder leadership).
  4. *Hazardous Assumption* (Red): High Confidence, Incorrect (Critical architectural risk).

---

## 5. Headless Salesforce Data Model & API Architecture

### 5.1 Mitigation of Developer Edition 5 MB Limit
To operate permanently within a free Salesforce Developer Edition org without risk of storage exhaustion, ArcGym employs the **Hybrid Document Pattern**: relational headers for querying, embedded JSON document store for complex state.

```
┌────────────────────────────────────────────────────────┐
│             SALESFORCE DEVELOPER EDITION               │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ArcGym_Drill__c (Catalog & Governance)           │  │
│  │ • Title__c, Format__c, Domain__c, Status__c      │  │
│  │ • Scheduled_Date__c, Difficulty_Tier__c          │  │
│  │ • Definition_JSON__c (131k chars Document Store) │  │
│  └─────────────────────────┬────────────────────────┘  │
│                            │ Flow Outbound Webhook     │
│                            ▼ (On Status = Approved)    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ArcGym_Daily_Aggregate__c (Global Rollups)       │  │
│  │ • Total_Completions__c, Average_Accuracy__c      │  │
│  │ • Average_Brier_Score__c, Calibrated_Count__c    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────┘
                             │ HTTPS Push (HMAC Signed)
                             ▼
┌────────────────────────────────────────────────────────┐
│                   CLOUDFLARE EDGE                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Pages Function (/api/webhooks/publish-drill)     │  │
│  └─────────────────────────┬────────────────────────┘  │
│                            │ Write                           │
│                            ▼                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Workers KV (DRILL_KV - Global Replicated Cache)  │  │
│  └─────────────────────────┬────────────────────────┘  │
│                            │ Read (<10ms, 0 SF APIs)   │
│                            ▼                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Cloudflare D1 (User Profiles, Streaks, Attempts) │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 5.2 Custom Object Definitions

#### `ArcGym_Drill__c`
| Field API Name | Data Type | Properties | Description |
| :--- | :--- | :--- | :--- |
| `Title__c` | Text(255) | External ID, Required | Name of the drill scenario |
| `Format__c` | Picklist | Required | `Lesson`, `Rapid_Fire`, `Currency`, `Scenario` |
| `Curriculum_Domain__c`| Picklist | Required | 19 domains (e.g. `Data360_Identity_Resolution`) |
| `Difficulty_Tier__c` | Picklist | Required | `Associate_Domain_Architect`, `Lead_CTA` |
| `Status__c` | Picklist | Default: `Draft` | `Draft`, `In_Review`, `Approved`, `Archived` |
| `Scheduled_Date__c` | Date | Indexed | Date assigned for daily community rotation |
| `Pillars__c` | Multipicklist | Required | `Trust`, `Reliability`, `Operational_Excellence`, etc. |
| `Version__c` | Number(4,0) | Default: 1 | Schema version number |
| `Definition_JSON__c` | LongTextArea(131072) | Required | Serialized steps, options, distractor logic, URLs |

#### `ArcGym_Daily_Aggregate__c`
Tracks global community performance without storing individual public attempt records:
- `Drill__c` (Master-Detail to `ArcGym_Drill__c`)
- `Date__c` (Date)
- `Total_Completions__c` (Number)
- `Average_Accuracy__c` (Percent)
- `Average_Brier_Score__c` (Number 4,4)
- `Overconfidence_Count__c` (Number)
- `Calibrated_Count__c` (Number)

#### `ArcGym_Attempt__c` (In-Org Package Only)
Installed into an architect's own private org (never stored in the public Dev Org):
- `Drill_ID__c` (Text 80)
- `User__c` (Lookup to `User`)
- `Completed_At__c` (DateTime)
- `Score__c` (Number)
- `Asymmetric_Brier_Score__c` (Number 4,4)
- `Responses_JSON__c` (Long Text Area)
- `Streak_Count_At_Attempt__c` (Number)

### 5.3 Event-Driven Static Webhook Architecture
1. **Approval**: An admin updates `Status__c` to `Approved` on `ArcGym_Drill__c`.
2. **Salesforce Flow**: Fires an outbound callout via an Apex Invocable action (`ArcGym_WebhookPublisher.publish()`).
3. **Payload**: JSON containing the full `Definition_JSON__c` signed with an HMAC-SHA256 signature in the `X-ArcGym-Signature` header.
4. **Cloudflare Worker**: `/api/webhooks/publish-drill` validates the signature and saves the payload into Cloudflare Workers KV:
   ```typescript
   await env.DRILL_KV.put(`drill:${scheduledDate}`, JSON.stringify(drillPayload));
   await env.DRILL_KV.put("drill:today", JSON.stringify(drillPayload));
   ```
5. **Runtime**: Thousands of architects load ArcGym from Cloudflare Pages. The app reads from KV in <10ms with **0 live API calls against Salesforce**.

### 5.4 Identity & Cross-Surface Synchronization
- **Anonymous Default**: Web app users store progress in browser IndexedDB + anonymous Cloudflare D1 UUID.
- **Optional Trailblazer OAuth**: Clicking "Connect Salesforce / Trailblazer Account" initiates an OAuth 2.0 OpenID Connect flow against Salesforce. The D1 account record links to the Salesforce `user_id`, enabling multi-device streak sync.

---

## 6. Frontend & Dual-Surface Packaging Architecture

### 6.1 Open-Source Lightning Web Runtime (LWR) on Cloudflare Pages
- Built with Salesforce's official `@lwrjs/core` compiler.
- Compiles into a static single-page application in `site/` with synthetic shadow DOM (`syntheticShadow: true`) to allow full SLDS 2 CSS styling hooks across components.
- Deployed directly to **Cloudflare Pages** for global distribution and sub-50ms TTFB.

### 6.2 Dual-Surface Container-Presenter Abstraction
All core drill UI components live in a shared package (`packages/drill-ui`) completely isolated from `@salesforce/*` dependencies. They interact purely via `@api` properties and standard `CustomEvent` instances:

```
┌────────────────────────────────────────────────────────┐
│       SHARED PRESENTATIONAL LWCs (packages/drill-ui)   │
│                                                        │
│  • c-drill-container        • c-confidence-gate        │
│  • c-lesson-stepper         • c-budget-meter           │
│  • c-rapid-fire-card        • c-dual-meter-scenario    │
│  • c-calibration-quadrant   • c-debrief-modal          │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
       Pure UI (Zero SF APIs)     Pure UI (Zero SF APIs)
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  WEB HOST (apps/arcgym-lwr)  │ │ IN-ORG HOST (apps/arcgym-sfdx│
│                              │ │                              │
│ • Runs in Cloudflare LWR     │ │ • Runs in Salesforce Utility │
│ • fetch() to Pages Functions │ │ • @wire(getTodayDrill) Apex  │
│ • LocalStorage / D1 storage  │ │ • Apex recordAttempt() DML   │
│ • Mobile browser responsive  │ │ • Docked 480x640px in CRM    │
└──────────────────────────────┘ └──────────────────────────────┘
```

### 6.3 In-Org Utility Bar Component (`c-arcgym-utility-bar`)
- Target: `lightning__UtilityBar` and `lightning__HomePage`.
- Docked panel dimensions: 480px width $\times$ 640px height.
- Apex Controller:
  ```apex
  public with sharing class ArcGymDrillController {
      @AuraEnabled(cacheable=true)
      public static String getTodayDrill() {
          ArcGym_Drill__c drill = [SELECT Definition_JSON__c FROM ArcGym_Drill__c 
                                   WHERE Scheduled_Date__c = TODAY AND Status__c = 'Approved' LIMIT 1];
          return drill.Definition_JSON__c;
      }
      
      @AuraEnabled
      public static ArcGym_Attempt__c recordAttempt(String submissionJSON) {
          // Brier calculation & local DML in user's org
      }
  }
  ```

### 6.4 Monorepo Workspace Structure
```
arcgym/
├── .scratch/arcgym/                 # Wayfinder map & issues
├── apps/
│   ├── arcgym-lwr/                  # Cloudflare Pages LWR Web App
│   │   ├── lwr.config.json
│   │   ├── package.json
│   │   └── src/modules/arcgym/webHost/
│   └── arcgym-sfdx/                 # Salesforce DX Unmanaged Package
│       ├── sfdx-project.json
│       └── force-app/main/default/
│           ├── classes/             # ArcGymDrillController.cls
│           ├── objects/             # ArcGym_Drill__c, ArcGym_Attempt__c
│           └── lwc/arcgymUtilityBar/
├── packages/
│   ├── drill-core/                  # Pure TypeScript domain & scoring
│   │   ├── src/scoring/brier.ts     # Asymmetric Brier calculations
│   │   ├── src/types/drill.ts       # TypeScript DTO interfaces
│   │   └── src/state/               # Format state machines
│   └── drill-ui/                    # Shared Presentational LWCs
│       └── src/modules/c/
│           ├── confidenceGate/
│           ├── rapidFireCard/
│           ├── budgetMeter/
│           └── dualMeterScenario/
├── docs/research/                   # Foundational research reports
└── CONTEXT.md                       # Canonical domain glossary
```

---

## 7. RAG Content Pipeline & Quality Gate

### 7.1 Web Documentation Ingestion & Vector Pipeline
Because official Salesforce guidance is hosted as HTML rather than downloadable PDFs, ArcGym uses a targeted crawler and semantic transformer:
1. **Targeted Crawler**: Scrapes sitemaps and pages of `architect.salesforce.com` (Decision Guides, Well-Architected Framework, Architecture Fundamentals, Agentforce guides).
2. **Semantic Extraction**: Converts HTML DOM into clean Markdown, preserving tables and decision criteria intact.
3. **Chunking & Indexing**: Semantic chunking by Pattern and Limit Matrix; vectors stored in Cloudflare Vectorize or local SQLite-vec.

### 7.2 Antipattern-Driven LLM Generation Prompting
- Prompts retrieve official Decision Guide criteria and combine them with the **19 Canonical Antipatterns**.
- The LLM synthesizes a scenario, 1 Well-Architected answer, and 2–3 realistic antipattern distractors, each with a full Well-Architected explanation and documentation citation.

### 7.3 3-Tier Automated "Architect Linter"
Before reaching human eyes, every generated drill must pass three validation tiers:
1. **Tier 1 (Schema Validation)**: Zod schema validator enforces JSON syntax, required fields, and format conformity.
2. **Tier 2 (Deterministic Rule Linter)**: Rule-based checker validates hard platform limits against a verified platform database (SOQL query rows = 50,000; sync CPU = 10,000ms; async CPU = 60,000ms; CDC replay = 72 hours; Flow bulk size = 200).
3. **Tier 3 (Adversarial CTA Red-Team Solver)**: An adversarial LLM agent with a "Certified Technical Architect" system prompt attempts to solve the drill blindly. If the CTA agent picks an antipattern distractor or flags ambiguity, the drill is automatically rejected and revised.

### 7.4 Salesforce HITL Content Lifecycle
1. Generated drills passing Tier 3 land in `ArcGym_Drill__c` with `Status__c = 'In_Review'`.
2. A human architect reviews the drill in a custom Lightning Record Page featuring an interactive preview card.
3. Upon clicking **Approve**, the drill is assigned a `Scheduled_Date__c` and the event-driven webhook automatically deploys it to Cloudflare KV.

---

## 8. Implementation Roadmap & Phasing

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│   PHASE 1: MVP CORE    │ ───► │  PHASE 2: HEADLESS SF  │ ───► │   PHASE 3: RAG PIPE    │
│ • Monorepo setup       │      │ • Dev Org Metadata     │      │ • Documentation scraper│
│ • LWR on Cloudflare    │      │ • Flow Webhook to KV   │      │ • 3-Tier Linter        │
│ • 4 Drill UI LWCs      │      │ • In-Org Utility Bar   │      │ • HITL Approval Page   │
│ • Brier Scoring Engine │      │ • Trailblazer OAuth    │      │ • 30 Seed Scenarios    │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
                                                                            │
                                                                            ▼
                                                                ┌────────────────────────┐
                                                                │  PHASE 4: ROADMAP (V2) │
                                                                │ • Diagram Builder LWC  │
                                                                │ • Community Benchmarks │
                                                                │ • AppExchange 2GP Pkg  │
                                                                └────────────────────────┘
```

- **Phase 1: MVP Core (Standalone Edge Delivery)**: Monorepo initialized with Turborepo, `@lwrjs/core` deployed to Cloudflare Pages, `drill-core` TypeScript scoring engine, and shared presentational LWCs for all 4 drill formats.
- **Phase 2: Headless Salesforce & In-Org Packaging**: Salesforce Dev Org custom objects configured, event-driven Flow webhook publishing to Cloudflare KV, and `arcgymUtilityBar` packaged for in-org installation.
- **Phase 3: RAG Content Pipeline & Seed Bank**: Automated crawler for `architect.salesforce.com`, 3-tier Architect Linter, and initial 30-drill canonical seed pack.
- **Phase 4: v2 Advanced Features**: Interactive Architecture Diagram Builder for Lesson drills, Trailblazer community peer calibration benchmarks, and AppExchange packaging.
