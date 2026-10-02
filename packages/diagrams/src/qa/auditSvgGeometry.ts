export type DiagramQaOptions = {
  overlapTolerancePx: number;
  dockDistancePx: number;
  dockAngleDeg: number;
  lifelineHalfWidthPx: number;
  /** L2: path length / manhattan; both ratio and excess must trip. */
  pathDetourRatio: number;
  pathDetourExcessPx: number;
  /** L2: max distance from label-mask center to own stroke. */
  labelOffStrokePx: number;
  /** L2: sample step along edge paths for crossing detection. */
  edgeSampleStepPx: number;
  /** L2: mid-path samples closer than this count as a crossing. */
  edgeCrossingProximityPx: number;
  /** L2: samples within this of either endpoint are exempt from crossings. */
  edgeCrossingEndpointExemptPx: number;
  /** L2: near-miss gap between node bodies (exclusive of 0 / overlap). */
  nodeClearanceMinPx: number;
};

export type DiagramQaRule =
  | 'zone-header-intrusion'
  | 'label-collision'
  | 'text-foreign-cover'
  | 'arrow-dock'
  | 'path-detour'
  | 'label-off-stroke'
  | 'edge-crossing'
  | 'node-clearance';

export type DiagramQaViolation = {
  rule: DiagramQaRule;
  tier: 'L1' | 'L2';
  message: string;
  a?: string;
  b?: string;
  meta?: Record<string, number | string>;
};

export const DEFAULT_DIAGRAM_QA_OPTIONS: DiagramQaOptions = {
  overlapTolerancePx: 2,
  dockDistancePx: 14,
  dockAngleDeg: 25,
  lifelineHalfWidthPx: 3,
  pathDetourRatio: 2.8,
  pathDetourExcessPx: 120,
  labelOffStrokePx: 28,
  edgeSampleStepPx: 6,
  edgeCrossingProximityPx: 3,
  edgeCrossingEndpointExemptPx: 14,
  nodeClearanceMinPx: 8,
};

type Box = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

/**
 * Self-contained for Playwright `locator.evaluate` (no closed-over imports).
 * Measures rendered SVG geometry in Chromium.
 */
