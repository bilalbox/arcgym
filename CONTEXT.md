# ArcGym (Architect Gym)

ArcGym is an architectural judgment practice platform for Salesforce Architects, training high-stakes decision-making across Architectural Domains using the Salesforce Well-Architected Framework.

## Language

**Drill**:
A self-contained, 2-minute architectural judgment practice exercise.
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

**Architectural Trade-Off**:
A design tension evaluated across the Salesforce Well-Architected Framework pillars (Trust, Reliability, Operational Excellence, Resource and Cost Optimization, Fairness).
_Avoid_: Feature preference, single right answer

**Drill Format**:
One of three distinct interaction archetypes: Lesson, Rapid Fire, or Diagram. Orthogonal to Architectural Domain: Format is *how* the Drill is played; Domain is *what* area it trains.
_Avoid_: Question type, quiz mode, Currency, Scenario

**Rapid Fire Drill**:
A high-tempo multi-rep architectural decision workout. Each Rapid Fire round comprises 5 decision reps (drills), requiring completion of all 5 reps to achieve that day's practice streak.
_Avoid_: Single-question rapid fire, partial streak award, flashcard round

**Diagram Drill**:
A spatial judgment format: the learner inspects an ArcGym-redrawn topology derived from official Architect documentation, clicks the missing or incorrect hotspot (node, edge, or compose slot), then commits a constrained MCQ repair. Modes in v1 are `fault` and `compose` only. Diagrams are graph JSON with a separate normalized (0–1) layout; official Salesforce diagram binaries are never shipped. Dual learner-facing grounding: `sourceDiagramUrl` for topology provenance plus correct-option `citationUrl`.
_Avoid_: Drag-and-drop rearrange, embedded Lucid/PNG from Salesforce, Currency/Scenario revival

**Diagram Variant**:
An intentionally incomplete or incorrect graph state derived from an official reference topology (`missing_node`, `wrong_edge`, `misplaced_component`, `missing_edge`, and similar), used so fault/compose drills have a visual problem to localize.
_Avoid_: Corrupting official image pixels, quiz on a pristine unmodified reference picture only (annotation-only is allowed as a rare exception, not the default)

**Well-Architected Grounding**:
The architectural rationale, citations, and decision trees anchored directly in official documentation from architect.salesforce.com.
_Avoid_: Opinion, editorializing

**Universal Pre-Submit Gate**:
The mandatory calibration step requiring selection of a confidence anchor before committing any architectural choice, creating uniform calibration telemetry across all drill formats. On Diagram drills the gate fires before the hotspot commit and again before the MCQ when the hotspot was correct.
_Avoid_: Feedback prompt, post-quiz survey

**Hybrid Document Pattern**:
An architectural storage design combining indexed relational metadata fields on a custom object with a single compressed JSON document payload for complex sub-structures to avoid governor limits and record sprawl.
_Avoid_: Monolithic custom object, unstructured text

**Event-Driven Static Ingestion**:
An architectural pattern where content lifecycle events in Salesforce trigger outbound webhooks to push serialized payloads to an edge key-value store, enabling zero-API runtime delivery.
_Avoid_: Live API polling, direct runtime proxy

**Architect Linter**:
The 3-tier automated validation pipeline (Schema, Deterministic Platform Rule Linter, Adversarial CTA Red-Team LLM) that verifies generated drills prior to human editorial review.
_Avoid_: Code checker, syntax validator

**Drill Status**:
Editorial lifecycle on a Drill source file: `draft` (in `content/drills/`, excluded from the learner catalog) or `published` (compiled into `canonicalDrills.json` and seedable to KV). Toggle with `pnpm drill:status`.
_Avoid_: Featured-day webhook "publish", soft-delete, archive

**Antipattern Distractor**:
An incorrect drill choice deliberately modeled after a documented, real-world architectural antipattern to test an architect's discernment of technical debt and scalability boundaries. On Diagram drills, plausible decoy hotspots carry the same short antipattern names; filler nodes may use generic miss copy.
_Avoid_: Wrong answer, trick option

**Friction Card**:
A human-reviewed, paraphrased record of one Trailblazer Community thread: the problem, the naive approaches practitioners tried and why they failed, and how the thread resolved. Friction Cards source Antipattern Distractors and scenario realism only; a community resolution is never Well-Architected Grounding, so every correct answer still cites official documentation.
_Avoid_: Community pattern, frontier solution, dual grounding
