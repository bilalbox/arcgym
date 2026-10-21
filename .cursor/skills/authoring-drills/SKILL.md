---
name: authoring-drills
description: High-touch HITL wizard to author, ground, validate, and play-test an Incident (Troubleshooting drill) one at a time. Use when the user wants to author a new drill.
---

# Authoring Drills (HITL Interactive Wizard)

You are the model. This skill guides the user through an interactive, human-in-the-loop (HITL) authoring workout to produce one high-quality Troubleshooting Incident drill grounded in official Salesforce Well-Architected documentation.

Do not rush or dump an ungrounded drill. Walk through each step with the user, soliciting their input at every stage.

---

## Step 1: Select Architectural Domain & Pillar

1. Query the available domains and their pattern coverage:

   ```bash
   npx tsx scripts/generator/explore-patterns.ts domains
   ```

2. Present the 7 official Architectural Domains to the user:
   - Platform Core (`Platform_Core`)
   - Data Architecture (`Data_Architecture`)
   - Security & Access (`Security_And_Access`)
   - Integration APIs (`Integration_Apis`)
   - AI & Automation (`Ai_And_Automation`)
   - Infrastructure (`Infrastructure`)
   - DevOps Lifecycle (`Devops_Lifecycle`)

3. Ask the user which domain and primary Well-Architected pillar (Reliability, Trust, Operational Excellence, Cost Optimization) they want to focus on.

---

## Step 2: Topology & Incident Symptom Discovery

1. Query candidate patterns or Friction Cards for the chosen domain:

   ```bash
   npx tsx scripts/generator/explore-patterns.ts patterns --domain <Domain>
   ```

2. Establish the failure scenario:
   - **Architecture synopsis**: A concise narrative of the steady-state system architecture (max ~120 words).
   - **Diagram URL**: Required authored diagram (e.g., from `/diagrams/*.svg` or composed via `@arcgym/diagrams`).
   - **Issue**: The observed failure symptom (e.g. intermittent timeout, lock contention, sync lag). **Crucial rule**: Never leak the gold cause in the issue description.

---

## Step 3: Diagnostic Probes Design

1. Author a pool of ~5 to 7 diagnostic probes (clarifying questions) with a Probe Budget (typically 3):
   - **At least 2 Pivotal Probes** (`tier: "pivotal"`): Scenario findings that directly unlock the root cause.
   - **Useful Probes** (`tier: "useful"`): Helpful operational findings that narrow system state without revealing the smoking gun.
   - **Distractor Probes** (`tier: "distractor"`): Irrelevant rabbit holes modeling real practitioner misdirections, with `distractorAntipattern`.
2. Ensure probe labels end with `?` and probe answers are scenario facts only (never architectural advice or spoilers).

---

## Step 4: Gold Cause & 3 Hidden Antipattern Distractors

1. Retrieve official Well-Architected Grounding chunks for the root cause mechanism:

   ```bash
   npx tsx scripts/generator/explore-patterns.ts ground --query "<selected pattern doc query>" --top-k 3
   ```

2. Author:
   - **Gold Cause**: 1–2 sentences naming the root cause mechanism, its architectural rationale, and verified `citationUrl` from the Citation Manifest.
   - **Exactly 3 Hidden Distractors**: Plausible alternative causes modeling common real-world practitioner antipatterns (e.g. from Friction Cards). Each distractor must have `id`, `text`, `antipattern`, and `rationale`. Hidden distractors are graded silently via CLEF and never shown as multiple-choice options.

---

## Step 5: Architectural Fix Step

1. Author the remediation decision step presented after the gold cause is revealed:
   - **Prompt**: e.g. "Select the architectural remediation for the incident:"
   - **3 Options (MCQ)**:
     - **1 Gold Fix** (`isCorrect: true`): Authoritative remediation with `rationale` and `citationUrl` from official documentation.
     - **2 Distractor Antipattern Fixes** (`isCorrect: false`): Plausible naive remediations (e.g., upsizing compute without redesigning query) with `distractorAntipattern` and `rationale` explaining why they fail.

---

## Step 6: Interactive Drafting & User Approval

1. Present the complete JSON draft to the user for critique and review.
2. Confirm wording standards:
   - Neutral tone, no giveaway tells or officialese clues.
   - Gold cause does not leak in architecture synopsis or issue statement.
   - All 3 fix options are comparable in length (±25%).
3. Incorporate user feedback until approved.

---

## Step 7: Deterministic Ingest & Gate

1. Assemble the drill JSON following the `TroubleshootingDrillDefinition` schema:
   - Generate the next drill ID using `scripts/generator/generate-drill.ts` or inspection of `content/drills/AGD-*.json`.
   - Set `status: "draft"`.
   - Write payload to `/tmp/arcgym/<id>.json`.

2. Execute soft ingest:

   ```bash
   mkdir -p /tmp/arcgym
   npx tsx scripts/generator/generate-drill.ts ingest /tmp/arcgym/<id>.json
   ```

3. If ingest reports findings, fix `/tmp/arcgym/<id>.json` and re-ingest with `--force` until clean.

---

## Step 8: Local Studio Play-Testing

1. Present the user with a clickable link to test the incident live in the local Studio UI:
   `http://localhost:5173/dev/drills/<id>`
2. Ask the user to play through the investigation in Studio:
   - Test diagnostic probe unlocks and budget constraint.
   - Test free-text cause submission and CLEF grading.
   - Verify gold cause reveal and 3-option Fix selection.
3. Pause and wait for the user to return with their feedback.

---

## Step 9: Red-Team & Publish

1. Perform an Adversarial CTA Red-Team audit (`redteaming-drills` skill) on the clean draft.
2. Once approved, publish the drill:

   ```bash
   npx tsx scripts/set-drill-status.ts content/drills/<id>.json published
   pnpm build:drills
   ```

3. Verify that the drill compiles cleanly into `apps/arcgym-web/src/data/canonicalDrills.json`.
