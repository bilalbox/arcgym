/** Package-emitted drill SVGs (QA + export registry). */
import { TOPOLOGY_META, type TopologyMeta } from './authored/index.js';

export type EmittedDiagram = TopologyMeta;

export const EMITTED_DIAGRAMS: readonly EmittedDiagram[] = TOPOLOGY_META;
