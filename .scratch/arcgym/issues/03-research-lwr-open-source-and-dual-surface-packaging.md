Type: research
Status: resolved
Blocked by:

# Research Open-Source LWR deployment on Cloudflare and Dual-Surface LWC packaging

## Question

How can Salesforce Open-Source Lightning Web Components (LWC) and Lightning Web Runtime (`@lwrjs/core`) be configured and deployed to Cloudflare Pages (free edge CDN), while maintaining maximum component portability to an In-Org Salesforce Lightning unmanaged package (Utility Bar / Home page)?

## Answer

Resolved via research subagent on branch `research/lwr-open-source-and-dual-surface-packaging`.
Full research report: [docs/research/03-lwr-open-source-and-dual-surface-packaging.md](file:///home/bilal/mycode/arcgym/docs/research/03-lwr-open-source-and-dual-surface-packaging.md).

Key Decisions & Artifacts:
1. Validated static compilation of `@lwrjs/core` to Cloudflare Pages for sub-50ms edge delivery with zero hosting costs.
2. Configured SLDS styling with `syntheticShadow: true` in `lwr.config.json` to allow full SLDS 2 styling hooks across Shadow DOM boundaries.
3. Designed Container-Presenter dual-surface abstraction (`packages/drill-ui` shared components without `@salesforce/*` dependencies; surface-specific host shells for Web LWR vs In-Org Utility Bar).
4. Provided monorepo architecture (pnpm / Turborepo) unifying LWR app, SFDX unmanaged package, and shared component library.
