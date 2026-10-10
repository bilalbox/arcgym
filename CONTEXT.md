# ArcGym (Architect Gym)

ArcGym is an architectural judgment practice platform for Salesforce Architects, training high-stakes decision-making across Architectural Domains using the Salesforce Well-Architected Framework.

## Language

**Drill**:
A self-contained architectural judgment practice exercise. Rapid Fire drills target about 2 minutes per rep; Case File stations are Evaluation-scale and longer.
_Avoid_: Quiz, test, exam, flashcard

**Architectural Domain**:
One of seven practice categories drawn from Salesforce Architect Fundamentals (Platform Core, Data Architecture, Security and Access, Integration APIs, AI and Automation, Infrastructure, DevOps Lifecycle). Every Drill has exactly one primary Architectural Domain. Orthogonal to Well-Architected pillars: domain is *where* on the platform map a Drill sits; pillars are *how* the Architectural Trade-Off is judged.
_Avoid_: Topic tag, free-form domain string, Well-Architected pillar

**Domain Label**:
A short human-facing curriculum title for a Drill (for example "Data 360 & Data Cloud Zero Copy") that sits beside its Architectural Domain. Used for display, not filtering.
_Avoid_: Architectural Domain, subtitle, SEO keyword

**Confidence Calibration**:
The practice of rating self-assessed certainty before committing an answer, scoring architects on whether they know what they know (and know what they don't know).
_Avoid_: Guess, bet, probability score

**Hypercorrection Intercept**:
The feedback path after a wrong commit at high Confidence Calibration (85% or 95%): withhold the correct option and its rationale, name the matched Antipattern Distractor and why it tempts, then allow one second try before the normal reveal.
_Avoid_: Surprise card, surprise chrome, flashcard, adaptive lesson

**Deferred Retest**:
A single later Rapid Fire rep on the same architectural principle as a prior high-confidence miss, drawn from an authored sibling Drill rather than repeating the same stem. Not a spaced-repetition deck.
_Avoid_: Flashcard, SRS queue, review deck, same-question retry

**Contrast Set**:
An authored group of Rapid Fire Drills that share one deciding architectural variable and differ in stem; identified by a shared `contrastSetId`. Used to schedule same-round contrast reps and to pick a sibling for a Deferred Retest.
_Avoid_: Flashcard deck, question family, tagged topic cluster, sourceCardIds heuristic

**Distractor Autopsy**:
A short post-reveal prompt that asks why a specific Antipattern Distractor fails in this Drill, answered by tapping one of several authored explanation chips (usually from option rationales). Unscored; skippable.
_Avoid_: Shame framing, free-text essay, scored follow-up quiz

**First Call**:
An unscored one-line free-text gut hypothesis (and optional Confidence Calibration) captured on a Case File Station after the Brief and before the Probe Budget unlocks. Compared to the final recommendation so probe-driven revisions are visible.
_Avoid_: Scored pretest, mandatory Associate gate, oral defense, recommendation-option pick

**Architectural Trade-Off**:
A design tension evaluated across the Salesforce Well-Architected Framework pillars (Trust, Reliability, Operational Excellence, Resource and Cost Optimization, Fairness).
_Avoid_: Feature preference, single right answer

**Drill Format**:
The interaction archetype for a Drill. ArcGym supports three formats: Rapid Fire (daily streak), Case File (Evaluation-scale CTA practice), and Troubleshooting (scarce-probe diagnosis with free-text cause). Orthogonal to Architectural Domain: Format is *how* the Drill is played; Domain is *what* area it trains. Topology-choice Rapid Fire drills embed optional `diagramUrl` previews inside options (with Inspect lightbox), rather than a separate Diagram runner.
_Avoid_: Question type, quiz mode, Currency, Scenario, Lesson, Diagram-as-separate-format

**Rapid Fire Drill**:
A high-tempo multi-rep architectural decision workout. Each Rapid Fire round comprises 3 decision reps (drills), requiring completion of all 3 reps to achieve that day's practice streak. A round may be three independent drills or one Contrast Set. Options may include an optional topology image (`diagramUrl`) rendered inline with Inspect lightbox zoom.
_Avoid_: Single-question rapid fire, partial streak award, flashcard round, separate Diagram runner

**Case File Drill**:
An Evaluation-scale architectural judgment exercise: a Brief (fictional narrative), three or more Stations under that Brief, a scarce Probe Budget of clarifying questions that unlock scenario facts at each Station, then a confidence-gated recommendation. Outside the daily Rapid Fire streak. Always at least three Stations — never a solo station.
_Avoid_: Board Probe, Board Eval, Scenario, Currency, oral defense, free-text presentation, full Review Board clock, solo station

**Brief**:
The fictional enterprise narrative shared by every Station in a Case File. Leaves pivotal facts behind the Probe Budget.
_Avoid_: Exam scenario packet, stem, prompt dump

**Station**:
One CTA-board-domain decision inside a Case File: Probe Budget discovery, then a confidence-gated recommendation.
_Avoid_: Question, quiz item, solo drill, Board Probe station

**Probe Budget**:
The limited number of clarifying questions an architect may ask before committing a Case File Station recommendation or a Troubleshooting Incident cause. Pivotal probes narrow the decision space; distractor probes waste budget on irrelevant fishing.
_Avoid_: Hint unlock, investigation credits, Currency spend

**Cases**:
The learner-facing mode for Case File practice, separate from the daily Rapid Fire streak.
_Avoid_: Board Eval, Review Board mock, exam mode

**Troubleshooting Drill**:
A diagnosis practice format: architecture synopsis + required diagram + issue, Probe Budget discovery, then a confidence-gated free-text root-cause commit graded against one gold cause and three hidden antipattern distractors. Outside the daily Rapid Fire streak. See ADR 0004.
_Avoid_: Quiz, Scenario, Lesson, remediation step (v1), LLM-as-judge

**Incident**:
One complete Troubleshooting Drill — the unit of Troubleshoot practice.
_Avoid_: Station, Brief pack, streak rep

**Troubleshoot**:
The learner-facing mode for Troubleshooting / Incident practice (`/troubleshoot`), peer to Cases.
_Avoid_: Cases submenu, Quiz mode, daily streak entry

**UI Copy Minimalism**:
Learner-facing strings stay sparse. Structure and controls carry meaning; captions that restate the route, format, or mechanic are deleted. Prefer short verbs over tutorials.
_Avoid_: Meta-explanations, redundant section labels, decorative icon+echo rows, instructional subtitles

**Well-Architected Grounding**:
The architectural rationale, citations, and decision trees anchored directly in official documentation from architect.salesforce.com.
_Avoid_: Opinion, editorializing

**Universal Pre-Submit Gate**:
The mandatory calibration step requiring selection of a confidence anchor before committing any architectural choice, creating uniform calibration telemetry across Rapid Fire reps, Case File Station recommendations, and Troubleshooting cause commits.
_Avoid_: Feedback prompt, post-quiz survey

**Hybrid Document Pattern**:
An architectural storage design combining indexed relational metadata fields on a custom object with a single compressed JSON document payload for complex sub-structures to avoid governor limits and record sprawl.
_Avoid_: Monolithic custom object, unstructured text

**Event-Driven Static Ingestion**:
An architectural pattern where content lifecycle events in Salesforce trigger outbound webhooks to push serialized payloads to an edge key-value store, enabling zero-API runtime delivery.
_Avoid_: Live API polling, direct runtime proxy

**Architect Linter**:
The 3-tier validation pipeline that verifies generated drills prior to human editorial review: (1) schema & Citation Manifest via soft ingest / `build-drills`, (2) deterministic wording lint, (3) Adversarial CTA Red-Team as a skill/subagent pass that writes structured `redteam` findings into the soft-ingest sidecar on failure.
_Avoid_: Code checker, syntax validator; mandatory hosted LLM inside ingest/CI

**Drill Status**:
Editorial lifecycle on a Drill source file: `draft` (in `content/drills/`, excluded from the learner catalog) or `published` (compiled into `canonicalDrills.json` and seedable to KV). Toggle with `pnpm drill:status`.
_Avoid_: Featured-day webhook "publish", soft-delete, archive

**Antipattern Distractor**:
An incorrect drill choice deliberately modeled after a documented, real-world architectural antipattern to test an architect's discernment of technical debt and scalability boundaries.
_Avoid_: Wrong answer, trick option

**Friction Card**:
A human-reviewed, paraphrased record of one Trailblazer Community thread: the problem, the naive approaches practitioners tried and why they failed, and how the thread resolved. Friction Cards source Antipattern Distractors and scenario realism only; a community resolution is never Well-Architected Grounding, so every correct answer still cites official documentation.
_Avoid_: Community pattern, frontier solution, dual grounding

**Authored Diagram**:
A topology SVG composed from `@arcgym/diagrams` React primitives (`AuthoredSvgShell`, `AuthoredCard`, `AuthoredEdge`, `AuthoredZone`, …), exported to `apps/arcgym-web/public/diagrams/` and referenced by `diagramUrl`. Package-emitted SVGs are gated by L1/L2 geometry QA (`pnpm test:diagram-qa`). Learners still see static `<img>` Inspect previews — not live React.
_Avoid_: Hand-tuned SVG without QA attrs for new art; Mermaid; live FAQ hover engines
