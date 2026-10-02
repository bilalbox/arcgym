import type { ReactNode } from 'react';

const FONT_SANS = 'system-ui, sans-serif';
const FONT_MONO = "ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace";

export type AuthoredNodeFamily = 'sky' | 'teal' | 'amber' | 'violet' | 'neutral' | 'rose';
export type AuthoredEdgeMotion = 'fast' | 'slow';
export type AuthoredPoint = { x: number; y: number };

export type AuthoredBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AuthoredLegendItem =
  | { kind: 'swatch'; family: AuthoredNodeFamily; label: string }
  | { kind: 'line'; label: string; crossOrg?: boolean; dashed?: boolean };

export function AuthoredArrowDefs(props: { prefix: string }) {
  return (
    <defs>
      <marker
        id={`${props.prefix}-arrow`}
        markerWidth="8"
        markerHeight="6"
        refX="7"
        refY="3"
        orient="auto"
      >
        <polygon points="0 0, 8 3, 0 6" fill="var(--diagram-svg-line, #64748b)" />
      </marker>
      <marker
        id={`${props.prefix}-arrow-link`}
        markerWidth="8"
        markerHeight="6"
        refX="7"
        refY="3"
        orient="auto"
      >
        <polygon points="0 0, 8 3, 0 6" fill="var(--diagram-svg-sky-3, #0284c7)" />
      </marker>
      <marker
        id={`${props.prefix}-arrow-arcgym`}
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--diagram-arcgym-line, #64748b)" />
      </marker>
      <marker
        id={`${props.prefix}-arrow-warn`}
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--diagram-arcgym-warn-border, #dc2626)" />
      </marker>
    </defs>
  );
}

