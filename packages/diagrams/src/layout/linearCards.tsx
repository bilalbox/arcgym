import type { ReactElement } from 'react';
import {
  type AuthoredBox,
  AuthoredCard,
  type AuthoredCardProps,
  AuthoredEdge,
  AuthoredSvgShell,
  boxAnchor,
  elbow,
} from '../primitives.js';

export type LinearCardStage = {
  id: string;
  header: string;
  title: string;
  subtitle?: string;
  badge?: string;
  variant?: AuthoredCardProps['variant'];
  width?: number;
};

export type LinearCardEdge = {
  from: string;
  to: string;
  label: string;
};

const DEFAULT_WIDTHS: Record<number, number[]> = {
  2: [300, 300],
  3: [210, 220, 200],
  4: [170, 170, 170, 170],
};

/**
 * Horizontal AuthoredCard flow with labeled AuthoredEdges — the common Rapid Fire topology.
 */
export function LinearCardTopology(props: {
  prefix: string;
  title: string;
  description: string;
  stages: LinearCardStage[];
  edges: LinearCardEdge[];
  width?: number;
  height?: number;
  padX?: number;
  padY?: number;
  gap?: number;
  cardHeight?: number;
}): ReactElement {
  const width = props.width ?? 800;
  const height = props.height ?? 160;
  const padX = props.padX ?? 30;
  const padY = props.padY ?? 20;
  const count = props.stages.length;
  const gap = props.gap ?? (count <= 2 ? 140 : 60);
  const cardHeight = props.cardHeight ?? 120;
  const widths = props.stages.every((s) => s.width != null)
    ? props.stages.map((s) => s.width as number)
    : (DEFAULT_WIDTHS[count] ?? Array.from({ length: count }, () => 160));

  const contentWidth = widths.reduce((sum, w) => sum + w, 0) + gap * (count - 1);
  const startX = Math.max(padX, Math.round((width - contentWidth) / 2));

  const boxes: AuthoredBox[] = [];
  let x = startX;
  for (let i = 0; i < count; i += 1) {
    boxes.push({ x, y: padY, width: widths[i], height: cardHeight });
    x += widths[i] + gap;
  }

  const boxById = new Map(props.stages.map((stage, i) => [stage.id, boxes[i]]));

  return (
    <AuthoredSvgShell
      prefix={props.prefix}
      width={width}
      height={height}
      title={props.title}
      description={props.description}
      variant="arcgym"
    >
      {props.stages.map((stage, i) => (
        <AuthoredCard
          key={stage.id}
          id={stage.id}
          {...boxes[i]}
          header={stage.header}
          title={stage.title}
          subtitle={stage.subtitle}
          badge={stage.badge}
          variant={stage.variant}
        />
      ))}
      {props.edges.map((edge) => {
        const from = boxById.get(edge.from);
        const to = boxById.get(edge.to);
        if (!from || !to) {
          throw new Error(`Unknown edge endpoints ${edge.from}→${edge.to}`);
        }
        return (
          <AuthoredEdge
            key={`${edge.from}-${edge.to}-${edge.label}`}
            prefix={props.prefix}
            from={edge.from}
            to={edge.to}
            label={edge.label}
            points={elbow(boxAnchor(from, 'right'), boxAnchor(to, 'left'))}
            variant="arcgym"
          />
        );
      })}
    </AuthoredSvgShell>
  );
}
