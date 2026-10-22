---
status: accepted
---

# Self-Contained Mermaid Architecture Diagrams with Obsidian Pele

We retired the custom React/TSX diagramming engine (`@arcgym/diagrams`), manual SVG coordinate primitives, and Playwright geometry test suite in favor of **self-contained Mermaid syntax rendered via Obsidian Pele (`pele`)**.

## Context & Problem

Previously, authoring architectural topology diagrams for Troubleshooting Incidents required:
1. Writing TSX components with explicit pixel coordinate calculations (`AuthoredBox { x: 25, y: 53, width: 100 }`) and custom layout stages.
2. Exporting SVGs to `apps/arcgym-web/public/diagrams/<id>.svg` via React SSR (`exportSvg`).
3. Running a 670-line Playwright geometry audit (`auditSvgGeometry.ts`) in Chromium to catch box collisions, arrow misalignments, and label crossings.
4. Referencing disconnected external asset paths (`diagramUrl: "/diagrams/..."`) in drill JSON definitions.

This introduced high friction for human authors and AI agents, bloated CI with headless browser installations, and severed diagrams from drill definitions.

## Decision

1. **Mermaid as Foundation & Single Source of Truth**:
   - Drills define topology diagrams directly in JSON via `drill.architecture.diagramSource` using standard Mermaid syntax (`flowchart LR`, `sequenceDiagram`).
   - Drills are 100% self-contained and versioned together without external orphaned asset dependencies.
2. **Obsidian Pele (`pele`) Rendering Engine**:
   - We adopt `pele` (zero dependencies, synchronous, sub-millisecond compile time, CSS variable theming).
   - `scripts/build-drills.ts` validates Mermaid syntax at build time and bakes standalone SVGs into `apps/arcgym-web/public/diagrams/` with embedded ArcGym theme tokens and dark-mode media queries.
   - The web app UI (`DiagramViewer`) dynamically renders Mermaid in the browser, inheriting ArcGym's Miro design tokens and theme toggles in real time.
   - The Studio editor (`TroubleshootingEditor`) provides live, interactive diagram preview as authors type.
3. **Complete Retirement of Legacy Diagramming Code**:
   - Deleted `packages/diagrams/`, custom geometry primitives (`primitives.tsx`), and Chromium geometry test suites.
   - Removed Playwright browser installation from GitHub Actions CI.

## Consequences

- Authors and agents author diagrams using simple, readable Mermaid text.
- Build time and CI execution are significantly faster (no headless browser setup).
- Diagrams automatically adapt to dark mode and light mode across web runners and Studio.
