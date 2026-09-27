---
name: extracting-friction-cards
description: Friction Card extraction from crawled Trailblazer Community threads. Use when the user wants new Friction Cards.
---

# Extracting Friction Cards

You are the model. `friction_cards.py prompt` prints one extraction prompt per thread, you answer them, and `import` stages your answers for the user's review. Each prompt's rules are the extraction standard.

1. **Get prompts** for threads that have no card yet, or pass `--thread <discussion_id>` for one thread:

   ```bash
   mkdir -p /tmp/arcgym
   python scripts/crawler/friction_cards.py prompt --limit 10 > /tmp/arcgym/card-prompts.md
   ```

   Done when stderr reports the threads selected; zero means every thread already has a card.

2. **Answer every prompt**, reading the whole thread (question, accepted answer, and every reply), since naive approaches usually surface in the replies. Save the answers as one JSON array at `/tmp/arcgym/cards.json`. Done when every discussion_id in the prompt file has exactly one entry and every naive approach is faithful.

3. **Import.**

   ```bash
   python scripts/crawler/friction_cards.py import /tmp/arcgym/cards.json
   ```

   Fix each `[SKIP]` entry by the reason it prints, then re-import. Done when every entry prints `[PENDING]` or `[IRRELEVANT]`.

4. **Hand off.** Approval is the user's quality gate, so your run ends with staged cards. For large backlogs, point them to `.cursor/skills/reviewing-friction-cards` (`audit-prompt` / `apply-verdicts`). Otherwise give:

   ```bash
   python scripts/crawler/friction_cards.py review   # [p] previews official docs, [e] edits the doc query
   python scripts/crawler/friction_cards.py export
   ```
