Type: grilling
Status: resolved
Blocked by: 01, 05

# Define RAG Drill Authoring, Grounding and Quality Control pipeline

## Question

How will the hybrid content engine ingest official Salesforce documentation, generate draft drills via LLM, validate them against governor limits and anti-patterns, and approve them into the canonical drill bank?

## Answer

### 1. Web Documentation Crawler & Semantic Chunking Engine
Since official Salesforce architecture guides exist as live HTML documentation rather than downloadable PDF corpora, ArcGym utilizes a targeted documentation scraper and transformer:
- **Crawler Target**: Traverses the sitemap and structured hierarchies of `https://architect.salesforce.com/`:
  - *Decision Guides*: Automation (Flow vs. Apex), Data Integration, Data 360 Interoperability, Event-Driven Architecture.
  - *Well-Architected Framework*: Trust, Reliability, Operational Excellence, Resource/Cost Optimization, Fairness.
  - *Architecture Fundamentals*: Platform Transformation, Agentic Enterprise IT Architecture, ADLC (Agent Development Lifecycle), Enterprise Agentic Patterns.
- **Semantic Transformer**:
  - Converts HTML DOM into clean Markdown.
  - Preserves tabular decision matrices intact (e.g. throughput caps, latency SLAs, rollback scopes).
  - Emits metadata tags: `{ domain, subDomain, pillars: [], sourceUrl, lastCrawled }`.
- **Vector Indexing**:
  - Chunks indexed in Cloudflare Vectorize (free tier) or local SQLite-vec embeddings (using OpenAI `text-embedding-3-small` or Voyage embeddings).

---

### 2. Antipattern-Driven LLM Generation Prompting
Drill generation prompts are conditioned on the **19 Canonical Antipatterns** codified in [`docs/research/01-salesforce-architect-taxonomy.md`](file:///home/bilal/mycode/arcgym/docs/research/01-salesforce-architect-taxonomy.md):
- **Scenario Synthesis**: Generates a realistic enterprise context with non-functional constraints (record volumes, latency SLAs, compliance regulations).
- **Distractor Engineering**: Mandates that incorrect options are NOT syntax errors or silly mistakes; every distractor must embody a specific documented architectural antipattern (e.g. *Process Frankenstein*, *The God Account*, *Scoping Rules as Security*, *Streaming Everything*, *Fuzzy Over-Clustering*, *Trust Layer Bypass*).
- **Rationale & Grounding**: Every option includes an explanation anchored in Salesforce Well-Architected guidance, citing the exact documentation URL.

---

### 3. 3-Tier Automated "Architect Linter" (Quality Gate)
Before any generated scenario reaches human eyes, it must pass a three-stage automated validation gate:
1. **Tier 1 (Schema Validation)**: Zod validator enforces JSON structure, format conformity (`Lesson`, `Rapid_Fire`, `Currency`, `Scenario`), and field length constraints.
2. **Tier 2 (Deterministic Rule Linter)**: Rule-based checker validates hard Salesforce limits against a verified platform database:
   - SOQL query limit = 100 sync, 200 async; SOQL query rows = 50,000.
   - CPU timeout = 10,000ms sync, 60,000ms async; Heap size = 6MB sync, 12MB async.
   - CDC event retention = 72 hours; Platform Event replay = 72 hours.
   - Flow trigger bulk size = 200 records.
   - Identity Resolution rules: Match rules vs. Reconciliation rules semantics.
   - Agentforce Trust Layer: Prompt Defense, PII Masking, Zero Data Retention agreements.
3. **Tier 3 (Adversarial CTA Red-Team Solver)**:
   - A separate LLM agent running with a strict "Certified Technical Architect Reviewer" system prompt independently solves the drill without seeing the answer key.
   - If the CTA agent selects an antipattern distractor or flags ambiguity in the scenario constraints, the drill fails the gate and is kicked back for automated revision.

---

### 4. Human-in-the-Loop (HITL) Salesforce Content Lifecycle
- **Draft Stage**: Generated drills passing Tier 3 are inserted into Salesforce Dev Org (`ArcGym_Drill__c`) with `Status__c = 'In_Review'`.
- **Editorial Review**: An architect reviews the drill using a custom Lightning Record Page that renders a live preview of the interactive drill card, distractor explanations, and citations.
- **Approval & Distribution**: When the reviewer clicks **Approve**, Salesforce Flow automatically:
  1. Assigns a `Scheduled_Date__c` in the calendar queue.
  2. Invokes the outbound webhook to Cloudflare Pages Functions, pushing the serialized `Definition_JSON__c` to Cloudflare Workers KV.
  3. The daily drill is instantly live globally with 0 live API calls on the Dev Org.
