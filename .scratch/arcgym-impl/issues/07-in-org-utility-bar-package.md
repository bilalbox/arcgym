# 07: In-Org Utility Bar Package (`c-arcgym-utility-bar`)

**What to build:**
The native Salesforce In-Org dog-fooding experience. Packages the shared drill LWCs into `c-arcgym-utility-bar` (docked 480x640px) connected to `ArcGymDrillController.cls` via `@wire(getTodayDrill)` and `recordAttempt()`, storing private attempt telemetry in `ArcGym_Attempt__c` directly in the architect's own org.

**Blocked by:** 04: Currency & Scenario Drill Runners (Vertical Slice #2), 05: Lesson Drill Runner: 4-Stage Progressive Refactor (Vertical Slice #3), 06: Headless Salesforce Metadata & Event-Driven Outbound Webhook

**Status:** ready-for-agent

## Acceptance criteria

- [ ] `c-arcgym-utility-bar` LWC host container created for `lightning__UtilityBar` and `lightning__HomePage` targets.
- [ ] Co-located `.js-meta.xml` configured for 480px width $\times$ 640px height docked utility bar panel.
- [ ] `ArcGymDrillController.cls` implemented with `@AuraEnabled(cacheable=true) getTodayDrill()` and `@AuraEnabled recordAttempt()`.
- [ ] Attempts persisted locally to `ArcGym_Attempt__c` inside the host org, keeping telemetry private.
- [ ] Utility bar icon updates with completion badge/streak upon daily drill completion.
