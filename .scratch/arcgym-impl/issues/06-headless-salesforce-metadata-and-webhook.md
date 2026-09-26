# 06: Headless Salesforce Metadata & Event-Driven Outbound Webhook

**What to build:**
The Salesforce DX project (`apps/arcgym-sfdx`) defining `ArcGym_Drill__c` (Hybrid Document Pattern with `Definition_JSON__c`) and `ArcGym_Daily_Aggregate__c`. Implements the Flow outbound callout and Apex action `ArcGym_WebhookPublisher.cls` that signs payloads with HMAC-SHA256 and pushes approved drills to Cloudflare Pages Function `/api/webhooks/publish-drill`, storing them in Cloudflare KV with zero runtime API consumption.

**Blocked by:** 01: Monorepo Scaffold & Open-Source LWR Shell on Cloudflare, 03: Rapid Fire Drill Runner (Tracer Bullet Vertical Slice #1)

**Status:** completed

## Acceptance criteria

- [x] SFDX package directory created with custom object metadata for `ArcGym_Drill__c` and `ArcGym_Daily_Aggregate__c`.
- [x] Record-Triggered Flow and Apex Invocable action `ArcGym_WebhookPublisher.cls` implemented to serialize drill payload and compute HMAC-SHA256 signature.
- [x] Cloudflare Pages Function `/api/webhooks/publish-drill.ts` implemented to verify signature and persist drill payload into `DRILL_KV`.
- [x] `/api/drills/today.ts` endpoint serves today's drill from KV cache with sub-10ms response time and zero live Salesforce API calls.
