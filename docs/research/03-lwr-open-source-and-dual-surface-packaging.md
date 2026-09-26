# Research Blueprint: Open-Source LWR Deployment on Cloudflare Pages & Dual-Surface LWC Packaging

**Ticket Reference:** Wayfinder Ticket 03  
**Status:** Completed  
**Branch:** `research/lwr-open-source-and-dual-surface-packaging`  
**Target Architecture:** Dual-Surface Lightning Web Components (Edge Static Web + Salesforce In-Org LEX Utility Bar)

---

## 1. Executive Summary & Architectural Thesis

ArcGym delivers high-stakes daily architectural judgment practice for Salesforce Architects across Core Platform, Data 360, and Agentforce. To maximize daily habit formation, the application must meet architects where they work:
1. **At the Web Edge (Zero friction / Public access):** A blistering, globally distributed web application accessible to any architect on desktop or mobile without logging into an enterprise Salesforce org. Hosted on **Cloudflare Pages** utilizing Salesforce Open-Source Lightning Web Runtime (**LWR** / `@lwrjs/core`) for $0 infrastructure cost.
2. **Inside the Salesforce Org (In-Context / Daily workflow):** An installable Salesforce DX unmanaged / unlocked package (2GP) embedding ArcGym directly into the **Salesforce Lightning Experience (LEX) Utility Bar** and Home Pages, allowing architects and consultants to complete their daily 2-minute drill without leaving their active org.

```
                                  +-------------------------------------------------------------+
                                  |                 SHARED COMPONENT LIBRARY                     |
                                  |                   packages/drill-ui                         |
                                  |   (Pure Presentational LWCs - 100% Platform Agnostic)       |
                                  |   c-drill-container, c-scenario-card, c-confidence-slider,  |
                                  |   c-budget-meter, c-tradeoff-matrix, c-stakeholder-gauge    |
                                  +------------------------------+------------------------------+
                                                                 |
                                  +------------------------------+------------------------------+
                                  |                                                             |
                                  v                                                             v
               +--------------------------------------+                      +--------------------------------------+
               |          EDGE SURFACE (LWR)          |                      |          IN-ORG SURFACE (LEX)        |
               |           apps/arcgym-lwr            |                      |           apps/arcgym-sfdx           |
               +--------------------------------------+                      +--------------------------------------+
               | Host: c-arcgym-web-host              |                      | Host: c-arcgym-utility-bar           |
               | Runtime: @lwrjs/core (Static Build)  |                      | Runtime: Lightning Experience (LEX)  |
               | Styling: Synthetic Shadow + SLDS CSS |                      | Styling: Native SLDS Injected        |
               | Data: Fetch -> Cloudflare Functions  |                      | Data: Apex Controllers / @wire / LDS |
               | Hosting: Cloudflare Pages ($0/mo)    |                      | Distribution: SFDX Unmanaged/2GP     |
               +------------------+-------------------+                      +------------------+-------------------+
                                  |                                                             |
                                  v                                                             v
                      [ Cloudflare Edge CDN ]                                     [ Salesforce Platform Org ]
                 (300+ Global PoPs, <50ms TTFB)                               (Utility Bar / Lightning App Page)
```

### The Core Architectural Dilemma
Salesforce LWC components authored for the platform typically rely on proprietary platform dependencies: `@salesforce/apex/*`, `@salesforce/schema/*`, `@salesforce/user/Id`, Lightning Data Service (`lightning/ui*Api`), and metadata descriptor files (`<cmp>.js-meta.xml`). Conversely, open-source LWC runs in standard modern browsers and Node environments where `@salesforce/*` modules do not exist at runtime.

### The Solution: The Container-Presenter Decoupling Pattern
We solve this through strict architectural decoupling:
* **Presentational Layer (Dumb Components):** Core drill interactors (`c-drill-container`, `c-scenario-card`, `c-confidence-slider`, etc.) are 100% pure web components. They import exclusively from standard `'lwc'`, accept strictly typed data via `@api` properties, and emit standard DOM `CustomEvent` instances. They contain zero data-fetching code and zero platform imports.
* **Surface Host Layer (Smart Containers):** Two distinct host shells manage platform concerns:
  - `c-arcgym-web-host` runs in LWR, managing browser routing, LocalStorage / IndexedDB offline queues, and `fetch()` calls to Cloudflare Pages Functions.
  - `c-arcgym-utility-bar` runs inside LEX, managing Utility Bar minimize/maximize APIs, Apex wire adapters (`@salesforce/apex/ArcGymDrillController`), and Salesforce user records.
* **Unified Single Repository (Monorepo):** Both targets consume the exact same source files for all drill components, preventing drift and ensuring 100% behavioral parity.

---

## 2. Salesforce Open-Source LWC & Lightning Web Runtime (LWR)

