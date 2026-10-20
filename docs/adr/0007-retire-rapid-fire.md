---
status: accepted
---

# Retire Rapid Fire; Case File and Troubleshooting are the only formats

Rapid Fire (3-rep MCQ rounds) read as mainstream quiz practice and pulled attention away from ArcGym's actual differentiator: scarce-probe investigation. We removed the `Rapid_Fire` format entirely — runner, routes, session reducer, and all `content/drills/` Rapid Fire sources — leaving **Case File** and **Troubleshooting** as the only Drill Formats. Completing one Case File or one Incident earns the day's Practice Streak, and the Home page recommends one Daily Drill drawn from either format.

## Consequences

- The Rapid-Fire-only mechanics go with it and are **not** ported: Contrast Set, Deferred Retest, Hypercorrection Intercept, Distractor Autopsy, Practice Round, Practice Session.
- Authored topology SVGs in `@arcgym/diagrams` (originally for AGD-00801..00808) stay in the package so they can be reused as Incident diagrams and Case File exhibits.
- Supersedes ADR 0001 entirely, and the "outside the daily streak" clauses of ADR 0002 and ADR 0004.
