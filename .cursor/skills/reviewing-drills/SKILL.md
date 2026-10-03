---
name: reviewing-drills
description: Repair dirty draft Drills from soft-ingest or red-team findings sidecars and re-ingest until clean. Use when content/drills/<id>.findings.json exists.
---

# Reviewing Drills

You are the model. A findings sidecar at `content/drills/<id>.findings.json` means the draft failed soft ingest (validation/wording) or Adversarial CTA Red-Team. You apply surgical fixes from those findings and re-ingest with `--force`. Drill Status stays `draft` — never publish from this skill.

Consume the `IngestFindings` contract from `@arcgym/drill-core` as-is. Do not invent dual grounding (Trailhead, blogs, Friction Cards). Correct-option `citationUrl` values must already be exact Citation Manifest URLs from retrieved Well-Architected Grounding chunks.

1. **Load** the draft and sidecar.

   ```bash
   # draft
   content/drills/<id>.json
   # findings
   content/drills/<id>.findings.json
   ```

   Parse `reasons`, optional `validationFindings`, optional `wordingFindings`, and optional `redteamFindings`. For grounding and asset handoff, use `findingsRequireGroundingHandoff` in drill-core (Citation Manifest mismatches, missing assets, and `dual-grounding` red-team findings are not surgically fixable).

2. **Stop early if unfixable.** When findings require grounding handoff (Citation Manifest mismatch / missing Well-Architected Grounding, missing diagram asset, or a `dual-grounding` red-team finding): do **not** invent or rewrite citations from memory. Stop and tell the user to return to the `generating-drills` skill with sharper `--query` values (Case File: one `--query` per Station) so retrieved chunks govern the decision, then re-author affected correct options from those chunks.

3. **Surgical fix** only what the findings name:
   - Wording: edit the fields at each `wordingFindings[].where` until Architect Linter wording rules are satisfied (shorten length-tells, drop verdict prefixes, fix antipattern names, etc.).
   - Validation: repair fields at each `validationFindings[].where` according to its `ruleId` (add missing `rationale` / `distractorAntipattern`, mark a correct option, fix probe pool counts or tiers, etc.). Keep scenario fiction out of Case File `brief.synopsis`.
   - Red-team (fixable rule ids only): edit the fields at each `redteamFindings[].where` for `giveaway-stem`, `distractor-restates-correct`, and `correct-too-obvious` until the trap is gone. Do not invent new Citation Manifest URLs.

4. **Re-ingest** (counts toward the session attempt budget):

   ```bash
   npx tsx scripts/generator/generate-drill.ts ingest content/drills/<id>.json --force
   ```

   Soft-ingest contract: failure keeps the draft, rewrites the sidecar, exits non-zero; success clears the sidecar and prints `✓ Saved draft drill`.

5. **Loop or stop.**
   - Success (exit 0, sidecar gone): report the drill id; status remains `draft`. Tell the parent workflow to re-run the `redteaming-drills` skill before treating the draft as ready for human publish.
   - Still failing and findings are surgically fixable: repeat from step 1, up to **3 ingest attempts** in this session.
   - After 3 failed ingest attempts: stop and report remaining findings; do not keep editing.
   - Unfixable grounding (step 2): stop immediately (does not burn further attempts on invented citations).