export function AuthoredSvgShell(props: {
  prefix: string;
  width: number;
  height: number;
  title: string;
  description: string;
  variant?: 'legacy' | 'arcgym';
  children?: ReactNode;
}) {
  const titleId = `${props.prefix}-title`;
  const descId = `${props.prefix}-desc`;
  const isLegacy = props.variant === 'legacy';

  return (
    <svg
      className="diagram-svg diagram-svg--authored"
      viewBox={`0 0 ${props.width} ${props.height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
    >
      <title id={titleId}>{props.title}</title>
      <desc id={descId}>{props.description}</desc>
      <AuthoredArrowDefs prefix={props.prefix} />
      <rect
        width="100%"
        height="100%"
        rx={isLegacy ? '0' : '14'}
        fill={
          isLegacy ? 'var(--diagram-svg-background)' : 'var(--diagram-arcgym-canvas-bg, #f8fafc)'
        }
        stroke={isLegacy ? 'none' : 'var(--diagram-arcgym-canvas-border, #e2e8f0)'}
        strokeWidth={isLegacy ? '0' : '1.5'}
      />
      {props.children}
    </svg>
  );
}

export function boxAnchor(
  box: AuthoredBox,
  side: 'top' | 'right' | 'bottom' | 'left',
  t = 0.5,
): AuthoredPoint {
  switch (side) {
    case 'top':
      return { x: box.x + box.width * t, y: box.y };
    case 'right':
      return { x: box.x + box.width, y: box.y + box.height * t };
    case 'bottom':
      return { x: box.x + box.width * t, y: box.y + box.height };
    case 'left':
      return { x: box.x, y: box.y + box.height * t };
  }
}

export function elbow(
  start: AuthoredPoint,
  end: AuthoredPoint,
  first: 'horizontal' | 'vertical' = 'horizontal',
): AuthoredPoint[] {
  if (Math.abs(start.x - end.x) < 0.5 || Math.abs(start.y - end.y) < 0.5) {
    return [start, end];
  }

  const mid = first === 'horizontal' ? { x: end.x, y: start.y } : { x: start.x, y: end.y };

  return [start, mid, end];
}

/** Orthogonal route whose final segment enters `into` perpendicular to that side. */
export function elbowInto(
  start: AuthoredPoint,
  end: AuthoredPoint,
  into: 'left' | 'right' | 'top' | 'bottom',
): AuthoredPoint[] {
  const first = into === 'left' || into === 'right' ? 'vertical' : 'horizontal';
  return elbow(start, end, first);
}

/** Like elbowInto, but keeps a straight ≥10px final run into the target face (for arrow-dock QA). */
export function dockInto(
  start: AuthoredPoint,
  end: AuthoredPoint,
  into: 'left' | 'right' | 'top' | 'bottom',
  lead = 12,
): AuthoredPoint[] {
  switch (into) {
    case 'left':
      return [start, { x: start.x, y: end.y }, { x: end.x - lead, y: end.y }, end];
    case 'right':
      return [start, { x: start.x, y: end.y }, { x: end.x + lead, y: end.y }, end];
    case 'top':
      return [start, { x: end.x, y: start.y }, { x: end.x, y: end.y - lead }, end];
    case 'bottom':
      return [start, { x: end.x, y: start.y }, { x: end.x, y: end.y + lead }, end];
  }
}

export function roundedOrthogonalPath(points: AuthoredPoint[], radius = 8) {
  const pts = points.filter(
    (point, index) =>
      index === 0 || Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y) > 0.5,
  );

  if (pts.length < 2) {
    return '';
  }

  if (pts.length === 2) {
    return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  }

  let d = `M ${pts[0].x},${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i += 1) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const inLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const outLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);

    if (r < 0.5) {
      d += ` L ${curr.x},${curr.y}`;
      continue;
    }

    const ix = curr.x - ((curr.x - prev.x) / inLen) * r;
    const iy = curr.y - ((curr.y - prev.y) / inLen) * r;
    const ox = curr.x + ((next.x - curr.x) / outLen) * r;
    const oy = curr.y + ((next.y - curr.y) / outLen) * r;
    d += ` L ${ix},${iy} Q ${curr.x},${curr.y} ${ox},${oy}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x},${last.y}`;
  return d;
}

function EdgeLabel(props: {
  x: number;
  y: number;
  label: string;
  variant?: 'legacy' | 'arcgym' | 'warning';
}) {
  const isArcgym = props.variant === 'arcgym' || props.variant === 'warning';
  const isWarning = props.variant === 'warning';

  if (isArcgym) {
    const labelW = Math.max(32, Math.round(props.label.length * 5.6 + 14));
    return (
      <>
        <rect
          className="diagram-edge-label-mask"
          x={props.x - labelW / 2}
          y={props.y - 9}
          width={labelW}
          height="18"
          rx="4"
          fill={
            isWarning
              ? 'var(--diagram-arcgym-warn-bg, #fef2f2)'
              : 'var(--diagram-arcgym-pill-bg, #ffffff)'
          }
          stroke={
            isWarning
              ? 'var(--diagram-arcgym-warn-border, #dc2626)'
              : 'var(--diagram-arcgym-pill-border, #cbd5e1)'
          }
          strokeWidth="1"
          data-layout-role="edge-label-mask"
        />
        <text
          className="diagram-edge-label"
          x={props.x}
          y={props.y + 3.5}
          fill={
            isWarning
              ? 'var(--diagram-arcgym-warn-text, #991b1b)'
              : 'var(--diagram-arcgym-line-text, #475569)'
          }
          fontSize="8"
          fontFamily={FONT_SANS}
          fontWeight="500"
          textAnchor="middle"
          data-layout-role="edge-label"
        >
          {props.label}
        </text>
      </>
    );
  }

  const labelW = Math.max(24, props.label.length * 6.4 + 14);

  return (
    <>
      <rect
        className="diagram-edge-label-mask"
        x={props.x - labelW / 2}
        y={props.y - 9}
        width={labelW}
        height="12"
        rx="2"
        fill="var(--diagram-svg-background)"
      />
      <text
        className="diagram-edge-label"
        x={props.x}
        y={props.y}
        fill="var(--diagram-svg-line)"
        fontSize="8"
        fontFamily={FONT_MONO}
        textAnchor="middle"
        letterSpacing="0.06em"
      >
        {props.label}
      </text>
    </>
  );
}

function labelAnchor(points: AuthoredPoint[]) {
  let bestLen = -1;
  let mid = points[0];
  let horizontal = true;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);

    if (len > bestLen) {
      bestLen = len;
      mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      horizontal = Math.abs(dx) >= Math.abs(dy);
    }
  }

  return {
    x: mid.x,
    y: mid.y + (horizontal ? -8 : 3),
  };
}

