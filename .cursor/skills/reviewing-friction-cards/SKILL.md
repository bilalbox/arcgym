---
name: reviewing-friction-cards
description: Agent-assisted audit of staged Friction Cards. Use when the user wants to evaluate, triage, or apply verdicts to pending cards.
---

# Reviewing Friction Cards

You are the model. `friction_cards.py audit-prompt` prints one audit pack per staged card (card JSON + source thread + optional Chroma doc preview). You answer with verdicts; `apply-verdicts` writes statuses. The human remains the quality gate for final export.

Tiers (drill readiness):

- **A** — best answer + ≥1 naive approach (audit first)
- **B** — resolved (best_answer or thread_consensus) + ≥1 naive
- **C** — no naive approaches (often reject for drills)
- **D** — unresolved

1. **Get audit packs** for a tier (or one card):

   ```bash
   mkdir -p /tmp/arcgym
   python scripts/crawler/friction_cards.py audit-prompt --tier A --limit 20 --preview-docs > /tmp/arcgym/audit-prompts.md
   ```

   Done when stderr reports packs selected; zero means none match that tier/status.

2. **Answer every pack.** Read the staged card against the whole thread (question, accepted answer, replies). Save one JSON array at `/tmp/arcgym/verdicts.json`. Every `card_id` in the prompt file must appear exactly once.

   Verdicts:

   - `approve` — faithful and useful for distractors/scenario realism; doc query is adequate (or provide `suggested_doc_query` to tighten it on approve)
   - `reject` — not useful for drills (hallucinated naives, contradictions, pure ops/UI with no architectural tension)
   - `fix` — keep pending; set `suggested_doc_query` when the query is wrong/vague
   - `irrelevant` — no architectural decision (learning path, UI glitch, licensing, Trailhead-org-only)

3. **Apply** (dry-run first if unsure):

   ```bash
   python scripts/crawler/friction_cards.py apply-verdicts /tmp/arcgym/verdicts.json --dry-run
   python scripts/crawler/friction_cards.py apply-verdicts /tmp/arcgym/verdicts.json
   ```

   Done when every entry prints a status line and none are unexpected `[SKIP]`s.

4. **Hand off.** Do not export unless the user asked. Report verdict counts and list cards marked `fix` for human attention. Remind:

   ```bash
   python scripts/crawler/friction_cards.py review   # optional spot-check
   python scripts/crawler/friction_cards.py export   # only after human is satisfied
   ```