### 2.1 The Open-Source LWC Engine
Lightning Web Components (LWC) is an open-source, standards-based UI framework built on the W3C Web Components standard (Custom Elements, Shadow DOM, and Templates). Key characteristics include:
- **Shadow DOM Encapsulation:** Enforces DOM and CSS scoping.
- **Reactive Engine:** Tracks `@api` (public reactive properties) and field mutations to perform fine-grained virtual DOM diffing and patching.
- **Micro-Footprint:** The LWC runtime library is tiny (~7KB gzipped), making it one of the fastest web component runtimes available.

### 2.2 Lightning Web Runtime (`@lwrjs/core`)
LWR is Salesforce's next-generation modular application runtime for building blazing-fast web applications. It serves as the runtime foundation for Salesforce Experience Cloud LWR sites and is fully open-sourced for standalone deployment.

Key capabilities of `@lwrjs/core`:
- **Pluggable Architecture:** Composable module compilation, asset pipelines, view engines, and routing providers.
- **Module Resolution:** Discovers and compiles LWC modules defined in local directories (`$rootDir/src/modules`) or third-party npm packages via `lwr.config.json`.
- **Dual Runtime Modes:**
  1. *Development Server:* Dynamic just-in-time (JIT) compilation and HMR (Hot Module Replacement) via `lwr serve`.
  2. *Static Site Generation (SSG):* Pre-compiles all routes, components, and assets into static HTML and standalone JavaScript bundles via `lwr build`.

### 2.3 Salesforce Lightning Design System (SLDS 2) in LWR
In native Salesforce orgs, SLDS is injected by the platform. In open-source LWR, SLDS must be loaded explicitly and configured to pierce Shadow DOM boundaries:
1. **Asset Aliasing:** In `lwr.config.json`, alias `@salesforce-ux/design-system` assets so stylesheets and icons are served at `/slds`.
2. **Synthetic Shadow DOM:** In the route configuration, set `"syntheticShadow": true`. This enables standard SLDS classes (`slds-card`, `slds-p-around_medium`, `slds-grid`) to penetrate component shadow boundaries without manual CSS encapsulation overrides.
3. **SLDS Styling Hooks:** Components leverage modern SLDS 2 styling hooks (`var(--slds-c-button-brand-color-background, #0176d3)`), allowing full design token theming in both edge and in-org environments.

---

## 3. Cloudflare Pages Edge Deployment Pipeline

### 3.1 Why Cloudflare Pages?
Cloudflare Pages provides a globally distributed edge hosting environment:
- **$0 Infrastructure Cost:** Free tier includes unlimited bandwidth, unlimited static requests, custom domains with automatic SSL, and 500 builds per month.
- **Sub-50ms Global Latency:** Static assets are cached and served from Cloudflare's 300+ edge PoPs worldwide.
- **Edge Compute (Pages Functions):** Zero-cold-start V8 isolates run serverless TypeScript functions directly at the edge to securely proxy Salesforce APIs and authenticate users.

### 3.2 LWR Static Export Configuration
To run on Cloudflare Pages, ArcGym is compiled using `lwr build` to generate a static site directory (`site/`).

#### Configuration: `apps/arcgym-lwr/lwr.config.json`
```json
{
  "rootDir": "$rootDir",
  "port": 3000,
  "server": {
    "outputDir": "site"
  },
  "assets": [
    {
      "alias": "sldsDir",
      "dir": "$rootDir/../../node_modules/@salesforce-ux/design-system/assets",
      "urlPath": "/slds"
    },
    {
      "alias": "publicDir",
      "dir": "$rootDir/public",
      "urlPath": "/assets"
    }
  ],
  "lwc": {
    "modules": [
      { "dir": "$rootDir/src/modules" },
      { "dir": "$rootDir/../../packages/drill-ui/src/modules" }
    ]
  },
  "routes": [
    {
      "id": "app",
      "path": "/",
      "rootComponent": "arcgym/webHost",
      "layoutTemplate": "$rootDir/src/layouts/main.html",
      "bootstrap": {
        "syntheticShadow": true
      }
    },
    {
      "id": "spa-fallback",
      "path": "/:route*",
      "rootComponent": "arcgym/webHost",
      "layoutTemplate": "$rootDir/src/layouts/main.html",
      "bootstrap": {
        "syntheticShadow": true
      }
    }
  ]
}
```

#### Layout Shell: `apps/arcgym-lwr/src/layouts/main.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ArcGym | Daily Salesforce Architectural Judgment Practice</title>
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
  <link rel="stylesheet" href="/slds/styles/salesforce-lightning-design-system.min.css" />
  <link rel="stylesheet" href="/assets/arcgym-global.css" />
</head>
<body class="slds-scope">
  {{{body}}}
  {{{lwr_resources}}}
