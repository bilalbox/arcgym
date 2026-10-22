# ArcGym (Architect Gym)

ArcGym is an architectural judgment practice platform for Salesforce Architects, training high-stakes decision-making across Architectural Domains using the Salesforce Well-Architected Framework.

## Language

**Drill**:
A self-contained architectural judgment practice exercise: either a Case File or an Incident. Every Drill is investigation-scale (minutes, not seconds) and gated by a Probe Budget.
_Avoid_: Quiz, test, exam, flashcard, rep

**Architectural Domain**:
One of seven practice categories drawn from Salesforce Architect Fundamentals (Platform Core, Data Architecture, Security and Access, Integration APIs, AI and Automation, Infrastructure, DevOps Lifecycle). Every Drill has exactly one primary Architectural Domain. Orthogonal to Well-Architected pillars: domain is *where* on the platform map a Drill sits; pillars are *how* the Architectural Trade-Off is judged.
_Avoid_: Topic tag, free-form domain string, Well-Architected pillar

**Domain Label**:
A short human-facing curriculum title for a Drill (for example "Data 360 & Data Cloud Zero Copy") that sits beside its Architectural Domain. Used for display, not filtering.
_Avoid_: Architectural Domain, subtitle, SEO keyword

**Confidence Calibration**:
The practice of rating self-assessed certainty before committing an answer, scoring architects on whether they know what they know (and know what they don't know).
_Avoid_: Guess, bet, probability score

**First Call** (Shelved):
An unscored one-line gut hypothesis captured before diagnostic probes. Currently shelved: learner feedback showed the timing was disorienting without enough information or clear choices yet. May be revisited in the future with revised timing or framing.
_Avoid_: Scored pretest, mandatory Associate gate, oral defense, recommendation-option pick

**Architectural Trade-Off**:
A design tension evaluated across the Salesforce Well-Architected Framework pillars (Trust, Reliability, Operational Excellence, Resource and Cost Optimization, Fairness).
_Avoid_: Feature preference, single right answer

**Drill Format**:
The interaction archetype for a Drill. ArcGym supports exactly two formats: Case File (Evaluation-scale CTA recommendation) and Troubleshooting (scarce-probe diagnosis with free-text cause). Orthogonal to Architectural Domain: Format is *how* the Drill is played; Domain is *what* area it trains.
_Avoid_: Question type, quiz mode, Rapid Fire, Currency, Scenario, Lesson, Diagram-as-separate-format

**Case File Drill**:
An Evaluation-scale architectural judgment exercise: a Brief (fictional narrative), three or more Stations under that Brief, a scarce Probe Budget of clarifying questions that unlock scenario facts at each Station, then a confidence-gated recommendation. Completing one earns the day's Practice Streak. Always at least three Stations — never a solo station.
_Avoid_: Board Probe, Board Eval, Scenario, Currency, oral defense, free-text presentation, full Review Board clock, solo station

**Brief**:
The fictional enterprise narrative shared by every Station in a Case File. Leaves pivotal facts behind the Probe Budget.
_Avoid_: Exam scenario packet, stem, prompt dump

**Station**:
One CTA-board-domain decision inside a Case File: Probe Budget discovery, then a confidence-gated recommendation chosen from authored options (never free text). May carry its own Exhibits.
_Avoid_: Question, quiz item, solo drill, Board Probe station

**Exhibit**:
A labeled diagram or artifact attached to a Brief or to a single Station, shown as evidence alongside the narrative.
_Avoid_: Attachment, hint, illustration

**Established Decision**:
The correct recommendation of a completed Station (its gold option label), carried forward as a stated fact into every later Station of the same Case File. The learner's own pick never carries forward, so one miss cannot cascade, and later Station prompts never restate it.
_Avoid_: Branching path, learner's prior answer, prompt-embedded spoiler

**Probe Budget**:
The limited number of clarifying questions an architect may ask before committing a Case File Station recommendation or a Troubleshooting Incident cause. Pivotal probes narrow the decision space; distractor probes waste budget on irrelevant fishing.
_Avoid_: Hint unlock, investigation credits, Currency spend

**Cases**:
The learner-facing mode for Case File practice (`/cases`), peer to Troubleshoot.
_Avoid_: Board Eval, Review Board mock, exam mode

**Practice Streak**:
Consecutive calendar days on which the learner completed at least one Drill (a whole Case File or one Incident).
_Avoid_: Rep streak, partial streak award, per-format streak

**Daily Drill**:
The one Case File or Incident the Home page recommends to a learner for today, chosen deterministically from uncompleted Drills.
_Avoid_: Daily workout, 3-rep round, featured drill

**Troubleshooting Drill**:
A diagnosis practice format: architecture synopsis + required diagram + issue, a scarce Probe Budget of clarifying questions that unlock scenario facts, a confidence-gated free-text root-cause commit, then — after the gold cause is revealed — a confidence-gated Fix. The cause is graded by Workers AI CLEF as a choice over one gold cause, three hidden antipattern distractors (never MCQ), and an `other` catchall. Completing one earns the day's Practice Streak. See ADR 0004 and ADR 0008.
_Avoid_: Quiz, Scenario, Lesson, LLM-as-judge, BGE reranker grading

**Fix**:
The remediation decision that closes an Incident: chosen from one cited gold fix and two Antipattern Distractor fixes, taken only after the gold cause is revealed so a missed diagnosis does not void the remediation judgment.
_Avoid_: Remediation reading list, solution cards, second cause guess

**Incident**:
One complete Troubleshooting Drill — the unit of Troubleshoot practice (not a multi-station Case File).
_Avoid_: Station, Brief pack, streak rep

**Troubleshoot**:
The learner-facing mode for Troubleshooting / Incident practice, peer to Cases in app chrome (`/troubleshoot`).
_Avoid_: Cases submenu, Quiz mode, daily streak entry

**UI Copy Minimalism**:
Learner-facing strings stay sparse. Structure and controls carry meaning; captions that restate the route, format, or mechanic are deleted. Prefer short verbs over tutorials.
_Avoid_: Meta-explanations, redundant section labels, decorative icon+echo rows, instructional subtitles

**Well-Architected Grounding**:
The architectural rationale, citations, and decision trees anchored directly in official documentation from architect.salesforce.com.
_Avoid_: Opinion, editorializing

**Universal Pre-Submit Gate**:
The mandatory calibration step requiring selection of a confidence anchor before committing any architectural choice, creating uniform calibration telemetry across Case File Station recommendations, Incident cause commits, and Incident Fix choices.
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
A system topology diagram authored directly as Mermaid syntax (`diagramSource`) inside drill definitions, rendered to themeable SVGs via Obsidian Pele (`pele`). Build-time baking in `pnpm build:drills` emits static SVGs to `apps/arcgym-web/public/diagrams/`, while the web app and Studio editor render dynamic live previews with full dark-mode token support.
_Avoid_: Hand-coded pixel coordinate geometry; runtime Chromium dependencies
