# Single Rapid Fire Drill Architecture

ArcGym exclusively uses the Rapid Fire interaction archetype for all architectural drills, eliminating format polymorphism across the codebase. Historic experiments with distinct runner formats (Currency, Scenario, Lesson, Diagram runner) are retired in favor of Rapid Fire rounds (default 3 decision reps with the Universal Pre-Submit Gate), with topology diagrams embedded directly as optional inline option previews (`diagramUrl`). Format discriminators, polymorphic runner wrappers, and speculative format seams are removed from domain interfaces.