</body>
</html>
```

### 3.3 Single Page Application (SPA) Routing on Cloudflare
When users navigate directly to deep routes (e.g., `/drill/currency/02`), Cloudflare Pages must route the request to the SPA root rather than returning a 404.

ArcGym implements this via two complementary Cloudflare mechanisms:
1. **`_routes.json`:** Directs static requests to assets and sends routing through the index.
2. **`functions/[[path]].ts` or `404.html`:** The build step copies `site/index.html` to `site/404.html`. Cloudflare Pages automatically serves `404.html` with client-side HTML5 History API fallback, ensuring smooth client routing.

```bash
# Build script in apps/arcgym-lwr/package.json
"scripts": {
  "build": "lwr build && cp site/index.html site/404.html"
}
```

### 3.4 Edge Gateway: Cloudflare Pages Functions (`functions/api/`)
To protect Salesforce API keys and prevent exposing Developer Org credentials in the public client bundle, all communication between the web client and the Salesforce backend flows through Cloudflare Pages Functions.

```
[ Browser / LWR Client ]
        |
        | GET /api/drills/today
        v
[ Cloudflare Pages Function: functions/api/drills/today.ts ]
        |
        +---> [ Check Cloudflare Workers KV Cache (Hit: return <15ms) ]
        |
        +---> [ Miss: OAuth 2.0 JWT Bearer Flow with SF Developer Org ]
        |
        v
[ Salesforce Developer Edition Org ]
  - Custom REST Endpoint: /services/apexrest/arcgym/v1/drills/daily
  - Returns Drill JSON payload
        |
        v
[ Cache in Cloudflare KV (TTL: 86400s) & Return to Client ]
```

#### Example Edge Function: `apps/arcgym-lwr/functions/api/drills/today.ts`
```typescript
interface Env {
  DRILL_KV: KVNamespace;
  SF_INSTANCE_URL: string;
  SF_CLIENT_ID: string;
  SF_JWT_PRIVATE_KEY: string;
  SF_USERNAME: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const todayKey = `drill-${new Date().toISOString().slice(0, 10)}`;

