Type: research
Status: resolved
Blocked by:

# Research Salesforce Well-Architected Framework and Agentic Enterprise patterns on architect.salesforce.com

## Question

What is the comprehensive, authoritative taxonomy of pillars, capabilities, decision guides, and design patterns from `architect.salesforce.com` (spanning Core Platform, Data 360, and Agentforce) that will structure the ArcGym curriculum, tag model, and evaluation rubric?

## Answer

Resolved via research subagent on branch `research/salesforce-architect-taxonomy`.
Full research report: [docs/research/01-salesforce-architect-taxonomy.md](file:///home/bilal/mycode/arcgym/docs/research/01-salesforce-architect-taxonomy.md).

Key Decisions & Artifacts:
1. Codified the 19 core curriculum domains across the Balanced Triad (Core Platform, Data 360, Agentforce).
2. Defined the 5-Pillar Architectural Tension Matrix (e.g., Data Replication vs. Zero Copy; Agent Autonomy vs. Human Oversight; Synchronous Callouts vs. Event-Driven Queuing).
3. Catalogs 19 canonical architectural antipatterns (e.g. Process Frankenstein, The God Account, Scoping Rules as Security, Streaming Everything, Fuzzy Over-Clustering, Trust Layer Bypass).
4. Established the 4-dimensional Architectural Judgment Rubric (Judgment Quality 1-5, Confidence Calibration -2 to +3, Trade-off Articulation 1-5, Blast Radius Analysis 1-5).
