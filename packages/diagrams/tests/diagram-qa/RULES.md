# Diagram visual QA

Deterministic Chromium/`getBBox` and path-metric checks. Mask-over-line edge labels are allowed.
Screenshot baselines and vision review (L3) are postponed.

## Pass / fail — L1 hard geometry

| Rule id | Requirement |
| --- | --- |
| `zone-header-intrusion` | No `.diagram-node-body` may intersect a `data-layout-role="zone-header"` band. |
| `label-collision` | Edge-label masks must not intersect other edge-label masks, node bodies, zone headers, phase badges, or lifelines (lifelines expanded to a thin vertical strip). Own stroke under a label is OK. |
| `text-foreign-cover` | Visible diagram `text` must not be covered by a foreign opaque obstacle (node body/header, other edge-label mask, zone header, phase badge). Own backing rects and zone/phase bodies are exempt. |
| `arrow-dock` | Final path approach to `data-edge-to` must hit near a target edge (node body or actor lifeline) and align within the angle tolerance of that edge's inward normal — not slide parallel along the face. |

### L1 tolerances (defaults)

- Overlap: flag when intersection exceeds **2px** on both axes
- Arrow tip distance to target boundary: **≤ 14px**
- Arrow approach vs edge normal: within **25°**
- Lifeline obstacle half-width: **3px**

## Pass / fail — L2 soft aesthetics

| Rule id | Requirement |
| --- | --- |
| `path-detour` | Edge path length must not greatly exceed the Manhattan distance between endpoints. Fail when **ratio > 2.8** and **absolute excess > 120px** (both must trip). |
| `label-off-stroke` | Edge-label mask center must stay within **28px** of the nearest sampled point on its own path. Self-loop edges (`from === to`) are exempt. |
| `edge-crossing` | Distinct architecture edges must not come within **3px** mid-path (sampled every ~6px), except near shared endpoints/docks. Skipped on sequence diagrams (SVGs that contain lifelines). Pairs that share a `from` or `to` node are exempt (fan-in / fan-out). |
| `node-clearance` | Distinct `.diagram-node-body` boxes must not sit in a near-miss gap: fail when gap is **> 0** and **< 8px**. |

### L2 tolerances (defaults)

- Path detour ratio: **> 2.8** and excess length **> 120px**
- Label-off-stroke distance: **> 28px**
- Edge sample step: **6px**; crossing proximity: **≤ 3px**; endpoint exemption radius: **14px**
- Node clearance near-miss: gap in **(0, 8)px**

### Intentional exceptions

Prefer fixing layout or pinning labels with `labelAt` before allowlisting.

On an edge group, skip specific L2 rules:

```html
<g class="diagram-edge" data-qa-allow="path-detour">...</g>
```

`data-qa-allow` is a space-separated list of rule ids (`path-detour`, `label-off-stroke`, `edge-crossing`). `node-clearance` is node-scoped and has no edge allow attribute.

## Scope / CI

Every **package-emitted** drill SVG registered in `EMITTED_DIAGRAMS`, audited after mounting the static SVG in Chromium.
`pnpm --filter @arcgym/diagrams test:diagram-qa` requires **zero** L1 and L2 violations.
Each violation in `packages/diagrams/test-results/diagram-qa/report.json` includes `tier: "L1" | "L2"`.
Hand-authored SVGs under `apps/arcgym-web/public/diagrams/` are out of scope until rewritten via `@arcgym/diagrams`.