  // 1. Check Edge KV Cache
  const cached = await env.DRILL_KV.get(todayKey, { type: 'json' });
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      }
    });
  }

  // 2. Fetch from Salesforce Org or Static Seed Fallback
  try {
    const drill = await fetchFromHeadlessSalesforce(env);
    await env.DRILL_KV.put(todayKey, JSON.stringify(drill), { expirationTtl: 86400 });
    return new Response(JSON.stringify(drill), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // 3. Fallback to bundled local offline seed if Salesforce Org callout fails
    const fallbackDrill = await import('../../src/seeds/daily-seed.json');
    return new Response(JSON.stringify(fallbackDrill.default), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

---

## 4. Dual-Surface Component Abstraction & Packaging

### 4.1 The Dual-Surface Dilemma
The table below illustrates the runtime environment differences between the two surfaces:

| Capability | Cloudflare Pages (LWR OSS) | Salesforce In-Org (LEX Utility Bar) |
| :--- | :--- | :--- |
| **Runtime Engine** | `@lwrjs/core` in browser | Salesforce Core Aura/LEX container |
| **Component Format** | W3C Custom Element (LWC) | Salesforce Metadata LWC Bundle |
| **Metadata File** | Ignored / Not used | Required `<name>.js-meta.xml` |
| **Data Fetching** | `fetch()`, REST, LocalStorage | Apex `@wire`, LDS, Imperative Apex |
| **User Identity** | Anonymous / Edge UUID / Web Auth | Native `@salesforce/user/Id` |
| **Styling** | SLDS loaded in layout + Synthetic Shadow | Native SLDS automatically present |
| **Window Frame** | Full browser responsive layout | 480x640px docked panel or popup |

### 4.2 The Container-Presenter Architecture

To achieve 100% component portability, the presentation components in `packages/drill-ui` obey three strict golden rules:
1. **Rule 1: ZERO Platform Imports.** Never import `@salesforce/apex`, `@salesforce/schema`, `@salesforce/user`, or `lightning/ui*Api` inside any shared component.
2. **Rule 2: Props Down, Events Up.** Receive all state via `@api` properties. Emit all user interactions via standard `new CustomEvent('eventName', { detail: { ... } })`.
3. **Rule 3: CSS Encapsulation with SLDS Design Tokens.** Rely on SLDS utility classes and CSS Custom Properties (`--slds-*`), avoiding hardcoded platform-specific DOM hierarchies.

```
+---------------------------------------------------------------------------------+
|                       SURFACE HOST LAYER (Pluggable Shells)                     |
|                                                                                 |
|   +-------------------------------------+   +-------------------------------+   |
|   |          LWR Web Host               |   |       In-Org Host             |   |
|   |       (arcgym/webHost)              |   |    (c/arcgymUtilityBar)       |   |
|   |  - fetch('/api/drills/today')       |   |  - @wire(getDailyDrill)       |   |
|   |  - localStorage cache               |   |  - @salesforce/user/Id        |   |
|   |  - Edge attempt ingestion           |   |  - UtilityBar API controls    |   |
|   +------------------+------------------+   +---------------+---------------+   |
+----------------------|--------------------------------------|-------------------+
                       |                                      |
                       +------------------+-------------------+
                                          |
                                          | Passes @api props: drill, calibrationState
                                          | Listens to events: oncalibratesubmit, onoptionselect
                                          v
+---------------------------------------------------------------------------------+
|                       SHARED PRESENTATION LAYER (packages/drill-ui)             |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                         c-drill-container                               |   |
|   |  - Orchestrates current drill step flow                                 |   |
|   |  - Renders header, timer, step card, and calibration footer             |   |
|   +--------------------+-------------------------------+--------------------+   |
|                        |                               |                        |
|         +--------------+-------------+                 +-------------+          |
|         |                            |                               |          |
|         v                            v                               v          |
|  +--------------------+    +--------------------+         +--------------------+|
|  |   c-scenario-card  |    | c-confidence-slider|         |   c-budget-meter   ||
|  | - Markdown prompt  |    | - 50% to 100% scale|         | - Governor limits  ||
|  | - Trade-off matrix |    | - Calibration curve|         | - Consumed credits ||
|  | - Option selection |    | - Certainty scoring|         | - Debt points      ||
|  +--------------------+    +--------------------+         +--------------------+|
+---------------------------------------------------------------------------------+
```

### 4.3 Code Blueprint: Shared Presenter (`c-confidence-slider`)

#### `packages/drill-ui/src/modules/c/confidenceSlider/confidenceSlider.js`
```javascript
import { LightningElement, api } from 'lwc';

export default class ConfidenceSlider extends LightningElement {
  @api value = 75; // Default 75%
  @api min = 50;   // 50% = Pure Guess
  @api max = 100;  // 100% = Absolute Certainty
  @api disabled = false;

  get calibrationLabel() {
    if (this.value <= 60) return 'Speculative Assessment (Low Certainty)';
    if (this.value <= 85) return 'Architectural Recommendation (Moderate Certainty)';
    return 'Definitive Grounding (High Certainty)';
  }

  get calibrationClass() {
    if (this.value <= 60) return 'slds-badge slds-theme_warning';
    if (this.value <= 85) return 'slds-badge slds-theme_info';
    return 'slds-badge slds-theme_success';
  }

  handleSliderChange(event) {
    this.value = parseInt(event.target.value, 10);
    this.dispatchEvent(
      new CustomEvent('confidencechange', {
        detail: { confidence: this.value },
        bubbles: true,
        composed: true
      })
    );
  }

  handleCommit() {
    this.dispatchEvent(
      new CustomEvent('commitdecision', {
        detail: { confidence: this.value },
        bubbles: true,
        composed: true
      })
    );
  }
}
```

#### `packages/drill-ui/src/modules/c/confidenceSlider/confidenceSlider.html`
```html
<template>
  <div class="slds-box slds-theme_shade slds-m-top_medium">
    <div class="slds-grid slds-grid_align-spread slds-m-bottom_x-small">
      <span class="slds-text-heading_small slds-text-title_caps">Confidence Calibration</span>
      <span class={calibrationClass}>{value}% Certainty</span>
    </div>

    <p class="slds-text-body_small slds-m-bottom_small">{calibrationLabel}</p>

    <div class="slds-form-element">
      <label class="slds-form-element__label slds-assistive-text" for="confidence-range">
        Certainty Rating
      </label>
      <div class="slds-form-element__control">
        <input
          type="range"
          id="confidence-range"
          class="slds-slider"
          min={min}
          max={max}
          step="5"
          value={value}
          disabled={disabled}
          oninput={handleSliderChange}
        />
      </div>
    </div>

    <div class="slds-m-top_medium slds-text-align_right">
      <button
        class="slds-button slds-button_brand"
        disabled={disabled}
        onclick={handleCommit}
      >
        Lock In Judgment
      </button>
    </div>
  </div>
</template>
```

#### `packages/drill-ui/src/modules/c/confidenceSlider/confidenceSlider.js-meta.xml`
> **Crucial Insight:** The `.js-meta.xml` lives right next to the component in `packages/drill-ui`. LWR completely ignores `.js-meta.xml` files during compilation, while Salesforce DX requires them. Having it colocated enables zero-duplication packaging.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>61.0</apiVersion>
  <isExposed>false</isExposed>
  <masterLabel>ArcGym Confidence Slider</masterLabel>
  <description>Shared Presentational Confidence Slider for ArcGym</description>
</LightningComponentBundle>
```

---

### 4.4 Surface Host 1: In-Org Salesforce Container

The In-Org container lives in `apps/arcgym-sfdx/force-app/main/default/lwc/arcgymUtilityBar/`. It wires directly into Apex, binds to the Utility Bar API, and embeds `<c-drill-container>`.

#### `apps/arcgym-sfdx/force-app/main/default/lwc/arcgymUtilityBar/arcgymUtilityBar.js-meta.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>61.0</apiVersion>
  <isExposed>true</isExposed>
  <masterLabel>ArcGym Daily Drill</masterLabel>
  <description>Salesforce Architect Judgment Gym - Daily 2-minute calibration practice</description>
  <targets>
    <target>lightning__UtilityBar</target>
    <target>lightning__AppPage</target>
    <target>lightning__HomePage</target>
  </targets>
  <targetConfigs>
    <targetConfig targets="lightning__UtilityBar">
      <property name="autoLaunch" type="Boolean" default="false" label="Auto-open on launch" />
    </targetConfig>
  </targetConfigs>
</LightningComponentBundle>
```

#### `apps/arcgym-sfdx/force-app/main/default/lwc/arcgymUtilityBar/arcgymUtilityBar.js`
```javascript
import { LightningElement, wire, track } from 'lwc';
import getTodayDrill from '@salesforce/apex/ArcGymDrillController.getTodayDrill';
import recordAttempt from '@salesforce/apex/ArcGymDrillController.recordAttempt';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ArcgymUtilityBar extends LightningElement {
  @track drill;
  @track isLoading = true;
  @track errorMessage;

  @wire(getTodayDrill)
  wiredDrill({ error, data }) {
    this.isLoading = false;
    if (data) {
      this.drill = data;
      this.errorMessage = undefined;
    } else if (error) {
      this.errorMessage = error.body ? error.body.message : 'Error loading daily drill';
    }
  }

  async handleCommitDecision(event) {
    const { stepId, selectedOptionId, confidence } = event.detail;
    this.isLoading = true;

    try {
      const result = await recordAttempt({
        drillId: this.drill.id,
        stepId,
        selectedOptionId,
        confidence
      });

      this.dispatchEvent(
        new ShowToastEvent({
          title: result.isAccurate ? 'Well-Architected Alignment!' : 'Calibration Note',
          message: `Judgment recorded. Brier Score: ${result.brierScore.toFixed(3)}`,
          variant: result.isAccurate ? 'success' : 'info'
        })
      );
    } catch (err) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Submission Failed',
          message: err.body ? err.body.message : err.message,
          variant: 'error'
        })
      );
    } finally {
      this.isLoading = false;
    }
  }
}
```

#### `apps/arcgym-sfdx/force-app/main/default/lwc/arcgymUtilityBar/arcgymUtilityBar.html`
```html
<template>
  <lightning-card title="ArcGym: Daily Judgment Practice" icon-name="standard:education">
    <template if:true={isLoading}>
      <lightning-spinner alternative-text="Loading daily drill..."></lightning-spinner>
    </template>

    <template if:true={errorMessage}>
      <div class="slds-p-around_medium slds-text-color_error">
        {errorMessage}
      </div>
    </template>

    <template if:true={drill}>
      <!-- Exact same shared presenter component -->
      <c-drill-container
        drill={drill}
        oncommitdecision={handleCommitDecision}
      ></c-drill-container>
    </template>
  </lightning-card>
