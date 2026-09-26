Type: task
Status: resolved
Blocked by: 02, 03, 04, 05, 06

# Synthesize all resolved decisions into master specification

## Question

Synthesize all resolved research findings, drill mechanics, data schemas, API contracts, calibration algorithms, and content pipeline designs into `.scratch/arcgym/spec.md`.

## Answer

Resolved. The complete, build-ready Technical & Experience Architecture Specification has been synthesized and committed at [`.scratch/arcgym/spec.md`](file:///home/bilal/mycode/arcgym/.scratch/arcgym/spec.md).

Key Specification Sections:
1. **Executive Summary & Vision**: Mission, problem statement, and key architectural differentiators.
2. **Domain Curriculum & Well-Architected Grounding**: Balanced triad (Core, Data 360, Agentforce), 19 curriculum domains, 19 canonical antipatterns, and evaluation rubrics.
3. **Product Experience & Drill Mechanics**: 2-minute habit loop, Universal Pre-Submit Gate (4 discrete SLDS chips: 50%, 70%, 85%, 95%), and the 4 drill formats (Lesson 4-stage refactor, Rapid Fire 6-8 calls, Currency domain budgets, Scenario Dual-Meter).
4. **Metacognitive Calibration & Scoring Engine**: Asymmetric Brier Skill Score ($BSS_{asym}$ with $2.5\times$ overconfidence penalty), rolling 30-drill ECE tracking, Judgment Calibration Index ($JCI_{30}$), and metacognitive quadrants.
5. **Headless Salesforce Data Model & API Architecture**: Hybrid Document Pattern for `ArcGym_Drill__c` with `Definition_JSON__c` (protecting 5MB Dev Org limit), event-driven Flow webhook publishing to Cloudflare KV (0 live runtime API requests), and optional Trailblazer OAuth.
6. **Frontend & Dual-Surface Packaging Architecture**: `@lwrjs/core` compiled for Cloudflare Pages static edge hosting ($0 cost, sub-50ms TTFB), shared presentational LWCs (`packages/drill-ui`), and installable Salesforce In-Org Utility Bar package (`apps/arcgym-sfdx`).
7. **RAG Content Pipeline & Quality Gate**: Targeted web crawler for `architect.salesforce.com`, antipattern distractor synthesis, 3-tier automated Architect Linter, and HITL Salesforce approval queue.
8. **Implementation Roadmap & Phasing**: 4-phase rollout from MVP edge core to headless Salesforce integration, RAG pipeline, and v2 Diagram Builder.
