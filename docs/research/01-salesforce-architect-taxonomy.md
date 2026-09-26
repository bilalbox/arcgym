# Salesforce Well-Architected Framework & Agentic Enterprise Taxonomy

**Document Identifier:** `ARC-TAXONOMY-01`  
**Target:** ArcGym Curriculum, Practice Engine, and Evaluation Rubric  
**Grounding Source:** [architect.salesforce.com](https://architect.salesforce.com)  
**Branch:** `research/salesforce-architect-taxonomy`  

---

## Executive Summary & ArcGym Foundation

ArcGym (Architect Gym) is a daily architectural judgment practice platform designed to cultivate high-stakes decision-making for Salesforce Technical Architects (CTAs), Enterprise Architects, and Solution Architects. Architectural excellence on the Salesforce platform requires balancing conflicting architectural forces—cost, security, reliability, latency, operational complexity, and ethical fairness—under multitenant boundaries and probabilistic AI environments.

This taxonomy synthesizes architectural guidance directly from `architect.salesforce.com`, incorporating the **Salesforce Well-Architected Framework**, official **Decision Guides**, the **Data 360 (Data Cloud) Architecture**, and the **Agentforce / Agentic Enterprise Architecture**. It organizes these domains into actionable curriculum units, cataloging canonical design patterns, critical antipatterns, architectural trade-offs, and evaluation rubrics designed specifically for ArcGym drills.

### ArcGym Core Conceptual Alignment
- **Drill:** A self-contained, 2-minute daily architectural judgment practice exercise (*avoid: quiz, test, exam, flashcard*).
- **Confidence Calibration:** Rating certainty before committing an answer, scoring architects on whether their self-assessed certainty matches reality (*avoid: guess, bet, probability score*).
- **Architectural Trade-Off:** A design tension evaluated across the 5 Well-Architected pillars (*avoid: feature preference, single right answer*).
- **Drill Format:** Lesson, Rapid Fire, Currency, or Scenario (*avoid: question type, quiz mode*).
- **Architect Budget:** A constrained resource allocation in a Currency drill such as Governor Limits, API calls, Data Cloud credits, context tokens, or technical debt points (*avoid: score, tokens*).
- **Stakeholder Standing:** A dynamic metric (0–100) tracking a stakeholder persona's trust and organizational alignment in a multi-turn Scenario drill (*avoid: sentiment, user score*).
- **Well-Architected Grounding:** Architectural rationale, citations, and decision trees anchored directly in official documentation from `architect.salesforce.com` (*avoid: opinion, editorializing*).

---

## Section I: The 5 Well-Architected Pillars & Evaluation Rubric

The Salesforce Well-Architected Framework structures architectural health around five non-negotiable pillars. Every architectural trade-off within ArcGym is evaluated against these dimensions.

```
                     ┌─────────────────────────────────────────┐
                     │   SALESFORCE WELL-ARCHITECTED PILLARS   │
                     └────────────────────┬────────────────────┘
          ┌──────────────┬────────────────┼──────────────┬──────────────┐
          ▼              ▼                ▼              ▼              ▼
     ┌─────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  ┌──────────┐
     │  TRUST  │  │ RELIABILITY │  │ OPERATIONAL │  │RESOURCE │  │ FAIRNESS │
     │         │  │             │  │ EXCELLENCE  │  │ & COST  │  │          │
     └─────────┘  └─────────────┘  └─────────────┘  └─────────┘  └──────────┘
```

### 1. Trust
- **Definition:** The foundational baseline for all architectural decisions at Salesforce. Focuses on security controls, identity management, data protection, privacy, and compliance across people, systems, and models.
- **Agentic Dimension (Agentic Trust):** Extends boundary enforcement to non-deterministic agents: prompt injection defense, PII masking, Zero Data Retention agreements with LLM providers, and Attribute-Based Access Control (ABAC) using CEDAR policies in Data 360.
- **Evaluation Criteria:** Least-privilege access, encryption at rest/in transit, zero data leakage across tenants, compliance with data residency and regulations (GDPR, HIPAA, CCPA).

### 2. Reliability
- **Definition:** Designing resilient systems that anticipate hardware, software, or network failures, contain the blast radius, and recover gracefully without data loss.
- **Architectural Mechanics:** Multi-region deployment, RTO/RPO adherence, graceful degradation, circuit breaker patterns, idempotency across asynchronous queues, bulkification up to 200 records per transaction, and governor limit mitigation.
- **Evaluation Criteria:** Uptime, transactional integrity, lock contention mitigation, automated retries with exponential backoff, dead-letter handling.

### 3. Operational Excellence
- **Definition:** The human and process discipline necessary to operate, sustain, observe, and continuously improve platform applications throughout their lifecycle.
- **Architectural Mechanics:** Codified CI/CD pipelines, version control as single source of truth, automated regression testing, environment lifecycle (scratch orgs, partial/full sandboxes), Session Tracing Data Model (STDM) for agents, Event Monitoring, and blameless post-incident reviews.
- **Evaluation Criteria:** Release velocity with zero rollbacks, comprehensive telemetry coverage, root cause identification time, automated canary deployments.

### 4. Resource and Cost Optimization
- **Definition:** Maximizing long-term business value while intentionally minimizing waste in compute, storage, API consumption, and licensing.
- **Architectural Mechanics:** TCO evaluation of "build vs. buy vs. compose," data tiering (hot NVMe cache vs. warm Iceberg Lakehouse vs. cold archive), context window pruning and token economics, lean action schemas, and high-density compute packing.
- **Evaluation Criteria:** Storage efficiency, consumption credit preservation, CPU timeout minimization, architectural composability without redundant licenses.

### 5. Fairness
- **Definition:** Ensuring platform and AI solutions are transparent, accessible, auditable, and equitable for all users and demographics.
- **Architectural Mechanics:** Strict adherence to WCAG 2.2 AA standards via Salesforce Lightning Design System (SLDS), bias detection in training and grounding datasets, toxic content moderation, algorithmic accountability, explainable AI, and mandatory Human-in-the-Loop (HITL) escalation gates.
- **Evaluation Criteria:** Accessibility scores, demographic parity in AI outcomes, auditability of reasoning paths, presence of transparent escalation mechanisms.

---

### Architectural Trade-Off Tension Matrix

In real-world enterprise engineering, architects never optimize in a vacuum. A decision favoring one pillar frequently introduces friction in another:

| Design Tension | Pillar A | Pillar B | Core Architectural Dilemma | Well-Architected Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **Data Replication vs. Virtualization** | Reliability & Speed (Local Storage) | Resource & Cost / Trust (Zero Copy) | Storing data locally speeds SOQL point lookups but inflates storage costs, synchronization lags, and compliance risk. | Use Zero Copy federation (Snowflake/BigQuery via Iceberg/JDBC) for analytical or reference data; replicate only transactional operational data requiring workflow triggers. |
| **Real-Time Synchronous vs. Asynchronous Queuing** | User Experience (Immediate Feedback) | Reliability (Governor Limit Throttling) | Synchronous callouts block worker threads and risk 120s timeouts and thread pool exhaustion (>50 concurrent callouts >5s). | Fire-and-Forget via Platform Events (`Publish After Commit`) or Asynchronous Continuation in LWC with Pub/Sub API streaming for UI response. |
| **Agent Autonomy vs. Human Oversight** | Operational Efficiency (Full Automation) | Trust & Fairness (Risk Mitigation) | Fully autonomous actions reduce human handling time but increase risk of hallucinated transactional errors or biased customer communication. | Tiered autonomy: low-risk actions execute deterministically; high-impact mutations (refunds, contract changes) require explicit Human-in-the-Loop approval. |
| **Deep Role Hierarchies vs. Query Performance** | Trust (Granular Record Security) | Reliability & Performance (Sharing Recalculation) | Highly granular role trees enforce strict visibility but trigger massive cascading sharing recalculations and query plan degradation during ownership updates. | Flatter role hierarchy combined with Restriction Rules, Scoping Rules, or Criteria-Based Sharing to minimize sharing table volume. |
| **Dense LLM Context Grounding vs. Cost/Latency** | Trust (Accurate Contextual Grounding) | Resource & Cost (Token Economics) | Passing extensive history and full document chunks prevents hallucinations but exhausts LLM token limits, skyrockets flex credits, and degrades response latency. | RAG retrieval pipelines with semantic chunking, keyword/vector hybrid indexing, and strict context pruning to feed only top-K pertinent passages. |

---

## Section II: Core Platform Architecture Best Practices & Decision Guides

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CORE PLATFORM ARCHITECTURAL DOMAINS                  │
└───────────────────────────────────┬────────────────────────────────────┘
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ RECORD-TRIGGERED │      │   LARGE DATA     │      │   SHARING AND    │
│    AUTOMATION    │      │  VOLUMES (LDV)   │      │     SECURITY     │
│   (Flow v Apex)  │      │  & INDEX TUNING  │      │   ARCHITECTURE   │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### 1. Automation Decision Guide: Record-Triggered Automation

The Salesforce Automation Decision Guide provides a framework based on **automation density**, transactional complexity, and performance requirements:

```
                          Record Save Event Occurs
                                      │
                 Is it a Same-Record Field Value Update?
                                ├───► YES: Record-Triggered Flow (Before-Save / Fast Field Updates)
                                │          (Zero DML cost, executes before database commit)
                                └───► NO
                                      │
                     Does it require Complex Logic / High Density?
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
   Low-to-Medium Density                            High Density
   - Independent business rules                     - High-frequency bulk updates (>200 batch)
   - Standard CRUD on related records               - Complex collection manipulation / maps
   - Notifications, tasks, sub-flows                - Granular transaction/locking control
        │                                               │
Record-Triggered Flow                              Apex Trigger
(After-Save)                                       (Domain Framework / Trigger Handler)
        │                                               │
        └─────────────────► Can Compute be Offloaded? ◄─┘
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
       Invocable Apex                      Asynchronous Processing
 (Hybrid: Flow orchestration             (Queueable, Batch, Platform Events)
   + Apex compute/SOQL engine)
```

#### Detailed Automation Archetypes:
1. **Before-Save Flow (Fast Field Updates):**
   - *Execution Context:* Runs immediately prior to database commit, modifying the `record` in memory.
   - *Best Practice:* Use for same-record validation, default field values, and calculations. Avoids triggering recursive save cycles, executes 10x faster than Process Builder/Workflow Rules, and incurs zero SOQL/DML governor penalty.
2. **After-Save Flow (Actions and Related Records):**
   - *Execution Context:* Runs after the initial record commit.
   - *Best Practice:* Use for orchestrating updates across related objects, sending emails, publishing platform events, or executing scheduled paths.
3. **Apex Trigger with Handler Pattern:**
   - *Execution Context:* High-throughput transactions, complex integration pipelines, and heavy computational requirements.
   - *Best Practice:* One trigger per object; delegate all logic to a trigger handler class; ensure strict bulkification (handling collections of 200 records without SOQL/DML in loops); enforce system-level limits via transaction controls.
4. **Asynchronous Processing Hierarchy:**
   - **Queueable Apex:** Preferred modern asynchronous pattern over `@future`. Supports job chaining, passing complex objects/custom types, retrieving Job IDs for monitoring, and fine-grained concurrency control via `System.enqueueJob()`.
   - **Batch Apex:** Reserved for massive data operations (up to 50M records via `Database.QueryLocator`). Runs in chunks of 1 to 2,000 records. Subject to the flex queue limit (max 100 concurrent/holding jobs).
   - **Scheduled Apex:** Time-triggered cron orchestration (`Schedulable` interface) used to instantiate batch or queueable workloads during maintenance windows.
   - **Platform Events:** Decouples the transaction boundaries. Enables event-driven, asynchronous processing with automatic retry capabilities and independent transactional rollback boundaries.

---

### 2. Large Data Volumes (LDV), Indexing, & Query Optimization

When an sObject exceeds hundreds of thousands to millions of records, standard database operations can degrade without precise indexing and skew avoidance:

#### Data Skew Archetypes:
- **Ownership Skew:** Occurs when a single user (or queue) owns >10,000 records of a given object.
  - *Architectural Risk:* If the owner's role, territory, or group membership changes, Salesforce must recalculate the entire sharing tree for all records, locking the `AccountShare` / `CustomObject__Share` tables and causing system-wide timeouts.
  - *Mitigation:* Distribute ownership across multiple generic system users; place high-volume data owners in a separate branch of the role hierarchy or assign them no role.
- **Lookup Skew:** Occurs when >10,000 child records point to a single parent record via a lookup or master-detail relationship.
  - *Architectural Risk:* During concurrent child record inserts or updates, Salesforce places an exclusive lock on the parent record to validate relationship integrity, triggering `UNABLE_TO_LOCK_ROW` exceptions.
  - *Mitigation:* Distribute child records across a pool of generic parent records ("lookup pooling"); use asynchronous processing with serialization; remove unnecessary lookup relationships.

#### Query Selectivity & Indexing Rules:
To avoid costly Full Table Scans (FTS), SOQL queries must be selective. The Query Optimizer evaluates selectivity based on hard thresholds:
- **Standard Index:** A filter is selective if it matches **≤ 30%** of the first 1,000,000 records, and **≤ 15%** of the records beyond 1,000,000 (up to a hard ceiling of 1,000,000 total records).
  - *Indexed Fields by Default:* `Id`, `Name`, `OwnerId`, `CreatedDate`, `LastModifiedDate`, `SystemModstamp`, RecordType lookups, and Foreign Keys (Lookups/Master-Detail).
- **Custom Index:** A filter is selective if it matches **≤ 10%** of the first 1,000,000 records, and **≤ 5%** of the records beyond 1,000,000 (up to a ceiling of 333,333 records).
  - *Candidates for Custom Index:* External IDs, unique custom fields, or fields indexed via Salesforce Customer Support.
- **Non-Selective Traps:**
  - Negative operators (`!=`, `NOT IN`, `EXCLUDES`).
  - Leading wildcards (`LIKE '%term'`).
  - Comparing against `NULL` or empty strings.
  - Non-deterministic formula fields (formulas containing cross-object lookups, `NOW()`, `TODAY()`, or dynamic runtime functions cannot be indexed).
- **Advanced LDV Strategies:**
  - **Skinny Tables:** Combined read-only tables created by Salesforce Support linking standard and custom fields into a single underlying database table, bypassing joins and improving report/query throughput.
  - **Big Objects:** Storing massive historical volumes (billions of records) with access via custom composite primary keys.
  - **Data Cloud Offload:** Streaming historical operational data into Data Cloud Lakehouse storage, querying via Zero Copy and external objects.

---

### 3. Sharing and Security Architecture

Salesforce employs an object-, field-, and record-level visibility model:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OBJECT-LEVEL SECURITY (CRUD)                    │
│                        Profiles & Permission Sets                      │
├────────────────────────────────────────────────────────────────────────┤
│                        FIELD-LEVEL SECURITY (FLS)                      │
│                   Read / Edit permissions per field                    │
├────────────────────────────────────────────────────────────────────────┤
│                       RECORD-LEVEL VISIBILITY HIERARCHY                │
│                                                                        │
│   BASELINE: Organization-Wide Defaults (OWD)                           │
│   (Private, Public Read Only, Public Read/Write)                       │
│                                                                        │
│   EXPAND ACCESS:                                                       │
│   ├── Role Hierarchy (Inherits access up management chain)             │
│   ├── Sharing Rules (Owner-Based, Criteria-Based, Guest User)          │
│   ├── Manual Sharing (Single record sharing by owner/admin)            │
│   ├── Apex Managed Sharing (Custom programmatic access tables)         │
│                                                                        │
│   FILTER / RESTRICT ACCESS:                                            │
│   ├── Restriction Rules (Hard deny: masks records matching criteria)   │
│   └── Scoping Rules (Soft filter: narrows list views/reports/lookups)  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Restriction Rules vs. Scoping Rules:
- **Restriction Rules:**
  - *Function:* Enforces a **hard security denial**. When active, a user cannot see the record anywhere (SOQL, search, list views, lookups), even if granted access via OWD or Sharing Rules.
  - *Use Case:* Segregating sensitive contracts, employee health records, or confidential partner data.
  - *Critical Caveat:* Bypassed by users with `View All Data` or `Modify All Data` permissions.
- **Scoping Rules:**
  - *Function:* Enforces a **soft productivity filter**. Filters records in List Views, Reports, and Lookups to reduce noise, but **does not block access** if the user opens the direct record URL or executes a backend query without scoping headers.
  - *Use Case:* Filtering active deals by region or subsidiary without fragmenting sharing rules.

#### Shield Enterprise Architecture:
- **Shield Platform Encryption:** Encrypts data at rest in the storage tier using AES-256 keys. Supports Deterministic encryption (allows filtering and equality lookups) and Probabilistic encryption (highest entropy, forbids SOQL filtering). Architectures must support Bring Your Own Key (BYOK) or Cache-Only Key (external KMS).
- **Event Monitoring:** Real-time event streams capturing over 50 event types (Logins, Apex execution, URI access, SOQL queries, Lightning page views). Integrates with CRM Analytics or external SIEM (Splunk, Datadog) via Pub/Sub API.
- **Field Audit Trail:** Tracks history for up to 60 fields per object for up to 10 years using Big Objects storage, fulfilling regulatory retention mandates.

---

### 4. Enterprise Integration Architecture

The official **Data Integration Decision Guide** outlines 6 canonical integration patterns:

```
┌──────────────────────────────┬──────────────────┬─────────────────┬───────────────────────────────┐
│ Pattern Name                 │ Type             │ Timing          │ Standard Mechanism            │
├──────────────────────────────┼──────────────────┼─────────────────┼───────────────────────────────┤
│ 1. Request and Reply         │ Process / Data   │ Synchronous     │ Apex HTTP Callouts / Flow     │
│                              │                  │                 │ External Services, Named Creds│
├──────────────────────────────┼──────────────────┼─────────────────┼───────────────────────────────┤
│ 2. Fire and Forget           │ Process / Event  │ Asynchronous    │ Platform Events, Pub/Sub API, │
│                              │                  │                 │ Change Data Capture (CDC)     │
├──────────────────────────────┼──────────────────┼─────────────────┼───────────────────────────────┤
│ 3. Batch Data Synchronization│ Data             │ Asynchronous    │ Bulk API 2.0, ETL (MuleSoft/  │
│                              │                  │ Scheduled       │ Informatica), Watermarking    │
├──────────────────────────────┼──────────────────┼─────────────────┼───────────────────────────────┤
│ 4. Remote Call-In            │ Process / Data   │ Synchronous     │ Salesforce REST / SOAP API,   │
│                              │                  │                 │ Custom Apex REST Web Services │
├──────────────────────────────┼──────────────────┼─────────────────┼───────────────────────────────┤
│ 5. UI Update on Data Change  │ Process / UX     │ Near Real-Time  │ Pub/Sub API streaming to LWC, │
│                              │                  │ Event-Driven    │ Lightning EMP API             │
├──────────────────────────────┼──────────────────┼─────────────────┼───────────────────────────────┤
│ 6. Data Virtualization       │ Virtual Access   │ Synchronous     │ Salesforce Connect, External  │
│                              │                  │ On-Demand       │ Objects (OData 2.0/4.0, Cross)│
└──────────────────────────────┴──────────────────┴─────────────────┴───────────────────────────────┘
```

#### Deep Integration Best Practices:
- **Named Credentials v2 (Two-Tier Model):** Separates endpoint configuration (`Named Credential`) from authentication protocols and cryptographic handshakes (`External Credential`). Supports OAuth 2.0 Client Credentials, JWT Bearer, AWS Signature V4, and Per-User / Named Principals mapped via Permission Sets.
- **Platform Event Publish Behavior:**
  - `Publish After Commit`: Default for transactional consistency. Event fires only if the DML transaction succeeds, avoiding phantom notifications if a transaction rolls back.
  - `Publish Immediately`: Bypasses transactional boundaries. Use strictly for logging, audit trails, or error recording where visibility is required even during transaction aborts.
- **Pub/Sub API (gRPC / HTTP/2):** Replaces legacy CometD/Bayeux streaming. Supports high-throughput, bidirectional streaming, binary Apache Avro serialization, and event replay from a 72-hour retention bus using 64-bit Replay IDs.

---

## Section III: Data 360 / Data Cloud Architecture Taxonomy

```
   INGESTION             PERSISTENCE           HARMONIZATION           ACTIVATION
┌─────────────┐       ┌───────────────┐       ┌──────────────┐       ┌──────────────┐
│ Connectors  │  ──►  │   Data Lake   │  ──►  │  Data Model  │  ──►  │ Data Actions │
│ CRM, S3,    │       │ Objects (DLO) │       │ Objects(DMO) │       │ Flow, Events,│
│ Streaming   │       │ Iceberg/Parq  │       │ Customer 360 │       │ Webhooks     │
└─────────────┘       └───────────────┘       └──────────────┘       └──────────────┘
       ▲                                              │                      │
       │ ZERO COPY FEDERATION                         ▼                      ▼
┌─────────────┐                             ┌────────────────┐       ┌──────────────┐
│  Snowflake, │                             │    IDENTITY    │       │ AGENTFORCE   │
│ Databricks, │                             │   RESOLUTION   │       │ RAG & Memory │
│  BigQuery   │                             │ Unified Profile│       │ Context Graph│
└─────────────┘                             └────────────────┘       └──────────────┘
```

### 1. Ingestion & Storage Architecture
- **Hyperforce Foundation:** Multi-tenant elastic cloud architecture running on AWS/GCP, ensuring zero-trust security and multi-region resilience.
- **Lakehouse Storage Layer:** Standardized on **Apache Iceberg** table format backed by **Apache Parquet** columnar files on object stores (S3, Azure Blob, GCS). Features schema evolution, time travel, atomic commits, and snapshot diffs.
- **Low-Latency Store (LLS):** A petabyte-scale **NVMe (SSD) storage tier** augmented with in-memory caching. Operates in sub-second latency to power real-time session tracking, Agentic conversational memory, and immediate personalization.
- **Data Spaces:** Logical containers providing data-level and metadata-level isolation within a single Data Cloud tenant. Controls tenant visibility, prevents cross-domain data leakage, and integrates natively with Permission Sets.

### 2. DLO to DMO Mapping & Cloud Information Model (CIM)
- **Data Lake Objects (DLO):** The immutable, persistent raw ingestion layer representing source tables, streaming topics, or federated data.
- **Data Model Objects (DMO):** The harmonized canonical layer structured according to the **Customer 360 Data Model** (derived from the Cloud Information Model - CIM). Standard subject areas include:
  - *Party Model:* `Individual`, `Account`, `ContactPointAddress`, `ContactPointEmail`, `ContactPointPhone`.
  - *Engagement Model:* `SalesOrder`, `DeviceApplicationEngagement`, `WebEngagement`.
- **Unstructured Data Lake Objects (UDLO):** Directory tables holding structured metadata, vector embeddings, and chunk locations for non-tabular content (PDFs, audio, video, transcripts).
- **Data Lineage & Tag Propagation:** When ABAC security tags (e.g., `PII.Email`, `FinancialData`) are placed on source DLOs, Data 360 propagates these tags across downstream transformations to DMOs, maintaining continuous data governance.

### 3. Identity Resolution & Unified Customer Profiles
Identity Resolution bridges disparate cross-channel identifiers into a single **Unified Profile** (without overwriting source data).

```
Disparate Source Records (CRM, Web, Mobile, ERP)
                        │
                        ▼
     Candidate Selection (Blocking Keys & LSH Indexing)
                        │
                        ▼
     Deep Matching (Deterministic & Probabilistic Rules)
                        │
                        ▼
    Clustering & Graph Unification (Transitive Matching: A=B, B=C ═► A=B=C)
                        │
                        ▼
    Reconciliation Rules Execution (Attribute Selection)
                        │
                        ▼
       Unified Individual Profile (Unified Link Objects)
```

- **Candidate Selection (Blocking Keys):** Evaluates records using deterministic keys (e.g., exact normalized email prefix, phone hash) or Locality Sensitive Hashing (LSH) for fuzzy vector candidate matching.
- **Deep Matching Rules:**
  - *Exact Match:* Strict equality on high-fidelity identifiers (National ID, Loyalty Number, Normalized Email).
  - *Fuzzy Match:* AI-tuned distance models (Levenshtein, Jaro-Winkler) on names and street addresses.
- **Clustering & Transitive Closure:** If Record A matches Record B, and Record B matches Record C, all three records are clustered under a single `UnifiedRecordId`.
- **Reconciliation Rules (Populating Unified Profile Attributes):**
  - `Most Frequent`: Winning value is the one appearing most often across clustered records.
  - `Most Recent`: Winning value is chosen from the source record with the newest `LastModifiedDate`.
  - `Source Priority`: Explicit ranking of authoritative source systems (e.g., Core CRM > Billing ERP > Marketing Engagement).

### 4. Event-Driven Processing: SNCE, CDF, & Data Actions
- **Storage Native Change Events (SNCE):** Reactive notification emitted by the object store catalog whenever an atomic metadata commit occurs on an Iceberg table, replacing inefficient polling loops.
- **Change Data Feed (CDF):** Computes and delivers incremental row-level diffs (`INSERT`, `UPDATE`, `DELETE`) within the Iceberg writer, enabling streaming transforms and streaming insights to process only changed delta records.
- **Calculated Insights (CI):**
  - *Batch Calculated Insights:* Complex, multi-dimensional metrics executed via Spark SQL (e.g., Lifetime Customer Value, Recency-Frequency-Monetary scores).
  - *Streaming Insights:* Continuous metrics computed via Spark Structured Streaming over near real-time engagement streams.
- **Data Actions:** Active alerting and automation pipeline. Triggers when streaming metrics cross configured business thresholds (e.g., Churn Risk > 85%, Balance Drops < $100), firing:
  - Salesforce Flow (High-scale orchestration).
  - Platform Events (Decoupled bus publication).
  - External Webhooks (Immediate third-party notification).

### 5. Zero Copy Architecture & Multi-Org Federation
- **Inbound Query Federation:** Data 360 queries external lakehouses (**Snowflake, Google BigQuery, AWS Redshift, Databricks, Microsoft Fabric**) on-demand via JDBC with intelligent query pushdown, reading external data as native DLOs without data copying.
- **Inbound File Federation:** Reads external tables directly at the storage layer when exposed via the **Apache Iceberg REST Catalog (IRC)** over Parquet files, eliminating compute translation layers.
- **Outbound Data Sharing (DaaS API):** Exposes Data 360 harmonized DMOs and Unified Profiles directly to external platforms (Snowflake Secure Data Sharing, Databricks Delta Sharing) via governed Iceberg metadata pointers.
- **Data Cloud One:** Connects a central "Home Org" (hosting Data 360) to multiple "Companion Orgs" via Zero Copy metadata synchronization, eliminating multi-org CRM fragmentation.
- **Data Clean Rooms:** Secure, privacy-preserving multiparty computation environments where partners perform joint audience overlap analysis on encrypted keys without exposing raw customer data.

---

## Section IV: Agentforce & Agentic Enterprise Architecture Taxonomy

```
                       ┌─────────────────────────────────────────┐
                       │          EINSTEIN TRUST LAYER           │
                       │  Prompt Defense │ PII Masking │ Zero Ret│
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │         ATLAS REASONING ENGINE          │
                       │   Goal Decomposition & Graph Execution  │
                       └──────┬───────────────────────────┬──────┘
                              │                           │
                              ▼                           ▼
                     ┌──────────────────┐       ┌──────────────────┐
                     │  TOPIC ROUTING   │       │ ACTION EXECUTION │
                     │ Boundaries & Scope│       │ Flow, Apex, Mule │
                     └──────────────────┘       └──────────────────┘
                              ▲                           │
                              │                           ▼
                     ┌──────────────────┐       ┌──────────────────┐
                     │    DATA 360      │       │ HUMAN ESCALATION │
                     │ Context & RAG    │       │ Omni-Channel HITL│
                     └──────────────────┘       └──────────────────┘
```

### 1. Agent Development Lifecycle (ADLC)
The ADLC adapts software engineering rigor to non-deterministic, probabilistic AI agents:

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│ 1. IDEATION     │       │ 2. DEVELOPMENT   │       │ 3. TESTING &    │
│    & DESIGN     │  ──►  │    (Inner Loop)  │  ──►  │    VALIDATION   │
│ Goals, Persona, │       │ Topics, Prompts, │       │ Simulator, AFDX,│
│ Tools, Scope    │       │ Invocable Actions│       │ Adversarial QA  │
└─────────────────┘       └──────────────────┘       └─────────────────┘
                                                              │
                                                              ▼
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│ 5. MONITORING   │       │ 4. DEPLOYMENT    │       │ 4b. ACTIVATION  │
│    & TUNING     │  ◄──  │    & RELEASE     │  ◄──  │ Version Control,│
│ (Outer Loop)    │       │ Change Sets, CI, │       │ Explicit Admin  │
│ STDM & Moments  │       │ Canary Rollout   │       │ Enablement      │
└─────────────────┘       └──────────────────┘       └─────────────────┘
```

1. **Ideation & Design:** Articulate business objectives, agent persona (tone, empathy), operational boundaries, and required system tools. Collect a representative corpus of user utterances.
2. **Development (Inner Loop):** Build agent logic using **Agent Builder** (declarative) or **Agentforce Developer Experience (AFDX) / Python SDK** (pro-code). Configure `agentSpec.yaml`, implement topics, bind Invocable Actions (Flow, Apex, MuleSoft), and configure RAG retrieval pipelines against Data 360.
3. **Testing & Validation:**
   - *Manual Testing:* Agent Simulator and Plan Tracer to inspect step-by-step reasoning paths.
   - *Automated Batch Testing:* Agent Testing Center and AFDX Test Suite running up to 1,000 test cases with semantic quality scoring.
   - *Deterministic Unit Testing:* Apex test classes covering underlying Invocable Actions.
   - *Adversarial QA:* Challenging agent guardrails with jailbreak prompts and edge cases.
4. **Deployment & Release:** Package metadata (`Bot`, `BotVersion`, `GenAiPlannerBundle`). Promote through CI/CD pipelines to sandboxes and production. Agent deployment is decoupled from **Activation** (requires explicit administrative enablement). Versioning allows instant rollback to last-known-good versions.
5. **Monitoring & Tuning (Outer Loop):** Observe production logs using the **Session Tracing Data Model (STDM)** in Data 360. Leverage **Agentforce Optimization** to group sessions into "Moments," identifying topic drift, common failure points, and escalation drivers.

---

### 2. Atlas Reasoning Engine Architecture
The Atlas Reasoning Engine is the runtime state machine executor powering Agentforce:
- **Agent Graph Traversal:** Breaks complex user requests into dynamic multi-step execution plans. Traverses graph nodes representing topics, actions, and evaluation checkpoints.
- **Hybrid Deterministic/Probabilistic Logic:** Executes deterministic logic (Apex, Flow, API validations) with fixed predictability; invokes LLM generation only at prompt instruction nodes.
- **Dynamic Context Grounding:** Injects real-time customer data, unified profile graphs, and RAG knowledge chunks directly into the prompt context prior to model evaluation.
- **Multi-Turn Reasoning & Memory:** Maintains session memory across conversational turns, detecting topic switches and preserving context without repetitive questioning.

---

### 3. Topics, Actions, and Guardrails Architecture
- **Topics:** High-level functional domains representing an agent's responsibilities (e.g., `Order_Management`, `Billing_Inquiry`).
  - *Topic Scope Hygiene:* Topics must be cleanly separated with non-overlapping descriptions to prevent classification thrashing.
  - *Topic Instructions:* Rules defining exact boundaries, what the agent is allowed to do, and required variables before firing actions.
- **Actions (Tools):** Callable capabilities exposed to the reasoning engine:
  - *Informational Actions:* Data 360 Unified Query, Knowledge RAG retrievers.
  - *Transactional Actions:* Invocable Apex, Autolaunched Flows, MuleSoft Anypoint APIs.
  - *Action Contracts:* Every action must have explicit parameter descriptions and return compact, structured responses to minimize context bloat.
- **Guardrails:**
  - *System Guardrails:* Platform-level policies blocking unsafe topics, toxicity, and unauthorized data mutations.
  - *Conversational Boundaries:* Clear negative instructions instructing the agent when to state inability and when to execute an escalation.
  - *Human-in-the-Loop (HITL) Escalation:* Seamless handoff to human representatives via Omni-Channel routing, passing complete session traces and context summaries.

---

### 4. Einstein Trust Layer Architecture

```
User Input
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Dynamic Grounding & Context Ingestion (Data 360)         │
├─────────────────────────────────────────────────────────────┤
│ 2. Prompt Defense (Jailbreak Detection, Heuristic Scanning) │
├─────────────────────────────────────────────────────────────┤
│ 3. PII / PHI Masking (Named Entity Recognition - NER)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Clean, Masked Prompt)
                               ▼
            ┌────────────────────────────────────┐
            │ External Foundation LLM Provider   │
            │ (OpenAI, Anthropic, Bedrock, etc.) │
            │      * ZERO DATA RETENTION *       │
            └──────────────────┬─────────────────┘
                               │ (Raw Model Response)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. De-Masking (Rehydrating Identifiers for Salesforce User) │
