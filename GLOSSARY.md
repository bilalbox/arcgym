# ArcGym Domain Glossary

Domain terminology for ArcGym architecture and drill authoring, anchored in the Salesforce Well-Architected Framework.

## Domain Terms

### Drill
A self-contained architectural judgment practice exercise. Rapid Fire drills target about 2 minutes per rep; Case File stations are Evaluation-scale and longer.
_Avoid_: Quiz, test, exam, flashcard

### Architectural Domain
One of seven practice categories drawn from Salesforce Architect Fundamentals (Platform Core, Data Architecture, Security and Access, Integration APIs, AI and Automation, Infrastructure, DevOps Lifecycle). Every Drill has exactly one primary Architectural Domain. Orthogonal to Well-Architected pillars: domain is *where* on the platform map a Drill sits; pillars are *how* the Architectural Trade-Off is judged.
_Avoid_: Topic tag, free-form domain string, Well-Architected pillar

### Domain Label
A short human-facing curriculum title for a Drill (for example "Data 360 & Data Cloud Zero Copy") that sits beside its Architectural Domain. Used for display, not filtering.
_Avoid_: Architectural Domain, subtitle, SEO keyword

### Confidence Calibration
The practice of rating self-assessed certainty before committing an answer, scoring architects on whether they know what they know (and know what they don't know).
_Avoid_: Guess, bet, probability score

### Architectural Trade-Off
A design tension evaluated across the Salesforce Well-Architected Framework pillars (Trust, Reliability, Operational Excellence, Resource and Cost Optimization, Fairness).
_Avoid_: Feature preference, single right answer

### Drill Format
The interaction archetype for a Drill. ArcGym supports three formats: Rapid Fire (daily streak), Case File (Evaluation-scale CTA practice), and Troubleshooting (scarce-probe diagnosis with free-text cause). Orthogonal to Architectural Domain: Format is *how* the Drill is played; Domain is *what* area it trains. Topology-choice Rapid Fire drills embed optional `diagramUrl` previews inside options (with Inspect lightbox), rather than a separate Diagram runner.
_Avoid_: Question type, quiz mode, Currency, Scenario, Lesson, Diagram-as-separate-format

### Rapid Fire Drill
A high-tempo multi-rep architectural decision workout. Each Rapid Fire round comprises 3 decision reps (drills), requiring completion of all 3 reps to achieve that day's practice streak. Options may include an optional topology image (`diagramUrl`) rendered inline with Inspect lightbox zoom.
_Avoid_: Single-question rapid fire, partial streak award, flashcard round, separate Diagram runner

### Case File Drill
An Evaluation-scale architectural judgment exercise: a Brief (fictional narrative), three or more Stations under that Brief, a scarce Probe Budget of clarifying questions that unlock scenario facts at each Station, then a confidence-gated recommendation. Outside the daily Rapid Fire streak. Always at least three Stations — never a solo station.
_Avoid_: Board Probe, Board Eval, Scenario, Currency, oral defense, free-text presentation, full Review Board clock, solo station

### Brief
The fictional enterprise narrative shared by every Station in a Case File. Leaves pivotal facts behind the Probe Budget.
_Avoid_: Exam scenario packet, stem, prompt dump

### Station
One CTA-board-domain decision inside a Case File: Probe Budget discovery, then a confidence-gated recommendation.
_Avoid_: Question, quiz item, solo drill, Board Probe station

### Probe Budget
The limited number of clarifying questions an architect may ask before committing a Case File Station recommendation or a Troubleshooting Incident cause. Pivotal probes narrow the decision space; distractor probes waste budget on irrelevant fishing.
_Avoid_: Hint unlock, investigation credits, Currency spend

### Cases
The learner-facing mode for Case File practice, separate from the daily Rapid Fire streak.
_Avoid_: Board Eval, Review Board mock, exam mode

### Learner Identity
The cryptographic authentication credential or OAuth voucher establishing a learner's cloud session, decoupled from personal identifying information.
_Avoid_: User profile, account credentials, PII record

### Learner Progress
The persisted record of an individual architect's completed drills, practice streak, and calibration history across device sessions.
_Avoid_: User stats, game save, cookie payload

### Trial Allowance
The bounded anonymous practice quota permitted to a new learner before authentication is required to continue.
_Avoid_: Paywall, free tier, demo mode

### Progress Sync
The deterministic two-way set-union reconciliation of local client attempt telemetry with cloud storage.
_Avoid_: Cloud save, profile download, state overwrite

### Troubleshooting Drill
A diagnosis practice format: architecture synopsis + required diagram + issue, a scarce Probe Budget of clarifying questions that unlock scenario facts, then a confidence-gated free-text root-cause commit. Graded by Workers AI CLEF as a choice over one gold cause, three hidden antipattern distractors (never MCQ), and an `other` catchall. Outside the daily Rapid Fire streak; no separate Troubleshoot streak in v1. See ADR 0004.
_Avoid_: Quiz, Scenario, Lesson, remediation step (v1), LLM-as-judge, BGE reranker grading

### Incident
One complete Troubleshooting Drill — the unit of Troubleshoot practice (not a multi-station Case File, not a three-rep Rapid Fire pack).
_Avoid_: Station, Brief pack, streak rep

### Troubleshoot
The learner-facing mode for Troubleshooting / Incident practice, peer to Cases in app chrome (`/troubleshoot`).
_Avoid_: Cases submenu, Quiz mode, daily streak entry

### UI Copy Minimalism
Learner-facing strings stay sparse. Structure and controls carry meaning; captions that restate the route, format, or mechanic are deleted. Prefer short verbs over tutorials. See `design.md` §7.
_Avoid_: Meta-explanations, redundant section labels, decorative icon+echo rows, instructional subtitles

### Practice Round
A sequenced set of architectural decision reps (default 3 for a daily practice workout, or 1 for solo practice) evaluated under the Universal Pre-Submit Gate.
_Avoid_: Quiz session, test round, question set

### Practice Session
The state machine governing rep progression, option selection, confidence commitment, and Brier scoring across a Practice Round.
_Avoid_: Quiz runner, game controller, test runner

### Well-Architected Grounding
The architectural rationale, citations, and decision trees anchored in official Salesforce documentation on architect.salesforce.com, developer.salesforce.com, and help.salesforce.com. A correct option's citation must be an exact URL present in the Citation Manifest (the crawled grounding corpus). Trailhead, engineering blogs, practitioner blogs, and Friction Cards are never Well-Architected Grounding; they may inform scenario realism and Antipattern Distractors only. Case File clarifying answers are scenario fiction; only the final recommendation cites Well-Architected Grounding.
_Avoid_: Opinion, editorializing, dual grounding via Trailhead, community, or blog posts

### Citation Manifest
The set of exact documentation URLs eligible to ground a correct option. Built only from crawled Well-Architected Grounding sources; membership is required at build time, not merely host allowlisting.
_Avoid_: Host allowlist alone, uncrawled URL, blog URL

### Universal Pre-Submit Gate
The mandatory calibration step requiring selection of a confidence anchor before committing any architectural choice, creating uniform calibration telemetry across Rapid Fire reps, Case File Station recommendations, and Troubleshooting cause commits.
_Avoid_: Feedback prompt, post-quiz survey

### Architect Linter
The 3-tier validation pipeline that verifies generated drills prior to human editorial review: (1) schema & Citation Manifest via soft ingest / `build-drills`, (2) deterministic wording lint, (3) Adversarial CTA Red-Team as a skill/subagent pass that writes structured `redteam` findings into the soft-ingest sidecar on failure.
_Avoid_: Code checker, syntax validator; mandatory hosted LLM inside ingest/CI

### Drill Status
Editorial lifecycle on a Drill source file: `draft` (in `content/drills/`, excluded from the learner catalog) or `published` (compiled into `canonicalDrills.json` and seedable to KV). Toggle with `pnpm drill:status`.
_Avoid_: Featured-day webhook "publish", soft-delete, archive

### Antipattern Distractor
An incorrect drill choice deliberately modeled after a documented, real-world architectural antipattern to test an architect's discernment of technical debt and scalability boundaries.
_Avoid_: Wrong answer, trick option

### Friction Card
A human-reviewed, paraphrased record of one Trailblazer Community thread: the problem, the naive approaches practitioners tried and why they failed, and how the thread resolved. Friction Cards source Antipattern Distractors and scenario realism only; a community resolution is never Well-Architected Grounding, so every correct answer still cites official documentation.
_Avoid_: Community pattern, frontier solution, dual grounding
