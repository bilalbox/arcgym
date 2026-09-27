---
name: generating-drills
description: Drill authoring for ArcGym. Use when the user wants a new drill, from a Friction Card (FC-…) or from a topic.
---

# Generating Drills

You are the model. `generate-drill.ts prompt` retrieves official chunks and prints an authoring prompt, you answer it, and `ingest` saves your answer as a draft. The prompt's rules are the authoring standard.

1. **Pick the source.**
   - Friction Card: run `python scripts/crawler/friction_cards.py export`; the card id must appear in `data/friction_cards.json`. An empty catalog means the user has approved no cards yet: stop and point them to the `extracting-friction-cards` skill.
   - Topic: pass `--topic "…"` in place of `--from-card`.

2. **Build the prompt.**

   ```bash
   mkdir -p /tmp/arcgym
   npx tsx scripts/generator/generate-drill.ts prompt --from-card FC-<id> [--format Lesson] > /tmp/arcgym/drill-prompt.md
   ```

   Stderr lists the drill id and the retrieved chunk titles. Rerun with `--query "<sharper doc search>"` until the chunks govern the problem. Done when every step or stage you plan to write has a chunk that states its governing guidance.

3. **Write the drill** as the prompt's answer, saved to `/tmp/arcgym/<drill id>.json`. Done when every correct option is grounded (its rationale restates what its cited chunk says), or, when the prompt's error rule applies, you have told the user which guidance is missing and stopped.

4. **Ingest.**

   ```bash
   npx tsx scripts/generator/generate-drill.ts ingest /tmp/arcgym/<drill id>.json
   ```

   A failure rolls the drill back and prints the linter errors; fix the JSON and rerun. Reserve `--force` for replacing a drill from this session. Done when ingest prints `✓ Saved draft drill`.

5. **Report** the drill id, the chunks cited, and, for a card, which naive approach each distractor models.
