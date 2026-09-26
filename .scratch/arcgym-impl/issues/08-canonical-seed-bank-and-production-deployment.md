# 08: Canonical 30-Drill Seed Bank & Production Cloudflare Deployment

**What to build:**
30 high-impact, curated drills spanning Core Platform, Data 360, and Agentforce (with antipattern distractors and documentation deep-links to `architect.salesforce.com`), loaded into the Salesforce Dev Org, pushed to Cloudflare KV, and deployed live to Cloudflare Pages via Wrangler.

**Blocked by:** 06: Headless Salesforce Metadata & Event-Driven Outbound Webhook, 07: In-Org Utility Bar Package (`c-arcgym-utility-bar`)

**Status:** completed

## Acceptance criteria

- [x] 30 canonical drill JSON payloads created matching the 19 curriculum domains (10 Core Platform, 10 Data 360, 10 Agentforce).
- [x] Every drill includes realistic antipattern distractors and citations to `architect.salesforce.com`.
- [x] Automated seed script (`scripts/seed-drills.ts`) loads drills into Salesforce Dev Org and triggers outbound webhook to Cloudflare KV.
- [x] Production build deployed to Cloudflare Pages using Wrangler (`wrangler pages deploy`). Live at `https://arcgym.pages.dev`.
- [x] Smoke tested on desktop and mobile with end-to-end drill completion, Brier scoring, and streak increment.

