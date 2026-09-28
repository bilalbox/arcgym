import React, { useEffect, useRef } from 'react';
import { dia, shapes } from '@joint/core';
import type { DiagramGraphDTO, DiagramHotspotDTO, DiagramLayoutDTO } from '@arcgym/drill-core';

const VIEW_H = 400;
const NODE_W = 132;
const NODE_H = 42;

export const DiagramCanvas: React.FC<{
  graph: DiagramGraphDTO;
  layout: DiagramLayoutDTO;
  hotspots: DiagramHotspotDTO[];
  selectedHotspotId: string | null;
  interactive: boolean;
  onSelectHotspot: (id: string) => void;
}> = ({ graph, layout, hotspots, selectedHotspotId, interactive, onSelectHotspot }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<dia.Paper | null>(null);
  const graphRef = useRef<dia.Graph | null>(null);
  const onSelectRef = useRef(onSelectHotspot);
  const hotspotIdsRef = useRef(new Set(hotspots.map((h) => h.id)));
  const interactiveRef = useRef(interactive);
  onSelectRef.current = onSelectHotspot;
  hotspotIdsRef.current = new Set(hotspots.map((h) => h.id));
  interactiveRef.current = interactive;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const jointGraph = new dia.Graph({}, { cellNamespace: shapes });
    const paper = new dia.Paper({
      el: host,
      model: jointGraph,
      width: host.clientWidth || 720,
      height: VIEW_H,
      gridSize: 1,
      drawGrid: false,
      background: { color: '#f7f8fa' },
      interactive: false,
      async: true,
      sorting: dia.Paper.sorting.APPROX,
      defaultConnector: { name: 'rounded' },
      cellViewNamespace: shapes,
    });

    graphRef.current = jointGraph;
    paperRef.current = paper;

    const trySelect = (id: string) => {
      if (!interactiveRef.current) return;
      if (!hotspotIdsRef.current.has(id)) return;
      onSelectRef.current(id);
    };

    paper.on('element:pointerclick', (elementView) => {
      trySelect(String(elementView.model.id));
    });
    paper.on('link:pointerclick', (linkView) => {
      trySelect(String(linkView.model.id));
    });

    // Drag blank area to pan
    let drag: { x: number; y: number; tx: number; ty: number } | null = null;
    paper.on('blank:pointerdown', (evt) => {
      const e = evt as unknown as PointerEvent;
      const t = paper.translate();
      drag = { x: e.clientX, y: e.clientY, tx: t.tx, ty: t.ty };
    });
    paper.on('blank:pointermove', (evt) => {
      if (!drag) return;
      const e = evt as unknown as PointerEvent;
      paper.translate(drag.tx + (e.clientX - drag.x), drag.ty + (e.clientY - drag.y));
    });
    paper.on('blank:pointerup', () => {
      drag = null;
    });

    const ro = new ResizeObserver(() => {
      paper.setDimensions(host.clientWidth || 720, VIEW_H);
    });
    ro.observe(host);

    return () => {
      ro.disconnect();
      paper.remove();
      jointGraph.clear();
      paperRef.current = null;
      graphRef.current = null;
    };
  }, []);

  useEffect(() => {
    const jointGraph = graphRef.current;
    const paper = paperRef.current;
    const host = hostRef.current;
    if (!jointGraph || !paper || !host) return;

    jointGraph.clear();
    paper.translate(0, 0);
    paper.scale(1);

    const width = host.clientWidth || 720;
    paper.setDimensions(width, VIEW_H);
    const hotspotIds = new Set(hotspots.map((h) => h.id));
    const cells: dia.Cell[] = [];

    for (const node of graph.nodes) {
      const pos = layout.nodes[node.id] ?? { x: 0.5, y: 0.5 };
      const isSlot = node.kind === 'slot';
      const isHotspot = hotspotIds.has(node.id);
      const selected = selectedHotspotId === node.id;
      cells.push(
        new shapes.standard.Rectangle({
          id: node.id,
          position: {
            x: Math.max(8, pos.x * (width - NODE_W - 16)),
            y: Math.max(8, pos.y * (VIEW_H - NODE_H - 16)),
          },
          size: { width: NODE_W, height: NODE_H },
          attrs: {
            body: {
              fill: isSlot ? '#fafbfc' : '#ffffff',
              stroke: selected ? '#1c1c1e' : isSlot ? '#8e91a0' : '#e0e2e8',
              strokeWidth: selected ? 2.5 : isSlot ? 1.5 : 1,
              strokeDasharray: isSlot ? '5 4' : '0',
              rx: 10,
              ry: 10,
              cursor: interactive && isHotspot ? 'pointer' : 'default',
            },
            label: {
              text: node.label || '',
              fill: '#1c1c1e',
              fontSize: 12,
              fontWeight: '500',
              fontFamily: 'Geist Sans, system-ui, sans-serif',
            },
          },
        })
      );
    }

    for (const edge of graph.edges) {
      const isHotspot = hotspotIds.has(edge.id);
      const selected = selectedHotspotId === edge.id;
      const stroke = selected ? '#1c1c1e' : '#c7cad5';
      cells.push(
        new shapes.standard.Link({
          id: edge.id,
          source: { id: edge.source },
          target: { id: edge.target },
          z: selected ? 2 : 1,
          attrs: {
            line: {
              stroke,
              strokeWidth: selected ? 3.5 : 2.5,
              targetMarker: {
                type: 'path',
                d: 'M 8 -4 0 0 8 4 Z',
                fill: stroke,
              },
              cursor: interactive && isHotspot ? 'pointer' : 'default',
            },
          },
          labels: edge.label
            ? [
                {
                  attrs: {
                    text: {
                      text: edge.label,
                      fill: '#555a6a',
                      fontSize: 11,
                      fontFamily: 'Geist Sans, system-ui, sans-serif',
                    },
                    rect: { fill: '#f7f8fa' },
                  },
                },
              ]
            : [],
        })
      );
    }

    jointGraph.resetCells(cells);
  }, [graph, layout, hotspots, selectedHotspotId, interactive]);

  const zoom = (delta: number) => {
    const paper = paperRef.current;
    if (!paper) return;
    const current = paper.scale().sx;
    const next = Math.min(2.2, Math.max(0.6, current + delta));
    paper.scale(next, next);
  };

  return (
    <div className="relative rounded-2xl border border-miro-hairline overflow-hidden bg-miro-surface">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-miro-hairline bg-miro-card text-miro-primary text-sm font-medium"
          onClick={() => zoom(0.15)}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-miro-hairline bg-miro-card text-miro-primary text-sm font-medium"
          onClick={() => zoom(-0.15)}
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
      <div ref={hostRef} className="w-full touch-none" style={{ height: VIEW_H }} />
      <p className="px-3 py-2 text-[11px] text-miro-muted border-t border-miro-hairlineSoft">
        Drag the background to pan. Click a node or edge after setting confidence
        {graph.nodes.some((n) => n.kind === 'slot')
          ? ' — dashed boxes are identical compose slots.'
          : '.'}
      </p>
    </div>
  );
};