├─────────────────────────────────────────────────────────────┤
│ 5. Toxicity Scoring & Content Moderation                    │
├─────────────────────────────────────────────────────────────┤
│ 6. Audit Trail Logging (Saved in Customer Data Cloud Org)   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
Response Delivered / Action Triggered
```

- **Dynamic Grounding:** Grounds prompts in authenticated CRM and Data 360 data, minimizing hallucinations.
- **Prompt Defense:** Scans incoming prompts for jailbreak patterns, prompt injection attacks, and malicious system prompt overrides.
- **PII / PHI Masking:** Uses Machine Learning and Named Entity Recognition (NER) to detect sensitive data (SSNs, credit cards, emails, phone numbers, health data) and replaces them with cryptographic surrogate tokens before sending payloads to LLMs.
- **Zero Data Retention:** Strict legal and technical agreements with foundation LLM providers ensuring customer prompts and responses are **never logged, never retained, and never used to train base models**.
- **Toxicity & Safety Scoring:** Analyzes model output for hate speech, sexual content, profanity, and violence, blocking responses that breach thresholds.
- **Audit Trail:** Captures the full prompt, grounding metadata, model version, latency, and toxicity score in Data 360 / Event Monitoring for compliance, legal discovery, and governance.

---

### 5. Multi-Agent Orchestration Patterns & Archetypes

#### Orchestration Archetypes:
1. **SOMA (Single Org, Multiple Agents):** A central Supervisor Agent routes tasks to specialized worker agents within one Salesforce org using shared governance, Data 360 context, and the Agentforce MCP Client.
2. **MOMA (Multi Org, Multiple Agents):** Supervisor agents coordinate across multiple Salesforce orgs using the standardized **Agent-to-Agent (A2A)** protocol, respecting org-level security boundaries and passing identity context.
3. **Multi-Vendor A2A (Salesforce-Led):** Salesforce Agentforce acts as the primary orchestrator, delegating subtasks to external agents (Google Vertex, LangGraph, Azure AI) via A2A or MuleSoft agent facades.
4. **Multi-Vendor A2A (MuleSoft-Led):** An external enterprise portal uses MuleSoft Conductor as a neutral orchestrator, routing tasks to Agentforce for CRM/service execution.

#### Canonical Agentic Design Patterns (Maturity Levels 0–4):

```
┌───────────────────┬──────────────┬───────────────┬───────────────────────────────────────────┐
│ Pattern Name      │ Category     │ Maturity Level│ Core Architectural Function               │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Greeter           │ Interaction  │ Level 1       │ Classifies natural language intent and    │
│                   │              │               │ executes warm handoff to human agent.     │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Operator          │ Interaction  │ Level 2       │ Triages requests, negotiates intent, and  │
│                   │              │               │ transfers to specialist agents or humans. │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Orchestrator      │ Interaction  │ Level 3       │ Manages agent swarm; remains primary POC, │
│                   │              │               │ delegating to worker agents & aggregating.│
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Listener / Feed   │ Interaction  │ Level 3       │ Listens to live conversation turns and    │
│                   │              │               │ surfaces assistive context in CRM feed.   │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Workspace (Radar) │ Interaction  │ Level 3       │ Dynamically updates single-pane-of-glass  │
│                   │              │               │ LWC portlets based on conversation flow.  │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Answerbot         │ Specialist   │ Level 1       │ Performs natural language RAG knowledge   │
│                   │              │               │ retrieval with citations & summarization. │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Domain SME        │ Specialist   │ Level 2       │ Front-ends specific business data domain  │
│                   │              │               │ (Orders, Claims) executing CRUD actions.  │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Interrogator      │ Specialist   │ Level 2       │ Assembles context across disparate silos  │
│                   │              │               │ to answer cross-domain queries.           │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Prioritizer       │ Specialist   │ Level 2       │ Performs qualitative ranking over tasks or│
│                   │              │               │ Next Best Actions using LLM reasoning.    │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Generator         │ Utility      │ Level 1       │ Produces structured content (emails, case │
│                   │              │               │ summaries, wrap-ups) from prompt inputs.  │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Data Steward      │ Utility      │ Level 2       │ Autonomous background agent validating and│
│                   │              │               │ enriching record fields prior to save.    │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Zen Data Gardener │ Utility      │ Level 4       │ Scheduled background agent grooming data, │
│                   │              │               │ conforming unconnected domains over time. │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Configurer        │ Utility      │ Level 4       │ Generates or validates complex JSON/CSV/  │
│                   │              │               │ metadata configs from natural language.   │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Judge & Jury      │ Utility      │ Level 2       │ Uses ensemble juror agents + judge to     │
│                   │              │               │ evaluate congruence and kill hallucination│
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Model of Models   │ Utility      │ Level 2       │ Gathers diverse expert model viewpoints   │
│                   │              │               │ and synthesizes consensus.                │
├───────────────────┼──────────────┼───────────────┼───────────────────────────────────────────┤
│ Project Manager   │ Long-Running │ Level 4       │ Oversees multi-week workflows, instanti-  │
│                   │              │               │ ating tasks, tracking milestones & alerts.│
└───────────────────┴──────────────┴───────────────┴───────────────────────────────────────────┘
```

---

## Section V: ArcGym Master Curriculum Taxonomy & Practice Matrix

The following matrix connects enterprise topics with canonical antipatterns, Well-Architected grounding citations, and ArcGym drill archetypes:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ARCGYM DRILL FORMAT ARCHETYPES                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LESSON:      A guided 2-minute study introducing a high-stakes design tension.         │
│ RAPID FIRE:  Rapid judgment under time pressure, calibrating certainty vs. risk.       │
│ CURRENCY:    Allocating scarce Architect Budgets (Limits, Tokens, Credits, Tech Debt). │
│ SCENARIO:    Multi-turn executive trade-off balancing Stakeholder Standing (0-100).    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Master Taxonomy Matrix

| Domain & Topic | Core Architectural Trade-Off | Canonical Antipattern | Well-Architected Grounding | Ideal Drill Format |
| :--- | :--- | :--- | :--- | :--- |
| **Core: Record-Triggered Automation** | Synchronous compute speed vs. Transaction execution time | **"Process Frankenstein":** Triggering heavy DML and external callouts inside an After-Save Flow, causing row locks and governor limit crashes. | [Record-Triggered Automation Decision Guide](https://architect.salesforce.com/decision-guides) | Rapid Fire / Currency (Governor Budget) |
| **Core: Asynchronous Processing** | High-throughput batching vs. Real-time event consumption | **"Future Abuse":** Spawning dozens of unmonitored `@future` jobs that fail silently and hit concurrent execution ceilings. | [Asynchronous Processing Decision Guide](https://architect.salesforce.com/decision-guides) | Lesson |
| **Core: Large Data Volumes** | Granular master-detail relationships vs. Lock contention & skew | **"The God Account":** Linking 500,000 child cases to a single parent account, triggering constant `UNABLE_TO_LOCK_ROW` during bulk imports. | [Large Data Volumes Best Practices](https://architect.salesforce.com/fundamentals) | Currency (Lock Contention Budget) |
| **Core: SOQL Optimization** | Real-time cross-object formula calculations vs. Query selectivity | **"The Unindexed Formula Scan":** Writing SOQL filters on non-deterministic formulas containing `NOW()`, causing Full Table Scans across 10M rows. | [SOQL Selectivity & Query Plan Tool](https://developer.salesforce.com) | Rapid Fire |
| **Core: Sharing & Visibility** | Restrictive compliance visibility vs. System recalculation scale | **"Deep Hierarchy Overkill":** Designing a 12-level role tree with thousands of criteria-based sharing rules, causing multi-hour sharing freezes. | [Sharing Architecture Decision Guide](https://architect.salesforce.com/fundamentals) | Scenario (CISO vs Operations) |
| **Core: Security Boundaries** | UI productivity filtering vs. Authoritative security enforcement | **"Scoping Rules as Security":** Relying on Scoping Rules to protect confidential financial records, which leaks via API calls and direct URLs. | [Well-Architected Trust Pillar](https://architect.salesforce.com/well-architected) | Rapid Fire |
| **Core: Enterprise Integration** | Immediate user confirmation vs. Thread pool exhaustion | **"Sync Callout Trap":** Executing long-running synchronous Apex callouts in the UI without Continuation, exhausting thread limits. | [Integration Patterns: Request-Reply](https://architect.salesforce.com/fundamentals/integration-patterns) | Scenario (Sales Rep UX vs CTO Reliability) |
| **Core: Event Architecture** | Transactional integrity vs. Immediate audit visibility | **"Phantom Publish":** Setting Platform Events to `Publish Immediately` for order fulfillment, triggering ERP shipping on failed DML. | [Event-Driven Architecture Guide](https://architect.salesforce.com/fundamentals/integration-patterns) | Lesson |
| **Data: Lakehouse Ingestion** | High-velocity streaming ingestion vs. Data Cloud consumption credits | **"Streaming Everything":** Ingesting batch ERP logs via streaming APIs instead of daily batch transforms, burning through flex credits. | [Data 360 Architecture Fundamentals](https://architect.salesforce.com/fundamentals/data-360-architecture) | Currency (Credit Budget) |
| **Data: DLO to DMO Mapping** | Source-specific data preservation vs. Canonical standardization | **"The Raw Passthrough":** Mapping raw proprietary DLO schemas directly into custom objects without harmonizing to the Party/Engagement Model. | [Model Data in Data 360](https://developer.salesforce.com) | Lesson |
| **Data: Identity Resolution** | Aggressive customer match coverage vs. Profile pollution | **"Fuzzy Over-Clustering":** Configuring aggressive fuzzy matching on common last names and zip codes without blocking keys, merging distinct individuals. | [Data 360 Identity Resolution Guide](https://architect.salesforce.com/fundamentals/data-360-architecture) | Scenario (Marketing CMO vs Data Protection Officer) |
| **Data: Zero Copy Interoperability** | Moving data into Salesforce for triggers vs. Virtual federation | **"ETL Data Hoarding":** Duplicating 50TB of Snowflake telemetry data into Data Cloud storage instead of establishing Iceberg Zero Copy federation. | [Data 360 Interoperability Decision Guide](https://architect.salesforce.com/decision-guides) | Currency (Storage & Egress Budget) |
| **Data: Data Actions** | Proactive customer alerts vs. Downstream event storms | **"The Data Action Avalanche":** Configuring high-frequency streaming insights with zero threshold hysteresis, firing 50,000 Flow invocations per hour. | [Data 360 Architecture: Active Data](https://architect.salesforce.com/fundamentals/data-360-architecture) | Rapid Fire |
| **Agent: ADLC Methodology** | Rapid production prototyping vs. Controlled version activation | **"Direct-to-Prod Prompting":** Tweaking agent instructions directly in production orgs without versioning, breaking live customer service routing. | [Agent Development Lifecycle Guide](https://architect.salesforce.com/fundamentals/agent-development-lifecycle) | Scenario (Business Agility vs Compliance) |
| **Agent: Topic Scoping** | Broad multi-purpose agent topics vs. Classification accuracy | **"The Omniscient Topic":** Creating 30 overlapping topics on a single agent, triggering constant misclassifications and off-topic loops. | [Enterprise Agentic Architecture](https://architect.salesforce.com/fundamentals/enterprise-agentic-architecture) | Rapid Fire |
| **Agent: Invocable Action Hygiene** | Rich conversational context vs. LLM token limits and latency | **"The Verbose Payload":** Returning 50-field JSON payloads from Apex actions to the reasoning engine, causing context exhaustion and high latency. | [Agent Development Lifecycle: Building Agents](https://architect.salesforce.com/fundamentals/agent-development-lifecycle) | Currency (Context Token Budget) |
| **Agent: Guardrails & Escalation** | Full bot self-resolution rate vs. Regulatory & brand liability | **"No Exit Chatbot":** Locking an agent in circular recovery loops without Human-in-the-Loop Omni-Channel escalation paths for frustrated users. | [Enterprise Agentic Architecture: Interaction Patterns](https://architect.salesforce.com/fundamentals/enterprise-agentic-architecture) | Scenario (VP Customer Support Standing) |
| **Agent: Trust Layer Compliance** | Model generation quality vs. Data privacy and leakage | **"Trust Layer Bypass":** Writing custom Apex HTTP callouts to OpenAI endpoints, completely bypassing the Einstein Trust Layer and zero retention guarantees. | [Well-Architected Trust: Agentic Trust](https://architect.salesforce.com/well-architected) | Rapid Fire |
| **Agent: Multi-Agent Archetypes** | Monolithic all-in-one agent vs. Governed specialized swarm | **"The Monolithic Titan":** Forcing all enterprise business capabilities into one massive agent rather than adopting the SOMA / Orchestrator pattern. | [Enterprise Agentic Architecture: Archetypes](https://architect.salesforce.com/fundamentals/enterprise-agentic-architecture) | Lesson |

---

## Section VI: Architectural Decision Evaluation Rubric

ArcGym assesses architectural judgment rather than rote memorization. The evaluation engine scores responses across four objective dimensions:

```
┌────────────────────────────────────────────────────────────────────────┐
│                 ARCGYM ARCHITECTURAL JUDGMENT RUBRIC                   │
└───────────────────────────────────┬────────────────────────────────────┘
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ 1. JUDGMENT      │      │ 2. CONFIDENCE    │      │ 3. TRADE-OFF     │
│    QUALITY       │      │    CALIBRATION   │      │    ARTICULATION  │
│ (Pillar Alignment│      │ (Certainty vs.   │      │ (Multi-Pillar    │
│  & Scale Feas.)  │      │  Correctness)    │      │  Tension Balance)│
└──────────────────┘      └──────────────────┘      └──────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ 4. BLAST RADIUS  │
                          │    & SYSTEMIC    │
                          │    CONSEQUENCES  │
                          └──────────────────┘