export function AuthoredNode(props: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  family: AuthoredNodeFamily;
  tag?: string;
  subtitle?: string;
  emphasis?: 'focal' | 'store';
  variant?: 'legacy' | 'arcgym';
}) {
  const cx = props.x + props.width / 2;
  const nameLines = props.name.split('\n').filter(Boolean);

  if (props.variant === 'legacy') {
    const fill =
      props.emphasis === 'focal'
        ? 'var(--diagram-svg-teal-2)'
        : props.emphasis === 'store'
          ? 'var(--diagram-svg-neutral-1)'
          : `var(--diagram-svg-${props.family}-1)`;
    const stroke =
      props.emphasis === 'focal' ? 'var(--diagram-svg-title)' : 'var(--diagram-svg-line)';
    const tagStroke =
      props.emphasis === 'focal'
        ? 'color-mix(in oklch, var(--diagram-svg-title) 50%, transparent)'
        : 'color-mix(in oklch, var(--diagram-svg-line) 40%, transparent)';
    const tagWidth = props.tag ? Math.max(28, Math.round(props.tag.length * 6.2 + 10)) : 0;
    const nameStartY = props.tag
      ? props.y + 36
      : props.subtitle
        ? props.y + 24
        : props.y + props.height / 2 + 4 - ((nameLines.length - 1) * 13) / 2;

    return (
      <g className="diagram-node" data-node-id={props.id}>
        <rect
          className="diagram-node-mask"
          x={props.x}
          y={props.y}
          width={props.width}
          height={props.height}
          rx="6"
          fill="var(--diagram-svg-background)"
        />
        <rect
          className="diagram-node-body"
          x={props.x}
          y={props.y}
          width={props.width}
          height={props.height}
          rx="6"
          fill={fill}
          stroke={stroke}
          strokeWidth="1"
        />
        {props.tag ? (
          <>
            <rect
              x={props.x + 8}
              y={props.y + 8}
              width={tagWidth}
              height="12"
              rx="2"
              fill="transparent"
              stroke={tagStroke}
              strokeWidth="0.8"
            />
            <text
              x={props.x + 8 + tagWidth / 2}
              y={props.y + 17}
              fill="var(--diagram-svg-text)"
              fontSize="7"
              fontFamily={FONT_MONO}
              textAnchor="middle"
              letterSpacing="0.08em"
            >
              {props.tag}
            </text>
          </>
        ) : null}
        {nameLines.map((line, index) => (
          <text
            key={line}
            x={cx}
            y={nameStartY + index * 13}
            fill="var(--diagram-svg-text)"
            fontSize="12"
            fontWeight="600"
            fontFamily={FONT_SANS}
            textAnchor="middle"
          >
            {line}
          </text>
        ))}
        {props.subtitle ? (
          <text
            x={cx}
            y={nameStartY + nameLines.length * 13 + 4}
            fill="var(--diagram-svg-line)"
            fontSize="9"
            fontFamily={FONT_MONO}
            textAnchor="middle"
          >
            {props.subtitle}
          </text>
        ) : null}
      </g>
    );
  }

  // ArcGym Card style
  const isFocal = props.emphasis === 'focal';
  const headerH = props.tag ? (props.height < 70 ? 18 : 22) : 0;
  const bodyH = props.height - headerH;
  const bodyCenterY = props.y + headerH + bodyH / 2;
  const textBlockH = nameLines.length * 12 + (props.subtitle ? 11 : 0);
  const nameStartY = bodyCenterY - textBlockH / 2 + 9;

  const familyVar = props.family
    ? `var(--diagram-arcgym-family-${props.family}, var(--diagram-arcgym-line, #64748b))`
    : undefined;
  const cardFill = familyVar
    ? `color-mix(in oklch, ${familyVar} 6%, var(--diagram-arcgym-card-bg, #ffffff))`
    : 'var(--diagram-arcgym-card-bg, #ffffff)';
  const headerFill = familyVar
    ? `color-mix(in oklch, ${familyVar} 14%, var(--diagram-arcgym-card-header-bg, #f1f5f9))`
    : 'var(--diagram-arcgym-card-header-bg, #f1f5f9)';

  return (
    <g className="diagram-node" data-node-id={props.id} data-layout-role="node">
      <rect
        className="diagram-node-mask"
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        rx="10"
        fill="var(--diagram-svg-background)"
        data-layout-role="node-mask"
      />
      <rect
        className="diagram-node-body"
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        rx="10"
        fill={cardFill}
        stroke={
          isFocal
            ? 'var(--diagram-arcgym-line, #64748b)'
            : 'var(--diagram-arcgym-card-border, #cbd5e1)'
        }
        strokeWidth={isFocal ? '2' : '1.5'}
        data-layout-role="node-body"
      />
      {props.tag && (
        <>
          <rect
            x={props.x}
            y={props.y}
            width={props.width}
            height={headerH}
            rx="10"
            fill={headerFill}
            data-layout-role="node-header"
          />
          <text
            x={cx}
            y={props.y + (headerH === 18 ? 12.5 : 15)}
            textAnchor="middle"
            fontFamily={FONT_SANS}
            fontSize="8.5"
            fontWeight="600"
            letterSpacing="0.04em"
            fill="var(--diagram-arcgym-card-title, #0f172a)"
            data-layout-role="node-tag"
          >
            {props.tag}
          </text>
        </>
      )}
      {nameLines.map((line, index) => (
        <text
          key={line}
          x={cx}
          y={nameStartY + index * 12}
          fill="var(--diagram-arcgym-card-title, #0f172a)"
          fontSize="10"
          fontWeight="600"
          fontFamily={FONT_SANS}
          textAnchor="middle"
        >
          {line}
        </text>
      ))}
      {props.subtitle && (
        <text
          x={cx}
          y={nameStartY + nameLines.length * 12 + 1}
          fill="var(--diagram-arcgym-card-subtitle, #64748b)"
          fontSize="8"
          fontFamily={FONT_SANS}
          textAnchor="middle"
        >
          {props.subtitle}
        </text>
      )}
    </g>
  );
}

