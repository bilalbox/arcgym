---
name: redteaming-drills
description: Adversarial CTA Red-Team audit of clean draft Drills. Use after a successful ingest (no findings sidecar), or standalone on any clean draft before human publish.
---

# Redteaming Drills

You are the model. After soft ingest exits 0 and clears any findings sidecar, you audit the draft for CTA-style traps the deterministic wording linter cannot catch. On failure you write `content/drills/<id>.findings.json` with `reasons` including `redteam`. On pass you leave no sidecar. Drill Status stays `draft` — never publish from this skill.

Deterministic `ingest` / `build-drills` / CI stay schema + wording only. This skill is the third Architect Linter tier (Adversarial CTA Red-Team). Consume the `IngestFindings` / `RedTeamFinding` / `RedTeamRuleId` contract from `@arcgym/drill-core` as-is. Do not invent dual grounding (Trailhead, blogs, Friction Cards) as correct-option authority.

1. **Preconditions.**

   ```bash
   # draft (required)
   content/drills/<id>.json
   # findings (must be absent for a clean start)
   content/drills/<id>.findings.json
   ```

   - If a findings sidecar exists with only `validation` and/or `wording` reasons: stop and tell the user to finish the `reviewing-drills` skill first, then re-run this skill.
   - If a findings sidecar exists with `redteam` already: you may re-audit after repair (parent workflow), or rewrite the sidecar from a fresh audit of the current draft.
   - If no sidecar: proceed (standalone or post-ingest).

2. **Spawn a subagent** to audit the draft JSON only. Give it the four closed `RedTeamRuleId` traps and ask for zero or more findings shaped `{ ruleId, where, message }`:

   | `ruleId` | Trap |
   | :--- | :--- |
   | `giveaway-stem` | Stem / Case File brief / Troubleshooting architecture+issue leaks the correct choice or gold cause |
   | `dual-grounding` | Correct option or goldCause rests on Trailhead, blog, Friction Card, or other non–Citation-Manifest authority |
   | `distractor-restates-correct` | Wrong option / hidden distractor text or rationale restates the correct / gold governing rationale |
   | `correct-too-obvious` | Correct option or gold cause uniquely telegraphs via officialese, length, or tone beyond mechanical wording lint |

   For Troubleshooting Incidents also check: diagram required and useful; ≥2 pivotal probes; exactly 3 hidden distractors never implied as MCQ; gold ≤ ~2 sentences; probe answers stay scenario fiction.

   Well-Architected Grounding / Citation Manifest rules are unchanged: correct options must cite exact Citation Manifest URLs from retrieved chunks. Optional hosted model calls are allowed only if keys already exist in the environment; do not require them.

3. **Pass.** When the subagent returns no findings: ensure any prior findings sidecar is absent (do not create one). Report the drill id as red-team clean; status remains `draft`. Human publish stays `pnpm drill:status`.

4. **Fail.** When there is at least one finding, write the sidecar via the drill-core helper (or equivalent JSON):

   ```ts
   writeIngestFindings(drillPath, {
     drillId: '<id>',
     failedAt: new Date().toISOString(),
     reasons: ['redteam'],
     redteamFindings: [/* … */],
   });
   ```

   Then hand off to `reviewing-drills` for surgical repair of fixable traps. `dual-grounding` is not surgically fixable — that skill stops and returns the user to `generating-drills` with sharper `--query` values.