```

### Rubric Dimension Definitions

#### 1. Judgment Quality (Score: 1–5)
- **Level 1 (Critical Failure):** Recommends antipatterns that violate platform governor limits, breach data privacy, cause data loss, or create single points of failure.
- **Level 2 (Suboptimal):** Selects an approach that functions at low volume but ignores platform scalability, multitenant boundaries, or lifecycle governance.
- **Level 3 (Competent):** Selects a viable, supported pattern that meets requirements but introduces unnecessary maintenance, costs, or architectural debt.
- **Level 4 (Advanced):** Selects the optimal Well-Architected pattern, strictly observing governor limits, data tiers, and security controls.
- **Level 5 (Distinguished / CTA-Caliber):** Synthesizes the optimal architectural pattern while anticipating long-term platform evolution, composability, and enterprise operational maturity.

#### 2. Confidence Calibration (Score: -2 to +3)
- **High Certainty (80–100%) + Correct Decision (+3):** Validated mastery; architect understands the fundamental trade-offs.
- **Low Certainty (20–40%) + Correct Decision (+1):** Correct hunch; requires drill reinforcement to anchor knowledge.
- **Low Certainty (20–40%) + Incorrect Decision (-0.5):** Healthy humility; architect recognizes the limits of their knowledge.
- **High Certainty (80–100%) + Incorrect Decision (-2):** Dangerous illusion of competence; highest risk in high-stakes enterprise implementations.

#### 3. Trade-Off Articulation (Score: 1–5)
- **Level 1:** Argues for a single "magic bullet" feature without recognizing any negative consequences.
- **Level 2:** Acknowledges a drawback only when prompted, framing decisions purely as feature preferences.
- **Level 3:** Identifies the primary tension between two pillars (e.g., speed vs. cost).
- **Level 4:** Maps multi-pillar impacts (e.g., how improving Trust via Shield deterministic encryption impacts Reliability via query selectivity).
- **Level 5:** Evaluates trade-offs dynamically across near-term project constraints and long-term Total Cost of Ownership (TCO).

#### 4. Blast Radius & Systemic Consequences (Score: 1–5)
- **Level 1:** Blind to downstream effects; ignores concurrent locking, trigger recursion, and asynchronous queue exhaustion.
- **Level 2:** Considers only immediate object boundaries; ignores cross-system API rate limits and data sync cascades.
- **Level 3:** Understands transactional boundaries and standard governor limits.
- **Level 4:** Anticipates ecosystem-wide ramifications (e.g., how Identity Resolution over-clustering impacts downstream marketing consent compliance).
- **Level 5:** Complete architectural foresight: designs comprehensive circuit breakers, dead-letter fallbacks, and zero-downtime rollback strategies.

---

## Conclusion & Next Implementation Steps

This taxonomy serves as the foundational data model for the ArcGym drill generation pipeline. Subsequent tickets will ingest these topics, antipatterns, and evaluation rubrics to construct interactive drills across the four defined archetypes (Lesson, Rapid Fire, Currency, Scenario), grounded directly in `architect.salesforce.com`.