</template>
```

---

### 4.5 Surface Host 2: LWR Web Container (Cloudflare Pages)

The Web host lives in `apps/arcgym-lwr/src/modules/arcgym/webHost/`. It uses standard `fetch()`, handles local caching, and embeds the exact same `<c-drill-container>`.

#### `apps/arcgym-lwr/src/modules/arcgym/webHost/webHost.js`
```javascript
import { LightningElement, track } from 'lwc';

export default class WebHost extends LightningElement {
  @track drill;
  @track isLoading = true;
  @track errorMessage;
  @track feedback;

  connectedCallback() {
    this.loadDailyDrill();
  }

  async loadDailyDrill() {
    try {
      const response = await fetch('/api/drills/today');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      this.drill = await response.json();
    } catch (err) {
      this.errorMessage = 'Unable to reach ArcGym edge network. Playing offline drill.';
      // Offline fallback
      this.drill = this.getOfflineSeed();
    } finally {
      this.isLoading = false;
    }
  }

  async handleCommitDecision(event) {
    const { stepId, selectedOptionId, confidence } = event.detail;
    this.isLoading = true;

    try {
      const response = await fetch('/api/drills/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drillId: this.drill.id,
          stepId,
          selectedOptionId,
          confidence,
          clientTimestamp: new Date().toISOString()
        })
      });
      this.feedback = await response.json();
    } catch (err) {
      // Local fallback calculation for offline play
      this.feedback = this.calculateLocalFeedback(selectedOptionId, confidence);
    } finally {
      this.isLoading = false;
    }
  }

  getOfflineSeed() {
    return {
      id: 'drill-seed-01',
      title: 'Agentforce Data Cloud Ingestion Bottleneck',
      pillar: 'Reliability',
      format: 'Scenario',
      scenario: 'High-frequency telemetry records are saturating standard Data Streams...'
    };
  }
}
```

---

## 5. Data Access Abstraction: Edge REST vs In-Org Apex

To ensure seamless interchangeability, data contracts are defined as language-agnostic Data Transfer Objects (DTOs) in `packages/drill-core`.

### 5.1 Canonical Data Transfer Objects (DTOs)

```typescript
// packages/drill-core/src/types/drill.ts

