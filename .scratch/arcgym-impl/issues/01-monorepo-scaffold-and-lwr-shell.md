# 01: Monorepo Scaffold & Open-Source LWR Shell on Cloudflare

**What to build:**
A unified monorepo workspace containing the Open-Source Lightning Web Runtime (`@lwrjs/core`) application, shared component packages, and Salesforce DX project. The web app compiles with synthetic shadow DOM and SLDS 2 styling hooks, rendering a clean, mobile-responsive ArcGym shell (header, daily streak display, format selector, and practice prompt) with a build target ready for Cloudflare Pages.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Monorepo workspace initialized (pnpm / Turborepo) with `apps/arcgym-lwr`, `packages/drill-core`, `packages/drill-ui`, and `apps/arcgym-sfdx`.
- [ ] `apps/arcgym-lwr` configured with `@lwrjs/core` and `syntheticShadow: true` in `lwr.config.json`.
- [ ] Salesforce Lightning Design System (SLDS) styling hooks properly loaded across LWC components.
- [ ] Responsive application layout rendered with ArcGym branding, streak counter chip, and daily habit status.
- [ ] `npm run build` generates a standalone static distribution in `apps/arcgym-lwr/site` compatible with Cloudflare Pages (`wrangler pages dev` / `wrangler pages deploy`).
