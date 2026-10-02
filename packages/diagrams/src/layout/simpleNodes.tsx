import type { ReactElement } from 'react';
import {
  type AuthoredBox,
  AuthoredEdge,
  AuthoredNode,
  type AuthoredNodeFamily,
  AuthoredSvgShell,
  boxAnchor,
  elbow,
} from '../primitives.js';

export type SimpleNodeStage = {
  id: string;
  name: string;
  subtitle?: string;
  tag?: string;
  family?: AuthoredNodeFamily;
  width?: number;
  height?: number;
  emphasis?: 'focal' | 'store';
  variant?: 'legacy' | 'arcgym';
};

/**
 * Compact AuthoredNode chain (AGD-00801-style stages without card chrome).
 */
export function SimpleNodeTopology(props: {
  prefix: string;
  title: string;
  description: string;
  stages: SimpleNodeStage[];
  edgeLabels?: string[];
  width?: number;
  height?: number;
  padX?: number;
  gap?: number;
  nodeHeight?: number;
}): ReactElement {
  const width = props.width ?? 800;
  const height = props.height ?? 160;
  const padX = props.padX ?? 25;
  const gap = props.gap ?? 40;
  const nodeHeight = props.nodeHeight ?? 54;
  const count = props.stages.length;
  const defaultW = Math.floor((width - padX * 2 - gap * (count - 1)) / count);
  const widths = props.stages.map((s) => s.width ?? defaultW);
  const contentWidth = widths.reduce((sum, w) => sum + w, 0) + gap * (count - 1);
  const startX = Math.max(padX, Math.round((width - contentWidth) / 2));
  const y = Math.round((height - nodeHeight) / 2);

  const boxes: AuthoredBox[] = [];
  let x = startX;
  for (let i = 0; i < count; i += 1) {
    boxes.push({
      x,
      y,
      width: widths[i],
      height: props.stages[i].height ?? nodeHeight,
    });
    x += widths[i] + gap;
  }

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
        <AuthoredNode
          key={stage.id}
          id={stage.id}
          {...boxes[i]}
          name={stage.name}
          subtitle={stage.subtitle}
          tag={stage.tag}
          family={stage.family ?? 'neutral'}
          emphasis={stage.emphasis}
          variant={stage.variant ?? 'arcgym'}
        />
      ))}
      {props.stages.slice(0, -1).map((stage, i) => {
        const next = props.stages[i + 1];
        return (
          <AuthoredEdge
            key={`${stage.id}-${next.id}`}
            prefix={props.prefix}
            from={stage.id}
            to={next.id}
            label={props.edgeLabels?.[i]}
            points={elbow(boxAnchor(boxes[i], 'right'), boxAnchor(boxes[i + 1], 'left'))}
            variant="arcgym"
          />
        );
      })}
    </AuthoredSvgShell>
  );
}