export function auditSvgGeometry(
  svg: SVGSVGElement,
  options: DiagramQaOptions,
): DiagramQaViolation[] {
  const violations: DiagramQaViolation[] = [];
  const tol = options.overlapTolerancePx;
  const l1Rules = new Set<DiagramQaRule>([
    'zone-header-intrusion',
    'label-collision',
    'text-foreign-cover',
    'arrow-dock',
  ]);

  function pushViolation(partial: Omit<DiagramQaViolation, 'tier'> & { tier?: 'L1' | 'L2' }) {
    violations.push({
      ...partial,
      tier: partial.tier ?? (l1Rules.has(partial.rule) ? 'L1' : 'L2'),
    });
  }

  function roleOf(el: Element | null): string {
    return el?.getAttribute('data-layout-role') ?? '';
  }

  function labelFor(el: Element): string {
    const role = roleOf(el);
    if (role === 'lifeline' || el.classList.contains('diagram-lifeline')) {
      return `lifeline:${el.getAttribute('data-id') ?? '?'}`;
    }
    const nodeId = el.closest('[data-node-id]')?.getAttribute('data-node-id');
    if (
      nodeId &&
      (role === 'node-body' || role === 'node-header' || el.classList.contains('diagram-node-body'))
    ) {
      return `node:${nodeId}`;
    }
    if (nodeId && el.closest('.diagram-node') === el) {
      return `node:${nodeId}`;
    }
    const zoneId = el.closest('[data-zone-id]')?.getAttribute('data-zone-id');
    if (zoneId) return `zone:${zoneId}`;
    const phaseId = el.closest('[data-phase-id]')?.getAttribute('data-phase-id');
    if (phaseId) return `phase:${phaseId}`;
    const edge = el.closest('.diagram-edge');
    if (edge) {
      const from = edge.getAttribute('data-edge-from') ?? '?';
      const to = edge.getAttribute('data-edge-to') ?? '?';
      const text = edge.querySelector('.diagram-edge-label')?.textContent?.trim() ?? '';
      return `edge:${from}->${to}${text ? `(${text})` : ''}`;
    }
    if (nodeId) return `node:${nodeId}`;
    const text = el.textContent?.trim();
    if (text) return `text:${text.slice(0, 48)}`;
    return el.tagName.toLowerCase();
  }

  function boxOf(el: SVGGraphicsElement): Box | null {
    try {
      const b = el.getBBox();
      if (!Number.isFinite(b.x) || b.width < 0 || b.height < 0) return null;
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    } catch {
      return null;
    }
  }

  function overlapAmount(a: Box, b: Box): { x: number; y: number } {
    const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return { x, y };
  }

  function overlaps(a: Box, b: Box, tolerance = tol): boolean {
    const o = overlapAmount(a, b);
    return o.x > tolerance && o.y > tolerance;
  }

  function angleDiffDeg(a: number, b: number): number {
    let diff = Math.abs(a - b) % 360;
    if (diff > 180) diff = 360 - diff;
    return diff;
  }

  function qaAllows(edge: Element, rule: DiagramQaRule): boolean {
    const raw = edge.getAttribute('data-qa-allow') ?? '';
    if (!raw.trim()) return false;
    return raw
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .includes(rule);
  }

  function samplePath(
    path: SVGPathElement,
    stepPx: number,
  ): { points: Point[]; totalLen: number } | null {
    let totalLen = 0;
    try {
      totalLen = path.getTotalLength();
    } catch {
      return null;
    }
    if (totalLen < 2) return null;
    const points: Point[] = [];
    const step = Math.max(2, stepPx);
    for (let d = 0; d <= totalLen; d += step) {
      const p = path.getPointAtLength(Math.min(d, totalLen));
      points.push({ x: p.x, y: p.y });
    }
    const tip = path.getPointAtLength(totalLen);
    const last = points[points.length - 1];
    if (!last || Math.hypot(last.x - tip.x, last.y - tip.y) > 0.5) {
      points.push({ x: tip.x, y: tip.y });
    }
    return { points, totalLen };
  }

  function boxGap(a: Box, b: Box): number {
    const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
    const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
    if (gapX === 0 && gapY === 0) {
      const o = overlapAmount(a, b);
      if (o.x > 0 && o.y > 0) return 0;
      return 0;
    }
    if (gapX === 0) return gapY;
    if (gapY === 0) return gapX;
    return Math.hypot(gapX, gapY);
  }

  const zoneHeaders = Array.from(
    svg.querySelectorAll<SVGGraphicsElement>('[data-layout-role="zone-header"]'),
  );
  const nodeBodies = Array.from(
    svg.querySelectorAll<SVGGraphicsElement>('.diagram-node-body, [data-layout-role="node-body"]'),
  );
  const edgeLabelMasks = Array.from(
    svg.querySelectorAll<SVGGraphicsElement>(
      '.diagram-edge-label-mask, [data-layout-role="edge-label-mask"]',
    ),
  );
  const phaseBadges = Array.from(
    svg.querySelectorAll<SVGGraphicsElement>('[data-layout-role="phase-badge"]'),
  );
  const lifelines = Array.from(
    svg.querySelectorAll<SVGGraphicsElement>('.diagram-lifeline, [data-layout-role="lifeline"]'),
  );
  const nodeHeaders = Array.from(
    svg.querySelectorAll<SVGGraphicsElement>('[data-layout-role="node-header"]'),
  );

  const lifelineBoxes: Array<{ el: SVGGraphicsElement; box: Box }> = [];
  for (const line of lifelines) {
    const box = boxOf(line);
    if (!box) continue;
    const half = options.lifelineHalfWidthPx;
    lifelineBoxes.push({
      el: line,
      box: {
        x: box.x + box.width / 2 - half,
        y: box.y,
        width: Math.max(box.width, half * 2),
        height: box.height,
      },
    });
  }

  const isSequenceDiagram = lifelines.length > 0;

  // --- zone-header-intrusion ---
  for (const header of zoneHeaders) {
    const headerBox = boxOf(header);
    if (!headerBox) continue;
    for (const node of nodeBodies) {
      const nodeBox = boxOf(node);
      if (!nodeBox || !overlaps(headerBox, nodeBox)) continue;
      const o = overlapAmount(headerBox, nodeBox);
      pushViolation({
        rule: 'zone-header-intrusion',
        message: 'Node body intersects a zone header band',
        a: labelFor(header),
        b: labelFor(node),
        meta: { overlapX: Number(o.x.toFixed(1)), overlapY: Number(o.y.toFixed(1)) },
      });
    }
  }

  // --- label-collision ---
  type Obstacle = { el: Element; box: Box; kind: string };
  const labelObstacles: Obstacle[] = [];

  for (const node of nodeBodies) {
    const box = boxOf(node);
    if (box) labelObstacles.push({ el: node, box, kind: 'node' });
  }
  for (const header of zoneHeaders) {
    const box = boxOf(header);
    if (box) labelObstacles.push({ el: header, box, kind: 'zone-header' });
  }
  for (const badge of phaseBadges) {
    const box = boxOf(badge);
    if (box) labelObstacles.push({ el: badge, box, kind: 'phase-badge' });
  }
  for (const { el, box } of lifelineBoxes) {
    labelObstacles.push({ el, box, kind: 'lifeline' });
  }

  for (let i = 0; i < edgeLabelMasks.length; i += 1) {
    const mask = edgeLabelMasks[i];
    const maskBox = boxOf(mask);
    if (!maskBox) continue;
    const edge = mask.closest('.diagram-edge');

    for (let j = i + 1; j < edgeLabelMasks.length; j += 1) {
      const other = edgeLabelMasks[j];
      const otherBox = boxOf(other);
      if (!otherBox || !overlaps(maskBox, otherBox)) continue;
      pushViolation({
        rule: 'label-collision',
        message: 'Edge labels overlap each other',
        a: labelFor(mask),
        b: labelFor(other),
      });
    }

    for (const obstacle of labelObstacles) {
      if (edge?.contains(obstacle.el)) continue;
      if (!overlaps(maskBox, obstacle.box)) continue;
      pushViolation({
        rule: 'label-collision',
        message: `Edge label overlaps ${obstacle.kind}`,
        a: labelFor(mask),
        b: labelFor(obstacle.el),
      });
    }
  }

  // --- text-foreign-cover ---
  const coverObstacles: Obstacle[] = [];
  for (const node of nodeBodies) {
    const box = boxOf(node);
    if (box) coverObstacles.push({ el: node, box, kind: 'node-body' });
  }
  for (const header of nodeHeaders) {
    const box = boxOf(header);
    if (box) coverObstacles.push({ el: header, box, kind: 'node-header' });
  }
  for (const header of zoneHeaders) {
    const box = boxOf(header);
    if (box) coverObstacles.push({ el: header, box, kind: 'zone-header' });
  }
  for (const mask of edgeLabelMasks) {
    const box = boxOf(mask);
    if (box) coverObstacles.push({ el: mask, box, kind: 'edge-label-mask' });
  }
  for (const badge of phaseBadges) {
    const box = boxOf(badge);
    if (box) coverObstacles.push({ el: badge, box, kind: 'phase-badge' });
  }

  const texts = Array.from(svg.querySelectorAll('text')).filter((text) => {
    const tag = text.tagName.toLowerCase();
    if (tag !== 'text') return false;
    if (text.closest('defs, title, desc')) return false;
    const content = text.textContent?.trim() ?? '';
    return content.length > 0;
  }) as SVGGraphicsElement[];

  for (const text of texts) {
    const textBox = boxOf(text);
    if (!textBox || textBox.width < 1 || textBox.height < 1) continue;

    const homeNode = text.closest('.diagram-node');
    const homeZone = text.closest('.diagram-zone');
    const homeEdge = text.closest('.diagram-edge');
    const homePhase = text.closest('.diagram-sequence-phase');
    const homeNote = text.closest('.diagram-sequence-note');
    const textRole = roleOf(text);

    for (const obstacle of coverObstacles) {
      if (homeNode?.contains(obstacle.el)) continue;
      if (homeEdge?.contains(obstacle.el)) continue;
      if (homeNote?.contains(obstacle.el)) continue;
      if (
        homeZone?.contains(obstacle.el) &&
        (textRole === 'zone-title' || roleOf(obstacle.el) === 'zone-header')
      ) {
        continue;
      }
      if (
        homePhase?.contains(obstacle.el) &&
        (textRole === 'phase-title' || roleOf(obstacle.el) === 'phase-badge')
      ) {
        continue;
      }
      if (!overlaps(textBox, obstacle.box)) continue;

      const o = overlapAmount(textBox, obstacle.box);
      pushViolation({
        rule: 'text-foreign-cover',
        message: `Text covered by ${obstacle.kind}`,
        a: labelFor(text),
        b: labelFor(obstacle.el),
        meta: { overlapX: Number(o.x.toFixed(1)), overlapY: Number(o.y.toFixed(1)) },
      });
    }
  }

  // --- arrow-dock ---
  const edges = Array.from(svg.querySelectorAll<SVGGElement>('.diagram-edge'));
  for (const edge of edges) {
    const path = edge.querySelector<SVGPathElement>(
      'path.diagram-edge-line, path.diagram-edge-path',
    );
    if (!path || typeof path.getTotalLength !== 'function') continue;

    const toId = edge.getAttribute('data-edge-to');
    if (!toId) continue;

    let totalLen = 0;
    try {
      totalLen = path.getTotalLength();
    } catch {
      continue;
    }
    if (totalLen < 2) continue;

    const tip = path.getPointAtLength(totalLen);
    const before = path.getPointAtLength(Math.max(0, totalLen - 8));
    const dx = tip.x - before.x;
    const dy = tip.y - before.y;
    if (Math.hypot(dx, dy) < 0.5) continue;
    const approachDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    const targetNode = svg.querySelector<SVGGElement>(`[data-node-id="${CSS.escape(toId)}"]`);
    const targetBody = targetNode?.querySelector<SVGGraphicsElement>(
      ".diagram-node-body, [data-layout-role='node-body']",
    );
    const targetLifeline = svg.querySelector<SVGGraphicsElement>(
      `.diagram-lifeline[data-id="${CSS.escape(toId)}"], [data-layout-role='lifeline'][data-id="${CSS.escape(toId)}"]`,
    );

    type DockCandidate = {
      label: string;
      distance: number;
      normalDeg: number;
      kind: string;
    };
    const candidates: DockCandidate[] = [];

    if (targetBody) {
      const box = boxOf(targetBody);
      if (box) {
        const left = Math.abs(tip.x - box.x);
        const right = Math.abs(tip.x - (box.x + box.width));
        const top = Math.abs(tip.y - box.y);
        const bottom = Math.abs(tip.y - (box.y + box.height));
        const insideX = tip.x >= box.x - 1 && tip.x <= box.x + box.width + 1;
        const insideY = tip.y >= box.y - 1 && tip.y <= box.y + box.height + 1;
        const nodeLabel = labelFor(targetBody);

        candidates.push(
          {
            label: nodeLabel,
            distance: left + (insideY ? 0 : 1000),
            normalDeg: 0,
            kind: 'left',
          },
          {
            label: nodeLabel,
            distance: right + (insideY ? 0 : 1000),
            normalDeg: 180,
            kind: 'right',
          },
          {
            label: nodeLabel,
            distance: top + (insideX ? 0 : 1000),
            normalDeg: 90,
            kind: 'top',
          },
          {
            label: nodeLabel,
            distance: bottom + (insideX ? 0 : 1000),
            normalDeg: -90,
            kind: 'bottom',
          },
        );
      }
    }

    if (targetLifeline) {
      const box = boxOf(targetLifeline);
      if (box) {
        const cx = box.x + box.width / 2;
        candidates.push({
          label: `lifeline:${toId}`,
          distance: Math.abs(tip.x - cx),
          normalDeg: tip.x <= cx ? 0 : 180,
          kind: 'lifeline',
        });
      }
    }

    if (candidates.length === 0) continue;

    const near = candidates.filter((candidate) => candidate.distance <= options.dockDistancePx);
    const pool = near.length > 0 ? near : [candidates.sort((a, b) => a.distance - b.distance)[0]];
    pool.sort((a, b) => {
      const angleA = angleDiffDeg(approachDeg, a.normalDeg);
      const angleB = angleDiffDeg(approachDeg, b.normalDeg);
      return angleA - angleB || a.distance - b.distance;
    });
    const best = pool[0];
    const angleError = angleDiffDeg(approachDeg, best.normalDeg);

    if (best.distance > options.dockDistancePx || angleError > options.dockAngleDeg) {
      pushViolation({
        rule: 'arrow-dock',
        message: 'Arrow does not dock cleanly into the target edge',
        a: labelFor(edge),
        b: best.label,
        meta: {
          side: best.kind,
          distancePx: Number(best.distance.toFixed(1)),
          approachDeg: Number(approachDeg.toFixed(1)),
          normalDeg: best.normalDeg,
          angleErrorDeg: Number(angleError.toFixed(1)),
        },
      });
    }
  }

  // --- L2: path-detour + label-off-stroke ---
  type EdgeSample = {
    edge: SVGGElement;
    path: SVGPathElement;
    points: Point[];
    totalLen: number;
    start: Point;
    end: Point;
  };
  const edgeSamples: EdgeSample[] = [];

  for (const edge of edges) {
    const path = edge.querySelector<SVGPathElement>(
      'path.diagram-edge-line, path.diagram-edge-path',
    );
    if (!path || typeof path.getTotalLength !== 'function') continue;
    const sampled = samplePath(path, options.edgeSampleStepPx);
    if (!sampled) continue;

    const start = sampled.points[0];
    const end = sampled.points[sampled.points.length - 1];
    edgeSamples.push({
      edge,
      path,
      points: sampled.points,
      totalLen: sampled.totalLen,
      start,
      end,
    });

    if (!qaAllows(edge, 'path-detour')) {
      const manhattan = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
      const baseline = Math.max(manhattan, 1);
      const ratio = sampled.totalLen / baseline;
      const excess = sampled.totalLen - manhattan;
      if (ratio > options.pathDetourRatio && excess > options.pathDetourExcessPx) {
        pushViolation({
          rule: 'path-detour',
          tier: 'L2',
          message: 'Edge path detours far beyond a direct orthogonal route',
          a: labelFor(edge),
          meta: {
            pathLengthPx: Number(sampled.totalLen.toFixed(1)),
            manhattanPx: Number(manhattan.toFixed(1)),
            ratio: Number(ratio.toFixed(2)),
            excessPx: Number(excess.toFixed(1)),
          },
        });
      }
    }

    if (!qaAllows(edge, 'label-off-stroke')) {
      const fromId = edge.getAttribute('data-edge-from') ?? '';
      const toId = edge.getAttribute('data-edge-to') ?? '';
      // Self-loop labels sit beside the stroke by design.
      if (!(fromId && fromId === toId)) {
        const mask = edge.querySelector<SVGGraphicsElement>(
          ".diagram-edge-label-mask, [data-layout-role='edge-label-mask']",
        );
        const maskBox = mask ? boxOf(mask) : null;
        if (maskBox) {
          const cx = maskBox.x + maskBox.width / 2;
          const cy = maskBox.y + maskBox.height / 2;
          let minDist = Number.POSITIVE_INFINITY;
          for (const point of sampled.points) {
            const dist = Math.hypot(point.x - cx, point.y - cy);
            if (dist < minDist) minDist = dist;
          }
          if (minDist > options.labelOffStrokePx) {
            pushViolation({
              rule: 'label-off-stroke',
              tier: 'L2',
              message: 'Edge label sits too far from its own stroke',
              a: labelFor(edge),
              meta: {
                distancePx: Number(minDist.toFixed(1)),
              },
            });
          }
        }
      }
    }
  }

  // --- L2: edge-crossing (architecture only) ---
  if (!isSequenceDiagram) {
    const exempt = options.edgeCrossingEndpointExemptPx;
    const prox = options.edgeCrossingProximityPx;
    const seenPairs = new Set<string>();

    for (let i = 0; i < edgeSamples.length; i += 1) {
      const a = edgeSamples[i];
      if (qaAllows(a.edge, 'edge-crossing')) continue;

      for (let j = i + 1; j < edgeSamples.length; j += 1) {
        const b = edgeSamples[j];
        if (qaAllows(b.edge, 'edge-crossing')) continue;

        const fromA = a.edge.getAttribute('data-edge-from') ?? '';
        const toA = a.edge.getAttribute('data-edge-to') ?? '';
        const fromB = b.edge.getAttribute('data-edge-from') ?? '';
        const toB = b.edge.getAttribute('data-edge-to') ?? '';
        // Fan-in / fan-out edges intentionally share corridors near a hub.
        if (
          (fromA && (fromA === fromB || fromA === toB)) ||
          (toA && (toA === fromB || toA === toB))
        ) {
          continue;
        }

        const pairKey = [fromA, toA, fromB, toB].sort().join('|');
        if (seenPairs.has(pairKey)) continue;

        let crossed = false;
        let minDist = Number.POSITIVE_INFINITY;

        for (const pa of a.points) {
          const nearAEnd =
            Math.hypot(pa.x - a.start.x, pa.y - a.start.y) <= exempt ||
            Math.hypot(pa.x - a.end.x, pa.y - a.end.y) <= exempt;
          if (nearAEnd) continue;

          for (const pb of b.points) {
            const nearBEnd =
              Math.hypot(pb.x - b.start.x, pb.y - b.start.y) <= exempt ||
              Math.hypot(pb.x - b.end.x, pb.y - b.end.y) <= exempt;
            if (nearBEnd) continue;

            const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
            if (dist < minDist) minDist = dist;
            if (dist <= prox) {
              crossed = true;
              break;
            }
          }
          if (crossed) break;
        }

        if (!crossed) continue;
        seenPairs.add(pairKey);
        pushViolation({
          rule: 'edge-crossing',
          tier: 'L2',
          message: 'Architecture edges cross mid-path',
          a: labelFor(a.edge),
          b: labelFor(b.edge),
          meta: {
            proximityPx: Number(minDist.toFixed(1)),
          },
        });
      }
    }
  }

  // --- L2: node-clearance ---
  for (let i = 0; i < nodeBodies.length; i += 1) {
    const aEl = nodeBodies[i];
    const aBox = boxOf(aEl);
    if (!aBox) continue;
    for (let j = i + 1; j < nodeBodies.length; j += 1) {
      const bEl = nodeBodies[j];
      const bBox = boxOf(bEl);
      if (!bBox) continue;
      const gap = boxGap(aBox, bBox);
      if (gap > 0 && gap < options.nodeClearanceMinPx) {
        pushViolation({
          rule: 'node-clearance',
          tier: 'L2',
          message: 'Node bodies are cramped (near-miss gap)',
          a: labelFor(aEl),
          b: labelFor(bEl),
          meta: {
            gapPx: Number(gap.toFixed(1)),
          },
        });
      }
    }
  }

  return violations;
}
