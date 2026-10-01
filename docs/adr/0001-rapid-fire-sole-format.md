# Single Rapid Fire Drill Architecture

> **Superseded in part by [0002-case-file-format.md](0002-case-file-format.md).** Rapid Fire remains the sole format for the daily practice streak. Case File is an additional Evaluation-scale format outside that streak.

ArcGym used exclusively the Rapid Fire interaction archetype for architectural drills, eliminating format polymorphism across the codebase. Historic experiments with distinct runner formats (Currency, Scenario, Lesson, Diagram runner) are retired in favor of Rapid Fire rounds (default 3 decision reps with the Universal Pre-Submit Gate), with topology diagrams embedded directly as optional inline option previews (`diagramUrl`).
