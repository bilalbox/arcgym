# Passwordless Learner Authentication and D1 Telemetry Sync

ArcGym uses Google OpenID Connect (OIDC) via standard OAuth 2.0 authorization code redirect for passwordless identity, coupled with Cloudflare D1 for cross-device telemetry synchronization under a pseudonymous, zero-PII privacy model. Anonymous visitors receive a Trial Allowance of one practice round before authentication is required to persist streaks and continue daily practice.

## Context

ArcGym initially stored all practice progress, streaks, and calibration scores in client-side `localStorage`. To support architects practicing across multiple devices (e.g. mobile during commutes, desktop at work) without compromising ArcGym's zero-barrier experience or introducing operational costs, we needed an identity and storage architecture that minimizes user friction, operational maintenance, and privacy liabilities.

## Decisions

### 1. Identity Provider: Google OIDC (Standard Redirect)
* Authentication uses standard OAuth 2.0 authorization code flow redirecting to Google and completing at `/api/auth/google/callback`.
* Avoids loading third-party client JavaScript in the browser, ensuring resilience against strict privacy browsers, ad-blockers, and corporate endpoint policies.
* Sessions are transported via `HttpOnly`, `Secure`, `SameSite=Lax` cookies containing a signed JWT, preventing token theft via XSS.

### 2. Privacy Model: Pseudonymous Zero-PII Store
* The database never stores real names, emails, or Google user IDs.
* When verifying the ID token, the backend hashes the provider subject identifier with a private server pepper: `learner_id = HMAC_SHA256(sub, SERVER_PEPPER)`.
* Practice telemetry cannot be tied to an individual's corporate or personal identity even in the event of database exposure. A single-click "Erase All Records" purge in settings immediately executes a hard `DELETE` of the learner's row and clears local state.

### 3. Storage Separation: D1 for Progress, KV & Static Bundle for Drills
* **Drills**: Remain immutable static JSON artifacts built into `canonicalDrills.json` and cached in Cloudflare KV (`drill:today`). Drills are never queried from SQL, preserving 0ms catalog load times, 100% offline drill viewing, and zero D1 read quota burn.
* **Learner Progress**: Stored in Cloudflare D1 (`DB` binding) using the **Hybrid Document Pattern** (`learner_progress` table with indexed `learner_id`, `streak_days`, `last_active_date`, `total_points`, and a compressed JSON column `completed_drills_json`).

### 4. Onboarding & Gating: Trial Allowance
* New visitors practice immediately without an account.
* The **Trial Allowance** permits exactly one full Rapid Fire workout (3 reps) or one Case File / Incident.
* Upon completing the trial, the results card prompts the learner to sign in with Google to preserve their streak and unlock subsequent days. The catalog remains inspectable, but interactive option commits and probe discoveries are gated until authentication.

### 5. Sync Engine: Deterministic Monotonic Merge
* Merging local and cloud state performs a mathematical set-union on `completedDrills` keyed by `drillId`.
* Streaks are never overwritten with a raw scalar; they are deterministically recalculated from the union of completion dates using `@arcgym/drill-core` streak algorithms.
* Sync triggers on authentication, post-round completion (debounced background push), app focus / mount (background pull), with offline resilience queueing pending syncs.

## Considered Options

* **Emailed Magic Links**: Rejected due to third-party transactional email costs (Resend/Postmark), domain deliverability/spam hurdles, app-switching friction on mobile, and the legal burden of storing verified email addresses (PII).
* **WebAuthn / Passkeys**: Rejected as primary authentication because cross-ecosystem synchronization (e.g. corporate Windows PC to personal iPhone) requires awkward cross-device QR scanning without a central identity anchor.
* **Moving Drills into D1**: Rejected because relational SQLite adds schema complexity, query latency, and read-quota consumption to static, polymorphic content already served optimally by edge cache and static bundles.

## Consequences

* Adds `[[d1_databases]] binding = "DB"` to `apps/arcgym-web/wrangler.toml` and native migrations in `apps/arcgym-web/migrations/`.
* Requires environment secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, and `LEARNER_PEPPER`.
* Requires client-side hook `useLearnerSync` to integrate with `useVisitorProgress`.
