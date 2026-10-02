import type { ReactElement } from 'react';
import { LINEAR_TOPOLOGY_DEFS, LINEAR_TOPOLOGY_RENDERERS } from './linearCatalog.js';
import { SPECIAL_TOPOLOGY_RENDERERS } from './specials.js';

export type TopologyMeta = {
  id: string;
  title: string;
};

const SPECIAL_META: TopologyMeta[] = [
  {
    id: 'agd-00801-unified-topology',
    title: 'Unified Individual Segment Activation Topology',
  },
  {
    id: 'agd-00801-direct-topology',
    title: 'Direct Contact DMO Activation Topology',
  },
  {
    id: 'agd-00801-lake-topology',
    title: 'Raw Data Lake Ingest Push Topology',
  },
  {
    id: 'agd-00802-hub-topology',
    title: 'Data Cloud One Hub-and-Spoke Topology',
  },
  {
    id: 'agd-00802-independent-topology',
    title: 'Independent Data Cloud Instances Topology',
  },
  {
    id: 'agd-00803-regional-topology',
    title: 'Regional Data Cloud Clusters with Zero Copy Data Sharing',
  },
  {
    id: 'agd-00805-hybrid-topology',
    title: 'Hybrid Data Virtualization Topology',
  },
];

export const TOPOLOGY_RENDERERS: Record<string, () => ReactElement> = {
  ...LINEAR_TOPOLOGY_RENDERERS,
  ...SPECIAL_TOPOLOGY_RENDERERS,
};

export const TOPOLOGY_META: TopologyMeta[] = [
  ...SPECIAL_META,
  ...LINEAR_TOPOLOGY_DEFS.map((def) => ({ id: def.id, title: def.title })),
].sort((a, b) => a.id.localeCompare(b.id));