export function AuthoredEdge(props: {
  prefix: string;
  from: string;
  to: string;
  points: AuthoredPoint[];
  label?: string;
  /** Pin the edge label; defaults to midpoint of the longest segment. */
  labelAt?: AuthoredPoint;
  /** Space-separated L2 rule ids to skip for this edge (`path-detour`, etc.). */
  qaAllow?: string;
  crossOrg?: boolean;
  motion?: AuthoredEdgeMotion;
  dashed?: boolean;
  arrow?: boolean;
  variant?: 'legacy' | 'arcgym' | 'warning';
}) {
  const isWarning = props.variant === 'warning';
  const isLegacy = props.variant === 'legacy';

  let stroke = props.crossOrg
    ? 'var(--diagram-svg-sky-3, #0284c7)'
    : 'var(--diagram-arcgym-line, #64748b)';
  let markerId = props.crossOrg ? `#${props.prefix}-arrow-link` : `#${props.prefix}-arrow-arcgym`;

  if (isWarning) {
    stroke = 'var(--diagram-arcgym-warn-border, #dc2626)';
    markerId = `#${props.prefix}-arrow-warn`;
  } else if (isLegacy) {
    stroke = props.crossOrg
      ? 'var(--diagram-svg-sky-3, #0284c7)'
      : 'var(--diagram-svg-line, #64748b)';
    markerId = props.crossOrg ? `#${props.prefix}-arrow-link` : `#${props.prefix}-arrow`;
  }

  const d = roundedOrthogonalPath(props.points);
  const label = props.label ? (props.labelAt ?? labelAnchor(props.points)) : null;
  const showArrow = props.arrow !== false;

  return (
    <g
      className="diagram-edge"
      data-edge-from={props.from}
      data-edge-to={props.to}
      {...(props.motion ? { 'data-motion': props.motion } : {})}
      {...(props.dashed ? { 'data-edge-style': 'dashed' } : {})}
      {...(props.qaAllow ? { 'data-qa-allow': props.qaAllow } : {})}
    >
      <path
        className="diagram-edge-line"
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={isLegacy ? '1.2' : '1.8'}
        {...(props.dashed ? { strokeDasharray: '5 4' } : {})}
        {...(showArrow ? { markerEnd: `url(${markerId})` } : {})}
      />
      {props.label && label ? (
        <EdgeLabel
          x={label.x}
          y={label.y}
          label={props.label}
          variant={props.variant ?? 'arcgym'}
        />
      ) : null}
    </g>
  );
}

