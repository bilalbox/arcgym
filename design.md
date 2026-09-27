# ArcGym Design System (Miro x Salesforce Technical Craft)

**Specification Version:** `1.0.0-miro`  
**Archetype Foundation:** [Miro Design System Spec](https://www.shadcn.io/design/miro/raw) adapted for High-Stakes Salesforce Architectural Practice  
**Core Principle:** Professional restraint. Zero AI-generated visual clutter. High-contrast typography and tactile pill controls.

---

## 1. Brand Philosophy & Identity

ArcGym is a daily architectural judgment practice engine for Salesforce Technical Architects (CTAs), Enterprise Architects, and Trailblazers. Architectural authority requires clarity, precision, and confidence under constraint.

* **Primary Action Voltage:** Miro's signature **Black Pill** (`#1c1c1e` on `rounded-full`). Dominant, calm, and grounded.
* **Accent Voltage:** **Salesforce Blue (`#0176d3`)**. Reserved for brand mark accents, active state focus rings, and official documentation deep-links to `architect.salesforce.com`.
* **The Canvas:** Pure crisp white (`#ffffff`) and soft neutral backdrop (`#f7f8fa`). No synthetic gradient backgrounds.
* **Visual Metaphor:** Interactive workshop canvas. Flat surfaces with crisp 1px hairlines (`#e0e2e8`), structural dividers, and purposeful pastel status chips.

---

## 2. Color Palette & Token System

### Core Palette
```css
/* Base Canvas & Ink */
--canvas: #ffffff;
--surface: #f7f8fa;
--surface-soft: #fafbfc;
--ink: #1c1c1e;
--charcoal: #2c2c34;
--slate: #555a6a;
--muted: #8e91a0;

/* Brand Voltage */
--brand-blue: #0176d3;       /* Salesforce Identity & Link Voltage */
--brand-blue-deep: #014486;  /* Pressed & Active Link Voltage */
--primary-cta: #1c1c1e;      /* Miro Black-Pill Primary Action */
--on-primary: #ffffff;

/* Structural Hairlines */
--hairline: #e0e2e8;         /* Crisp 1px card borders */
--hairline-soft: #eef0f3;    /* Internal dividers */
--hairline-strong: #c7cad5;  /* Secondary button borders */

/* Miro Sticky-Note Pastel Accents (Used on chips & status tags) */
--tag-yellow-bg: #fff8e0;
--tag-yellow-text: #746019;

--tag-teal-bg: #c3faf5;
--tag-teal-text: #187574;

--tag-rose-bg: #ffd8f4;
--tag-rose-text: #9d174d;

--tag-lavender-bg: #f5f3ff;
--tag-lavender-text: #4338ca;

--tag-success-bg: #dcfce7;
--tag-success-text: #15803d;

--tag-danger-bg: #fee2e2;
--tag-danger-text: #991b1b;
```

---

## 3. Typography: Geist Sans Discipline

Typography carries the personality of ArcGym. We standardize on **Geist Sans** with strict geometric weight restraint.

* **Weights Allowed:**
  * `400 (Regular)`: Prompts, rationales, technical descriptions, body text.
  * `500 (Medium)`: Headings, button labels, pill tabs, interactive option text.
  * `600 (Semibold)`: Status badges, streak counters, metric numbers.
  * **Rule:** Weight `700` (Bold) is prohibited. High contrast is achieved through font scale and ink density, not excessive weight.
* **Letter Spacing:**
  * Display and headings: `-0.5px` to `-1px` (`tracking-tight`).
  * Body: normal tracking, line-height `1.55`.
* **Casing:**
  * **Sentence case everywhere.** All-caps tracked-out eyebrows (`TODAY'S ARCHITECTURAL PRACTICE`) are strictly purged.

### Type Scale
| Token | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display` | 32px | 500 | 1.15 | -1.0px | Main page headline |
| `heading-1` | 24px | 500 | 1.25 | -0.5px | Drill question / prompt |
| `heading-2` | 18px | 500 | 1.35 | -0.2px | Section titles, move headers |
| `body-md` | 15px | 400 | 1.55 | normal | Prompt descriptions, option labels |
| `body-sm` | 13px | 400 / 500 | 1.50 | normal | Rationale text, secondary notes |
| `pill-label`| 13px | 500 | 1.20 | normal | Buttons, tabs, confidence chips |
| `micro` | 11px | 600 | 1.30 | normal | Domain pills, streak badges |

---

## 4. Shape Language & Geometry

Miro's shape grammar balances tactile pill controls with spacious card containers:

* **Pills (`rounded-full` / 9999px):**
  * All interactive elements you touch: Primary buttons, outline buttons, format selector tabs, confidence chips, streak pills, domain badges.
* **Feature Cards (`rounded-3xl` / 28px):**
  * The outer drill container card and major post-drill result summaries. Internal padding is generous (`p-6` to `p-8`).
* **Sub-Cards & Decision Options (`rounded-xl` / 16px):**
  * Individual multiple-choice option rows, hangover log boxes, parameter sliders.
* **Inputs & Controls (`rounded-lg` / 8px):**
  * Form fields, dropdown menus, and search bars.
* **Shadow Rule:**
  * **Zero fuzzy blur drop shadows** (`box-shadow: 0 10px ...` is prohibited).
  * Flat white cards against `#f7f8fa` surface with crisp 1px `--hairline` (`#e0e2e8`). Elevated modals use crisp directional shadow (`rgba(5, 0, 56, 0.08) 0px 12px 32px -4px`).

---

## 5. Universal Pre-Submit Confidence Gate (Miro Pill Treatment)

The Pre-Submit Gate enforces discrete confidence calibration before any commit:

* **Container:** Soft neutral surface (`#fafbfc`), hairline border (`#e0e2e8`), `rounded-2xl`.
* **4 Discrete Confidence Pills (`rounded-full`):**
  1. `50% Speculative`: Hairline border, transparent background, text `#555a6a`.
  2. `70% Plausible`: Soft teal tint (`#c3faf5` background, text `#187574`).
  3. `85% High conviction`: Soft blue tint (`#e0e7ff` background, text `#3730a3`).
  4. `95% Architectural axiom`: Deep ink pill (`#1c1c1e` background, text `#ffffff`).
* **Commit CTA:**
  * Solid Black Pill: `bg-[#1c1c1e] text-white rounded-full h-11 px-7 font-medium hover:bg-[#2c2c34] active:bg-[#050038]`.

---

## 6. Motion & Animation Discipline

To eliminate "AI-generated" visual tells:
* **Micro-Transitions:** Strictly capped at `150ms ease-out`. Never use bouncy spring physics or delayed stagger fades.
* **No Confetti on Individual Questions:** Confetti is reserved exclusively for completing the entire daily drill (all reps finished).
* **Hover Effects:** Subtle border color shift (`border-slate-200` -> `border-slate-400`), zero hover translateY or scale zooms.