export type WellArchitectedPillar =
  | 'Trust'
  | 'Reliability'
  | 'Operational Excellence'
  | 'Cost and Resource Optimization'
  | 'Fairness';

export type DrillFormat = 'Lesson' | 'Rapid Fire' | 'Currency' | 'Scenario';

export interface DrillOptionDTO {
  id: string;
  label: string;
  tradeOffSummary: string;
  pillarImpacts: Record<WellArchitectedPillar, number>; // -5 to +5 scale
  governorImpact?: {
    soqlQueries?: number;
    dmlRows?: number;
    heapSizeKb?: number;
    calloutMs?: number;
  };
}

export interface DrillStepDTO {
  id: string;
  sequence: number;
  promptText: string;
  codeSnippet?: string;
  options: DrillOptionDTO[];
}

export interface DrillDefinitionDTO {
  id: string;
  drillDate: string; // YYYY-MM-DD
  title: string;
  format: DrillFormat;
  pillar: WellArchitectedPillar;
  timeLimitSeconds: number;
  steps: DrillStepDTO[];
  groundingCitation: {
    title: string;
    url: string;
    documentSection: string;
  };
}

export interface AttemptSubmissionDTO {
  drillId: string;
  stepId: string;
  selectedOptionId: string;
  confidence: number; // 50 to 100
  timeSpentSeconds: number;
}

export interface EvaluationResultDTO {
  drillId: string;
  stepId: string;
  isAccurate: boolean;
  brierScore: number; // 0.000 (perfect) to 1.000 (maximum penalty)
  streakDays: number;
  architecturalRationale: string;
  peerCalibrationDistribution: {
    confidenceBucket: number;
    accuracyPercentage: number;
  }[];
}
```

### 5.2 Architectural Comparison: In-Org vs Edge Implementation

```
                                      DATA ACCESS COMPARISON
                                      
             EDGE ENVIRONMENT                                      IN-ORG ENVIRONMENT
           (apps/arcgym-lwr)                                     (apps/arcgym-sfdx)
     
  +-------------------------------------+               +-------------------------------------+
  |          HttpDrillService           |               |           ApexDrillService          |
  +-------------------------------------+               +-------------------------------------+
  | - fetch('/api/drills/today')        |               | - @wire(getTodayDrill)              |
  | - POST /api/drills/attempt          |               | - ArcGymDrillController.recordAttempt|
  | - Headers: Bearer Edge-JWT          |               | - Implicit User Context (UserInfo)  |
  | - LocalStorage offline queue        |               | - Direct Custom Object Persistence  |
  | - Sub-50ms Edge KV Cache            |               | - Lightning Data Service (LDS)      |
  +-------------------------------------+               +-------------------------------------+
                    |                                                     |
                    +--------------------------+--------------------------+
                                               |
                                               v
                                +------------------------------+
                                |      Normalized DTOs         |
                                |     (DrillDefinitionDTO)     |
                                +--------------+---------------+
                                               |
                                               v
                                +------------------------------+
                                |      c-drill-container       |
                                | (Unaware of Transport Layer) |
                                +------------------------------+
