---
name: reviewing-drills
description: Repair dirty draft Drills from soft-ingest findings sidecars and re-ingest until clean. Use when ingest failed and content/drills/<id>.findings.json exists.
---

# Reviewing Drills

You are the model. Soft ingest kept a draft at `content/drills/<id>.json` and wrote `content/drills/<id>.findings.json`. You apply surgical fixes from those findings and re-ingest with `--force`. Drill Status stays `draft` — never publish from this skill.

Consume the `IngestFindings` contract from `@arcgym/drill-core` as-is. Do not invent dual grounding (Trailhead, blogs, Friction Cards). Correct-option `citationUrl` values must already be exact Citation Manifest URLs from retrieved Well-Architected Grounding chunks.

1. **Load** the draft and sidecar.

   ```bash
   # draft
   content/drills/<id>.json
   # findings
   content/drills/<id>.findings.json
   ```

   Parse `reasons`, optional `wordingFindings`, and optional `buildError`. For `buildError`, use structured hints from `parseBuildErrorHints` / `findingsRequireGroundingHandoff` in drill-core (or apply the same rules by hand: Citation Manifest mismatches are not surgically fixable).

2. **Stop early if unfixable.** When findings require grounding handoff (Citation Manifest mismatch / missing Well-Architected Grounding for a correct option): do **not** invent or rewrite citations from memory. Stop and tell the user to return to the `generating-drills` skill with sharper `--query` values (Case File: one `--query` per Station) so retrieved chunks govern the decision, then re-author affected correct options from those chunks.

3. **Surgical fix** only what the findings name:
   - Wording: edit the fields at each `wordingFindings[].where` until Architect Linter wording rules are satisfied (shorten length-tells, drop verdict prefixes, fix antipattern names, etc.).
   - Validation: add missing `rationale` / `distractorAntipattern`, mark a correct option, fix other schema errors named in `buildError`. Keep scenario fiction out of Case File `brief.synopsis`.

4. **Re-ingest** (counts toward the session attempt budget):

   ```bash
   npx tsx scripts/generator/generate-drill.ts ingest content/drills/<id>.json --force
   ```

   Soft-ingest contract: failure keeps the draft, rewrites the sidecar, exits non-zero; success clears the sidecar and prints `✓ Saved draft drill`.

5. **Loop or stop.**
   - Success (exit 0, sidecar gone): report the drill id; status remains `draft`.
   - Still failing and findings are surgically fixable: repeat from step 1, up to **3 ingest attempts** in this session.
   - After 3 failed ingest attempts: stop and report remaining findings; do not keep editing.
   - Unfixable grounding (step 2): stop immediately (does not burn further attempts on invented citations).
