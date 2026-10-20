# Single Rapid Fire Drill Architecture

> **Superseded by [0007-retire-rapid-fire.md](0007-retire-rapid-fire.md).** Rapid Fire no longer exists. Previously superseded in part by [0002-case-file-format.md](0002-case-file-format.md).

ArcGym used exclusively the Rapid Fire interaction archetype for architectural drills, eliminating format polymorphism across the codebase. Historic experiments with distinct runner formats (Currency, Scenario, Lesson, Diagram runner) are retired in favor of Rapid Fire rounds (default 3 decision reps with the Universal Pre-Submit Gate), with topology diagrams embedded directly as optional inline option previews (`diagramUrl`).