export type AuthoredCardProps = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  header?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  variant?: 'default' | 'warning' | 'muted';
};

export function AuthoredCard(props: AuthoredCardProps) {
  const cx = props.x + props.width / 2;
  const isWarning = props.variant === 'warning';
  const isMuted = props.variant === 'muted';
  const isCompact = props.height < 100;
  const headerH = isCompact ? 22 : 26;
  const badgeH = isCompact ? 18 : 20;

  const titleY = props.y + (props.header ? headerH + (isCompact ? 16 : 20) : isCompact ? 24 : 32);
  const subtitleY = titleY + (isCompact ? 14 : 16);
  const badgeRectY = props.y + props.height - badgeH - (isCompact ? 7 : 10);
  const badgeTextY = badgeRectY + badgeH / 2 + 3.5;

  return (
    <g className="diagram-node" data-node-id={props.id} {...(isMuted ? { opacity: '0.6' } : {})}>
      {/* Card Base Container */}
      <rect
        className="diagram-node-body"
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        rx="10"
        fill={
          isWarning
            ? 'var(--diagram-arcgym-warn-bg, #fef2f2)'
            : 'var(--diagram-arcgym-card-bg, #ffffff)'
        }
        stroke={
          isWarning
            ? 'var(--diagram-arcgym-warn-border, #dc2626)'
            : 'var(--diagram-arcgym-card-border, #cbd5e1)'
        }
        strokeWidth={isWarning ? '2' : '1.5'}
        {...(isMuted ? { strokeDasharray: '5 4' } : {})}
      />

      {/* Top Header Strip */}
      {props.header && (
        <>
          <rect
            x={props.x}
            y={props.y}
            width={props.width}
            height={headerH}
            rx="10"
            fill={
              isWarning
                ? 'var(--diagram-arcgym-warn-header-bg, #fee2e2)'
                : 'var(--diagram-arcgym-card-header-bg, #f1f5f9)'
            }
          />
          <text
            x={cx}
            y={props.y + (isCompact ? 15 : 17)}
            textAnchor="middle"
            fontFamily={FONT_SANS}
            fontSize={isCompact ? '10' : '11'}
            fontWeight="600"
            fill={
              isWarning
                ? 'var(--diagram-arcgym-warn-text, #991b1b)'
                : 'var(--diagram-arcgym-card-title, #0f172a)'
            }
          >
            {props.header}
          </text>
        </>
      )}

      {/* Primary Concept / Component Title */}
      <text
        x={cx}
        y={titleY}
        textAnchor="middle"
        fontFamily={FONT_SANS}
        fontSize={isCompact ? '10.5' : '11'}
        fontWeight="600"
        fill={
          isWarning
            ? 'var(--diagram-arcgym-warn-text, #991b1b)'
            : 'var(--diagram-arcgym-card-title, #0f172a)'
        }
      >
        {props.title}
      </text>

      {/* Secondary Subtitle / Description */}
      {props.subtitle && (
        <text
          x={cx}
          y={subtitleY}
          textAnchor="middle"
          fontFamily={FONT_SANS}
          fontSize="9"
          fill={
            isWarning
              ? 'var(--diagram-arcgym-warn-subtext, #b91c1c)'
              : 'var(--diagram-arcgym-card-subtitle, #64748b)'
          }
        >
          {props.subtitle}
        </text>
      )}

      {/* Bottom Pill Badge */}
      {props.badge && (
        <>
          <rect
            x={props.x + 14}
            y={badgeRectY}
            width={props.width - 28}
            height={badgeH}
            rx="4"
            fill={
              isWarning
                ? 'var(--diagram-arcgym-warn-bg, #fef2f2)'
                : 'var(--diagram-arcgym-badge-bg, #f8fafc)'
            }
            stroke={
              isWarning
                ? 'var(--diagram-arcgym-warn-border, #fca5a5)'
                : 'var(--diagram-arcgym-badge-border, #cbd5e1)'
            }
            strokeWidth="1"
          />
          <text
            x={cx}
            y={badgeTextY}
            textAnchor="middle"
            fontFamily={FONT_SANS}
            fontSize="8.5"
            fontWeight="500"
            fill={
              isWarning
                ? 'var(--diagram-arcgym-warn-text, #991b1b)'
                : 'var(--diagram-arcgym-badge-text, #475569)'
            }
          >
            {props.badge}
          </text>
        </>
      )}
    </g>
  );
}

