# Troubleshooting format (Incident drills)

ArcGym supports three drill formats: **Rapid Fire** (daily streak), **Case File** (Evaluation-scale recommendation under a Brief), and **Troubleshooting** (scarce-probe diagnosis ending in a free-text root-cause commit).

## Decision

Add `format: Troubleshooting` as a peer to Rapid Fire and Case File. Learner chrome surfaces it as top-level **Troubleshoot** (`/troubleshoot`, `/troubleshoot/:id`). Each unit of practice is one **Incident**: architecture synopsis + required diagram + issue, a Case File–shaped Probe Budget, then a confidence-gated free-text cause. v1 stops at cause (no remediation step).

## Grading

Cause text is graded with Workers AI `@cf/cloudflare/clef` as a **choice** decision over one authored gold cause, exactly three hidden antipattern distractors (never shown as MCQ), and a catchall **`other`** (“something else”) for vague or unmatched wrong answers. Verdict is CLEF’s argmax among those options. A bakeout against BGE reranker and CLEF-flash lived in `packages/drill-core/prototypes/cause-grade-bakeout/` (`pnpm prototype:cause-bakeout`); production uses CLEF only. Session policy lifts `gradeCause` + `troubleshootSession`. Unit tests inject CLEF probability maps — CI never calls live Workers AI.

## Scoring and progress

Soft dual score: probe quality (0–60, reuse `calculateProbeQuality`) + Brier on cause `isCorrect`. Distractor match counts as incorrect. `missedAllPivotal` is a discovery flag and does not void a correct cause. Attempts update existing Architectural Domain proficiency. No Troubleshoot daily streak in v1.

## Authoring

Friction Card → generator → soft ingest / `build-drills` → wording lint (including brief cause-leak) → red-team → `draft`/`published`. Hard rails: required diagram, ≥2 pivotal probes, exactly 3 hidden distractors, gold ≤ ~2 sentences.

## Relation to ADR 0002

ADR 0002 remains Case File–only. This ADR documents the third format beside it.
