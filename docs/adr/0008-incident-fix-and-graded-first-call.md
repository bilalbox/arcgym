---
status: accepted
---

# Incidents end with a Fix (First Call shelved)

> [!NOTE] Amendment (Shelved First Call):
> The "First Call" hypothesis step was shelved due to disorienting timing before learners have sufficient scenario facts or choices to form a sound hypothesis. The Incident loop proceeds directly: **probes → free-text cause → gold cause revealed → Fix**. Incident grading uses a single CLEF call for the root cause (`{ causeText }`). The Fix step and Brier scoring remain active.

ADR 0004 stopped Incidents at the root cause and showed remediations only as reading material. With Incidents now one of only two formats (ADR 0007), we extend the loop: **probes → free-text cause → gold cause revealed → Fix**. The Fix is chosen from authored options (1 cited gold fix + 2 Antipattern Distractor fixes) with a confidence rating, and is scored as Probe + Cause + Fix. We reveal the gold cause *before* the Fix so a wrong diagnosis does not also cost the remediation judgment, which keeps the two skills measured separately.

The Incident First Call is free text and is graded by the same CLEF check as the cause, without adding to the score, so the feedback screen can show which antipattern the learner's first instinct matched. This doubles Workers AI calls per Incident.

## Considered Options

- **Free-text Fix graded by CLEF**: rejected; a second free-text step adds grading noise and latency for little extra learning value.
- **Fix before cause reveal**: rejected; a wrong cause would turn the Fix into a guess about the wrong problem.

Supersedes ADR 0004's "v1 stops at cause (no remediation step)".

## Consequences

- `fix` is required on every Incident (exactly 1 cited gold fix + 2 antipattern fixes); `goldCause.remediations` is removed.
- `fix` is stripped from the client drill like `goldCause`, and returned by `/api/troubleshoot/grade` alongside the cause verdict, because fix rationales name the cause. The client scores the Fix pick locally.
- Grade request carries `{ drillId, causeText }` evaluated in a single CLEF call.
- Fix uses the same Brier decision scoring as the cause.