export function AuthoredCorridorEdge(props: {
  prefix: string;
  x1: number;
  y: number;
  x2: number;
  from: string;
  to: string;
  label: string;
  crossOrg?: boolean;
  motion?: AuthoredEdgeMotion;
  variant?: 'legacy' | 'arcgym';
}) {
  const isLegacy = props.variant === 'legacy';
  const r = 8;
  const upOffset = 60;
  const my = props.y - upOffset;
  const dx = props.x2 - props.x1;
  const gutter = Math.max(16, Math.min(24, dx / 3));
  const xA = props.x1 + gutter;
  const xB = props.x2 - gutter;
  const midX = Math.round((xA + xB) / 2);
  const d = [
    `M ${props.x1},${props.y}`,
    `H ${xA - r}`,
    `Q ${xA},${props.y} ${xA},${props.y - r}`,
    `V ${my}`,
    `H ${xB - r}`,
    `Q ${xB},${my} ${xB},${my + r}`,
    `V ${props.y}`,
    `H ${props.x2}`,
  ].join(' ');

  const stroke = props.crossOrg
    ? 'var(--diagram-svg-sky-3, #0284c7)'
    : isLegacy
      ? 'var(--diagram-svg-line, #64748b)'
      : 'var(--diagram-arcgym-line, #64748b)';
  const markerId = `${props.prefix}-${
    props.crossOrg ? 'arrow-link' : isLegacy ? 'arrow' : 'arrow-arcgym'
  }`;

  return (
    <g
      className="diagram-edge"
      data-edge-from={props.from}
      data-edge-to={props.to}
      {...(props.motion ? { 'data-motion': props.motion } : {})}
    >
      <path
        className="diagram-edge-line"
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={isLegacy ? '1.2' : '1.8'}
        markerEnd={`url(#${markerId})`}
      />
      <EdgeLabel x={midX} y={my - 9} label={props.label} variant={props.variant ?? 'arcgym'} />
    </g>
  );
}

export function AuthoredZone(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  labelWidth?: number;
  family?: AuthoredNodeFamily;
  strength?: 'soft' | 'medium';
  labelAlign?: 'center' | 'start';
  variant?: 'legacy' | 'arcgym';
}) {
  if (props.variant === 'legacy') {
    const labelWidth = props.labelWidth ?? Math.round(props.label.length * 6.4 + 16);
    const isStart = props.labelAlign === 'start';
    const labelX = isStart ? props.x + 10 : props.x + props.width / 2 - labelWidth / 2;
    const textX = isStart ? labelX + 8 : props.x + props.width / 2;
    const strength = props.strength ?? 'soft';
    const fill = props.family
      ? `color-mix(in oklch, var(--diagram-svg-${props.family}-1) ${strength === 'medium' ? '42%' : '22%'}, var(--diagram-svg-background))`
      : 'color-mix(in oklch, var(--diagram-svg-line) 2%, transparent)';
    const stroke = props.family
      ? `color-mix(in oklch, var(--diagram-svg-${props.family}-3) 55%, var(--diagram-svg-line))`
      : 'color-mix(in oklch, var(--diagram-svg-line) 12%, transparent)';

    return (
      <>
        <rect
          x={props.x}
          y={props.y}
          width={props.width}
          height={props.height}
          rx="8"
          fill={fill}
          stroke={stroke}
          strokeWidth="0.8"
        />
        <rect
          x={labelX}
          y={props.y + 4}
          width={labelWidth}
          height="12"
          rx="2"
          fill="var(--diagram-svg-background)"
        />
        <text
          x={textX}
          y={props.y + 13}
          fill="color-mix(in oklch, var(--diagram-svg-line) 40%, transparent)"
          fontSize="7"
          fontFamily={FONT_MONO}
          textAnchor={isStart ? 'start' : 'middle'}
          letterSpacing="0.14em"
        >
          {props.label}
        </text>
      </>
    );
  }

  const headerH = 24;
  const cx = props.x + props.width / 2;
  const isStart = props.labelAlign === 'start';
  const textX = isStart ? props.x + 14 : cx;
  const textAnchor = isStart ? 'start' : 'middle';

  const zoneId = props.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return (
    <g className="diagram-zone cluster" data-zone-id={zoneId} data-layout-role="zone">
      <rect
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        rx="12"
        fill="color-mix(in oklch, var(--diagram-arcgym-zone-bg, #ffffff) 60%, transparent)"
        stroke="var(--diagram-arcgym-zone-border, #cbd5e1)"
        strokeWidth="1.5"
        data-layout-role="zone-body"
      />
      <rect
        x={props.x}
        y={props.y}
        width={props.width}
        height={headerH}
        rx="12"
        fill="var(--diagram-arcgym-zone-header-bg, #f1f5f9)"
        data-layout-role="zone-header"
      />
      <text
        x={textX}
        y={props.y + 16}
        textAnchor={textAnchor}
        fontFamily={FONT_SANS}
        fontSize="10.5"
        fontWeight="600"
        letterSpacing="0.04em"
        fill="var(--diagram-arcgym-card-title, #0f172a)"
        data-layout-role="zone-title"
      >
        {props.label}
      </text>
    </g>
  );
}

