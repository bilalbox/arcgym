## Destination

A complete, build-ready Technical & Experience Architecture Specification in `.scratch/arcgym/spec.md` for ArcGym (daily judgment practice for Salesforce Architects across Core Platform, Data 360, and Agentforce), resolving product mechanics, data schemas, confidence calibration, content pipeline, and hybrid edge/in-org deployment.

## Notes

- Domain: Salesforce Architecture, Well-Architected Framework, Data 360, Agentic Enterprise, Analyst Gym daily habit mechanics.
- Core skills to consult: `grilling`, `domain-modeling`, `research`.
- Standing preferences:
  - Planning by default: resolve all architectural decisions and specifications before build execution.
  - Formats: 4 core archetypes adapted from Analyst Gym (Lesson, Rapid Fire, Currency, Scenario) with confidence calibration and streak tracking.
  - Curricular Triad: Balanced 1:1:1 weighting across Core Platform, Data 360, and Agentforce, cross-cut by the 5 Well-Architected pillars (Trust, Reliability, Operational Excellence, Cost/Resource Optimization, Fairness).
  - Hosting: Hybrid "Headless Salesforce" model (Cloudflare Pages edge UI via LWR + Salesforce Developer Org backend for metadata/SoR + installable in-org LWC component).

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01 - Research Salesforce Well-Architected Framework and Agentic Enterprise patterns](issues/01-research-salesforce-architect-taxonomy.md): Codified 19-domain curriculum taxonomy across Core Platform, Data 360, and Agentforce mapped to Well-Architected tension matrix, antipatterns, and 4-dimensional judgment rubric.
- [02 - Research Confidence Calibration scoring models](issues/02-research-confidence-calibration-metrics.md): Established Asymmetric Brier Skill Score ($BSS_{asym}$) with 2.5x overconfidence penalty, discrete 4-chip SLDS confidence anchors, rolling 30-drill ECE tracking, and decoupled streak habit loop.
- [03 - Research Open-Source LWR deployment and Dual-Surface packaging](issues/03-research-lwr-open-source-and-dual-surface-packaging.md): Blueprint for `@lwrjs/core` static edge deployment on Cloudflare Pages ($0 cost, sub-50ms TTFB) with shared presentational LWCs, dual-surface abstraction, and installable in-org Utility Bar package.

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

- Canonical 30-drill seed bank scenario definitions (waits on drill state models, Well-Architected taxonomy, and data schema).
- Salesforce 2GP / Unmanaged Packaging structure and metadata XML (waits on in-org component architecture).
- Streak protection, push notifications, and habit loop mechanics (waits on attempt data model and auth decisions).
- Social sharing cards, peer calibration benchmarks, and Trailblazer Community integration (waits on scoring and calibration resolution).

## Out of scope

- Production software development and deployment during this wayfinding mapping phase (focus is complete specification).
- Native mobile apps in Swift / Kotlin (handled via responsive web LWR).
- Paid subscription paywalls or enterprise multi-tenant billing.
