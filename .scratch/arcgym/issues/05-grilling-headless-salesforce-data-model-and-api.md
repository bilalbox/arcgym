Type: grilling
Status: resolved
Blocked by: 01, 04

# Design Headless Salesforce Data Model and API Contract

## Question

What custom objects, relationships, field definitions, and REST/GraphQL API contracts are required in the Salesforce Developer Edition org to represent drills, steps, options, attempts, confidence scores, and user streaks without hitting governor or storage limits?

## Answer

### 1. Salesforce Headless Data Model (Custom Objects Schema)

To operate permanently within a free Salesforce Developer Edition org's **5 MB data storage limit** while powering enterprise-grade drill delivery, the data model implements the **Hybrid Document Pattern**:

#### A. `ArcGym_Drill__c` (Catalog & Governance Entity)
- **Standard Header Fields**:
  - `Name` (Auto-Number: `AGD-{00000}`)
  - `Title__c` (Text 255, External ID, Required)
  - `Format__c` (Picklist: `Lesson`, `Rapid_Fire`, `Currency`, `Scenario`, Required)
  - `Curriculum_Domain__c` (Picklist: 19 domains from taxonomy, e.g. `Agentic_Atlas_Reasoning`, `Data360_Identity_Resolution`, `Core_LDV_Indexing`)
  - `Difficulty_Tier__c` (Picklist: `Associate_Domain_Architect`, `Lead_CTA`, Required)
  - `Status__c` (Picklist: `Draft`, `In_Review`, `Approved`, `Archived`)
  - `Scheduled_Date__c` (Date, Indexed, for calendar rotation)
  - `Well_Architected_Pillars__c` (Multipicklist: `Trust`, `Reliability`, `Operational_Excellence`, `Cost_Optimization`, `Fairness`)
  - `Version__c` (Number 4,0)
- **Document Store Field**:
  - `Definition_JSON__c` (Long Text Area, 131,072 chars): Holds the complete interactive payload:
    - Steps / Prompts / Snippets
    - Multiple-choice options & distractor explanations
    - Budget limits and catalog items (for Currency drills)
    - Stakeholder dialogue trees and dual-meter deltas (for Scenario drills)
    - Citations and deep-links to `architect.salesforce.com`

#### B. `ArcGym_Daily_Aggregate__c` (Global Telemetry Summary)
- Stored in the Central Dev Org to track macro-level platform benchmarks without logging individual user rows:
  - `Drill__c` (Master-Detail to `ArcGym_Drill__c`)
  - `Date__c` (Date)
  - `Total_Completions__c` (Number)
  - `Average_Accuracy__c` (Percent)
  - `Average_Brier_Score__c` (Number 4,4)
  - `Overconfidence_Count__c` (Number)
  - `Calibrated_Count__c` (Number)

#### C. `ArcGym_Attempt__c` (In-Org Package Only)
- Included only in the installable unmanaged package for architects running inside their own orgs (never stored centrally in the Dev Org):
  - `Drill_ID__c` (Text 80)
  - `User__c` (Lookup to `User`)
  - `Completed_At__c` (DateTime)
  - `Score__c` (Number)
  - `Asymmetric_Brier_Score__c` (Number 4,4)
  - `Responses_JSON__c` (Long Text Area)
  - `Streak_Count_At_Attempt__c` (Number)

---

### 2. High-Scale API Contract & Distribution Architecture

#### A. Event-Driven Outbound Webhook (Zero Runtime API Calls)
- **Trigger**: Record-Triggered Flow on `ArcGym_Drill__c` where `Status__c` changes to `Approved`.
- **Action**: Flow Apex Action invokes `ArcGym_WebhookPublisher.publish(drillId)`.
- **Payload**: Serialized JSON bundle (`DrillDefinitionDTO`).
- **Target**: Cloudflare Pages Function `/api/webhooks/publish-drill` authenticated via HMAC-SHA256 signature in `X-ArcGym-Signature`.
- **Edge Storage**: Cloudflare writes directly to **Cloudflare Workers KV** (`DRILL_KV.put(drill.scheduledDate, JSON.stringify(drill))`).
- **Runtime Access**: Public web app reads directly from Cloudflare KV edge cache in <10ms. **0 runtime API requests are consumed from the Salesforce Developer Org.**

#### B. In-Org Apex Controller (`ArcGymDrillController.cls`)
- Exposes `@AuraEnabled(cacheable=true)` methods for the In-Org Utility Bar LWC:
  - `getTodayDrill()`: Fetches the daily drill definition.
  - `recordAttempt(String submissionJSON)`: Calculates Brier score in Apex, persists `ArcGym_Attempt__c` locally in the user's org, and increments user streak.

---

### 3. Identity & Cross-Device Synchronization
- **Public Edge**: Anonymous user sessions store streaks, grace shields, and rolling 30-drill calibration in browser IndexedDB + Cloudflare D1.
- **Optional OAuth**: Salesforce OpenID Connect ("Log in with Trailblazer / Salesforce") syncs the local D1 profile to the user's Salesforce identity for multi-device portability.