function LegendSwatch(props: { x: number; y: number; fill: string; label: string }) {
  return (
    <>
      <rect
        x={props.x}
        y={props.y - 4}
        width="12"
        height="12"
        rx="2"
        fill={props.fill}
        stroke="var(--diagram-svg-line)"
        strokeWidth="0.8"
      />
      <text
        x={props.x + 20}
        y={props.y + 4}
        fill="var(--diagram-svg-line)"
        fontSize="8"
        fontFamily={FONT_MONO}
      >
        {props.label}
      </text>
    </>
  );
}

export function AuthoredLegend(props: {
  y: number;
  width: number;
  prefix: string;
  items: AuthoredLegendItem[];
}) {
  let x = 108;

  return (
    <>
      <line
        x1="32"
        y1={props.y - 8}
        x2={props.width - 32}
        y2={props.y - 8}
        stroke="color-mix(in oklch, var(--diagram-svg-line) 12%, transparent)"
        strokeWidth="0.8"
      />
      <text
        x="32"
        y={props.y + 8}
        fill="var(--diagram-svg-line)"
        fontSize="8"
        fontFamily={FONT_MONO}
        letterSpacing="0.14em"
      >
        LEGEND
      </text>
      {props.items.map((item) => {
        const itemX = x;

        if (item.kind === 'swatch') {
          x += 20 + item.label.length * 7.2 + 16;
          return (
            <LegendSwatch
              key={`swatch-${item.family}-${item.label}`}
              x={itemX}
              y={props.y}
              fill={`var(--diagram-svg-${item.family}-1)`}
              label={item.label}
            />
          );
        }

        const lineWidth = 28;
        x += lineWidth + 12 + item.label.length * 7.2 + 16;
        const stroke = item.crossOrg ? 'var(--diagram-svg-sky-3)' : 'var(--diagram-svg-line)';

        return (
          <g key={`line-${item.label}-${item.crossOrg ? 'x' : 'n'}-${item.dashed ? 'd' : 's'}`}>
            <line
              x1={itemX}
              y1={props.y + 2}
              x2={itemX + lineWidth}
              y2={props.y + 2}
              stroke={stroke}
              strokeWidth="1.2"
              {...(item.dashed ? { strokeDasharray: '5 5' } : {})}
              markerEnd={`url(#${props.prefix}-${item.crossOrg ? 'arrow-link' : 'arrow'})`}
            />
            <text
              x={itemX + lineWidth + 12}
              y={props.y + 4}
              fill="var(--diagram-svg-line)"
              fontSize="8"
              fontFamily={FONT_MONO}
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </>
  );
}
