Type: research
Status: resolved
Blocked by:

# Research Confidence Calibration scoring models for professional judgment drills

## Question

What mathematical model and scoring mechanism (e.g., Brier score, Expected Calibration Error - ECE, overconfidence vs underconfidence asymmetry, and habit-building streak weighting) best balances cognitive feedback, habit reinforcement, and transparency for daily 2-minute architect drills?

## Answer

Resolved via research subagent on branch `research/confidence-calibration-metrics`.
Full research report: [docs/research/02-confidence-calibration-metrics.md](file:///home/bilal/mycode/arcgym/docs/research/02-confidence-calibration-metrics.md).

Key Decisions & Artifacts:
1. Adopted Asymmetric Brier Skill Score ($BSS_{asym}$) with an overconfidence penalty multiplier ($\alpha = 2.5$) reflecting the severe real-world cost of high-confidence architectural failures.
2. Rejected Logarithmic Scoring due to demoralizing $-\infty$ penalties on edge cases.
3. Designed discrete 4-chip SLDS confidence selector (50% Speculative, 70% Plausible, 85% High Conviction, 95% Architectural Axiom).
4. Decoupled Daily Streak ("Showing up is a win", increments unconditionally upon completion) from Metacognitive Calibration ($ECE_{30}$ and $JCI_{30}$ rolling scores).
5. Implemented complete reference TypeScript engine (`ArcGymScoringEngine`) ready for production integration.
