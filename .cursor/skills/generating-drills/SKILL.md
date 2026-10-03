# Generating Drills

You are the model. `generate-drill.ts prompt` retrieves Well-Architected Grounding chunks and prints an authoring prompt, you answer it, and `ingest` saves your answer as a draft. The prompt's rules are the authoring standard.

1. **Pick the source.**
   - Friction Card: run `python scripts/crawler/friction_cards.py export`; the card id must appear in `data/friction_cards.json`. An empty catalog means the user has approved no cards yet: stop and point them to the `extracting-friction-cards` skill.
   - Topic: pass `--topic "…"` in place of `--from-card`.

2. **Build the prompt.**

   ```bash
   mkdir -p /tmp/arcgym
   npx tsx scripts/generator/generate-drill.ts prompt --from-card FC-<id> [--format Rapid_Fire|Case_File] [--stations N] > /tmp/arcgym/drill-prompt.md
   ```

   Stderr lists the drill id and the retrieved chunk titles. Pass one or more `--query "<sharper doc search>"` flags until the chunks govern the problem (multiple `--query` values are merged and deduped).

   **Case File rule:** supply a separate `--query` for each Station/dilemma you plan to write (the generator does not auto-decompose a single query into Stations). Rapid Fire may use one or more `--query` values as needed. Done when every step or station you plan to write has a chunk that states its governing guidance. Case Files always have a Brief and at least three Stations (`--stations N`, default 3).

   Example (Case File, three Stations):

   ```bash
   npx tsx scripts/generator/generate-drill.ts prompt --topic "Data 360 ingest limits" --format Case_File \
     --query "Data 360 Ingestion API limits" \
     --query "Data 360 Connect API data streams" \
     --query "Data 360 Query API authentication" \
     > /tmp/arcgym/drill-prompt.md
   ```

3. **Write the drill** as the prompt's answer, saved to `/tmp/arcgym/<drill id>.json`. Done when every correct option is grounded (its rationale restates what its cited chunk says; `citationUrl` is an exact Citation Manifest URL from retrieved chunks) and ingest reports no wording findings, or, when the prompt's error rule applies, you have told the user which guidance is missing and stopped. Case File probe answers are scenario fiction and must not leak into `brief.synopsis`. Friction Cards remain inspiration-only for Antipattern Distractors—never cite community resolutions as Well-Architected Grounding.

4. **Ingest.**

   ```bash
   npx tsx scripts/generator/generate-drill.ts ingest /tmp/arcgym/<drill id>.json
   ```

   On failure, the draft is kept at `content/drills/<id>.json` and a findings sidecar is written to `content/drills/<id>.findings.json`; ingest still exits non-zero. Hand off to the `reviewing-drills` skill to repair from that sidecar and re-ingest with `--force` (do not re-author from scratch unless that skill stops for missing Well-Architected Grounding). A clean successful ingest removes any prior findings sidecar. Reserve `--force` for replacing a drill from this session. Done when ingest prints `✓ Saved draft drill`.

5. **Report** the drill id, the chunks cited, and, for a card, which naive approach each distractor models.