```

### 5.3 In-Org Apex Controller Implementation

```java
// apps/arcgym-sfdx/force-app/main/default/classes/ArcGymDrillController.cls
public with sharing class ArcGymDrillController {
    
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getTodayDrill() {
        Date today = Date.today();
        
        // Query Drill Custom Object
        List<ArcGym_Drill__c> drills = [
            SELECT Id, Name, Title__c, Format__c, Pillar__c, Time_Limit_Seconds__c,
                   Grounding_Title__c, Grounding_URL__c, Grounding_Section__c
            FROM ArcGym_Drill__c
            WHERE Active_Date__c = :today
            WITH USER_MODE
            LIMIT 1
        ];
        
        if (drills.isEmpty()) {
            return getFallbackSeedDrill();
        }
        
        return ArcGymDTOTransformer.transform(drills[0]);
    }
    
    @AuraEnabled
    public static Map<String, Object> recordAttempt(
        Id drillId, 
        Id stepId, 
        Id selectedOptionId, 
        Integer confidence
    ) {
        Id userId = UserInfo.getUserId();
        
        // 1. Evaluate accuracy against correct option
        ArcGym_Option__c option = [
            SELECT Id, Is_Optimal__c, Trade_Off_Summary__c, Rationale__c 
            FROM ArcGym_Option__c 
            WHERE Id = :selectedOptionId 
            WITH USER_MODE
        ];
        
        Boolean isAccurate = option.Is_Optimal__c;
        
        // 2. Calculate Brier Score: (confidence/100 - actual)^2
        Decimal probability = Decimal.valueOf(confidence) / 100.0;
        Decimal actualOutcome = isAccurate ? 1.0 : 0.0;
        Decimal brierScore = (probability - actualOutcome) * (probability - actualOutcome);
        
        // 3. Persist Attempt Record
        ArcGym_Attempt__c attempt = new ArcGym_Attempt__c(
            User__c = userId,
            Drill__c = drillId,
            Step__c = stepId,
            Selected_Option__c = selectedOptionId,
            Confidence_Rating__c = confidence,
            Is_Accurate__c = isAccurate,
            Brier_Score__c = brierScore
        );
        insert as user attempt;
        
        // 4. Update User Calibration & Streak metrics
        ArcGymStreakService.updateUserStreak(userId, today);
        
        Map<String, Object> result = new Map<String, Object>();
        result.put('isAccurate', isAccurate);
        result.put('brierScore', brierScore);
        result.put('rationale', option.Rationale__c);
        return result;
    }
}
```

---

## 6. Monorepo Organization & Build Pipeline

To eliminate code divergence and provide a single command to develop, test, and package both surfaces, ArcGym utilizes a unified workspace structure.

### 6.1 Recommended Directory Tree

```
arcgym/
├── .github/
│   └── workflows/
│       ├── deploy-cloudflare-edge.yml     # Builds & deploys LWR to Cloudflare Pages
│       └── sfdx-ci-package.yml            # Validates & packages SFDX Unmanaged 2GP
├── apps/
│   ├── arcgym-lwr/                        # LWR Web Application (Cloudflare Target)
│   │   ├── functions/                     # Cloudflare Pages Functions
│   │   │   └── api/
│   │   │       ├── drills/
│   │   │       │   ├── today.ts
│   │   │       │   └── attempt.ts
│   │   │       └── auth/
│   │   ├── public/                        # Static assets (favicons, fonts, images)
│   │   ├── src/
│   │   │   ├── layouts/
│   │   │   │   └── main.html              # HTML Shell linking SLDS & LWR runtime
│   │   │   └── modules/
│   │   │       └── arcgym/
│   │   │           └── webHost/           # LWR Root Component (Shell & Fetch client)
│   │   ├── lwr.config.json                # LWR static build & route configuration
│   │   └── package.json
│   │
│   └── arcgym-sfdx/                       # Salesforce DX Project (In-Org Target)
│       ├── force-app/
│       │   └── main/
│       │       └── default/
│       │           ├── classes/           # Apex Controllers & Services
│       │           │   ├── ArcGymDrillController.cls
│       │           │   └── ArcGymStreakService.cls
│       │           ├── lwc/
│       │           │   ├── arcgymUtilityBar/  # In-Org Host Container (Utility Bar)
│       │           │   └── [symlinked or synced components from packages/drill-ui]
│       │           ├── objects/           # Custom Objects: Drill__c, Attempt__c
│       │           └── permissionsets/    # ArcGym_Architect_User.permissionset-meta.xml
│       └── sfdx-project.json              # SFDX configuration with shared package dirs
│
├── packages/
│   ├── drill-ui/                          # PURE PRESENTATION LWC LIBRARY
│   │   ├── src/
│   │   │   └── modules/
│   │   │       └── c/
│   │   │           ├── drillContainer/    # Step orchestrator & state manager
│   │   │           ├── scenarioCard/      # Architectural prompt & trade-off viewer
│   │   │           ├── confidenceSlider/  # 50-100% judgment calibration slider
│   │   │           ├── budgetMeter/       # Governor limit / currency allocation meter
│   │   │           ├── stakeholderGauge/  # Multi-turn persona standing meter
│   │   │           ├── tradeoffMatrix/    # 5-Pillar Well-Architected balance grid
│   │   │           └── feedbackViewer/    # Grounded citations & Brier calibration curve
│   │   └── package.json
│   │
│   ├── drill-core/                        # PURE DOMAIN LOGIC & TYPES
│   │   ├── src/
│   │   │   ├── calibration/               # Brier score calculation & curve fitting
│   │   │   ├── state-machine/             # 4 drill archetype interaction state machines
│   │   │   └── types/                     # TypeScript DTOs & Schemas
│   │   └── package.json
│   │
│   └── drill-seeds/                       # 30 CANONICAL SEED DRILLS (JSON)
│       ├── core-platform/
│       ├── data-360/
│       └── agentforce/
│
├── scripts/
│   ├── sync-lwc-to-sfdx.js                # Syncs/Symlinks packages/drill-ui to SFDX lwc/
│   └── seed-salesforce-org.js             # Pushes seed drills to Developer Edition Org
├── package.json                           # Root workspace configuration (pnpm / npm)
├── turbo.json                             # Turborepo task pipeline (build, test, sync)
└── README.md
```

### 6.2 Component Sharing Strategy: Symlink vs Sync Script

Salesforce CLI (`sf project deploy start` or package creation) expects all LWC bundles to reside in a recognized package directory under `lwc/`. Meanwhile, LWR allows pointing module resolution directly to arbitrary directories via `lwr.config.json`.

To satisfy both tools without manual code copying:
1. **Source of Truth:** All shared LWC components live in `packages/drill-ui/src/modules/c/`.
2. **LWR Consumption:** In `apps/arcgym-lwr/lwr.config.json`:
   ```json
   "lwc": {
     "modules": [
       { "dir": "$rootDir/../../packages/drill-ui/src/modules" }
     ]
   }
   ```
3. **SFDX Consumption:** 
   - *Option A (Modern SFDX Multi-Directory):* In `sfdx-project.json`, define multiple package directories:
     ```json
     {
       "packageDirectories": [
         { "path": "packages/drill-ui", "default": false },
         { "path": "apps/arcgym-sfdx/force-app", "default": true }
       ],
       "sourceApiVersion": "61.0"
     }
     ```
   - *Option B (Automated Sync Script / Build Hook):* For maximum compatibility with legacy unmanaged package upload tools, a 15-line Node.js sync script (`scripts/sync-lwc-to-sfdx.js`) mirrors `packages/drill-ui/src/modules/c/*` into `apps/arcgym-sfdx/force-app/main/default/lwc/` as a pre-commit or pre-deploy hook.

---

## 7. Packaging & Distribution: In-Org Unmanaged vs 2GP Unlocked

### 7.1 Unlocked Packaging (2GP) Specification
For easy installation into customer sandbox and production orgs:
* **Package Name:** `ArcGym - Daily Architect Judgment Gym`
* **Package Type:** Unlocked (with no namespace, allowing zero friction install)
* **Metadata Included:**
  - Apex Classes: `ArcGymDrillController`, `ArcGymDTOTransformer`, `ArcGymStreakService`
  - Custom Objects: `ArcGym_Drill__c`, `ArcGym_Step__c`, `ArcGym_Option__c`, `ArcGym_Attempt__c`
  - Custom Fields: Pillar badges, Brier scores, governor limits, citations
  - Lightning Web Components: `arcgymUtilityBar` + shared drill UI library
  - FlexiPage / Utility Bar: Default Utility Bar configuration docked at 480px width x 640px height
  - Permission Sets: `ArcGym_Architect_User` (read drills, submit attempts), `ArcGym_Admin` (author and import drills)

### 7.2 Utility Bar Ergonomics
Because the Utility Bar operates in a docked drawer (default 480px width), components must be optimized for compact, vertical readability:
- **Responsive Layout:** `c-drill-container` switches from two-column desktop to single-column vertical stack when rendered under 500px.
- **Auto-Close / Completion Badging:** On submission, the component calls `lightning/platformUtilityBarApi` to set the utility bar label to `ArcGym (Complete)` and display a green check badge.

---

## 8. Implementation & Verification Roadmap

| Phase | Milestone | Key Deliverables | Verification Criteria |
| :---: | :--- | :--- | :--- |
| **Phase 1** | **Shared UI Library** (`packages/drill-ui`) | `c-drill-container`, `c-scenario-card`, `c-confidence-slider` | Vitest / Jest LWC tests pass; zero platform imports detected in lint check. |
| **Phase 2** | **LWR Static Build** (`apps/arcgym-lwr`) | `lwr.config.json`, SLDS layout, synthetic shadow, static seed fallback | `npm run build` generates `site/` folder; local preview runs cleanly. |
| **Phase 3** | **Cloudflare Deployment** | Pages deployment, `_routes.json`, Pages Functions edge API | Deploy to Cloudflare Pages; TTFB <50ms globally; SPA deep routes load without 404. |
| **Phase 4** | **SFDX Package Packaging** | Apex controllers, custom objects, `arcgymUtilityBar` host | `sf project deploy start` into Scratch Org succeeds; component docks cleanly in Utility Bar. |
| **Phase 5** | **Dual-Surface Parity Verification** | End-to-end drill completion on both Web and LEX | Same scenario drill completed on both surfaces yields identical calibration & Brier scores. |

---

## 9. Conclusion & Recommendations

Deploying open-source LWR on Cloudflare Pages combined with dual-surface LWC packaging is not only technically feasible—it is the optimal architectural strategy for ArcGym:
1. **$0 Infrastructure Run Rate:** Eliminates ongoing server costs by offloading compute to free Cloudflare Pages edge static hosting and Cloudflare Functions.
2. **Single Codebase Parity:** By separating presentational LWCs from surface hosts, 100% of the interactive drill mechanics, timers, sliders, and feedback cards are shared across web and Salesforce orgs with zero duplication.
3. **Frictionless Habit Loop:** Architects can complete their daily practice wherever they are: on the open web during a commute, or docked right in their Salesforce Developer Edition org while building enterprise solutions.
