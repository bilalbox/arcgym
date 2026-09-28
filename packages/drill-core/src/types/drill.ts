export type ConfidenceAnchor = 0.5 | 0.7 | 0.85 | 0.95;

export type DrillFormat = 'Rapid_Fire' | 'Diagram';

/** Practice category from Salesforce Architect Fundamentals. Orthogonal to Well-Architected pillars. */
export type ArchitecturalDomain =
  | 'Platform_Core'
  | 'Data_Architecture'
  | 'Security_And_Access'
  | 'Integration_Apis'
  | 'Ai_And_Automation'
  | 'Infrastructure'
  | 'Devops_Lifecycle';

export const ARCHITECTURAL_DOMAINS: ArchitecturalDomain[] = [
  'Platform_Core',
  'Data_Architecture',
  'Security_And_Access',
  'Integration_Apis',
  'Ai_And_Automation',
  'Infrastructure',
  'Devops_Lifecycle',
];

/** Short display names for Architectural Domain filter chrome. */
export const ARCHITECTURAL_DOMAIN_LABELS: Record<ArchitecturalDomain, string> = {
  Platform_Core: 'Platform Core',
  Data_Architecture: 'Data Architecture',
  Security_And_Access: 'Security & Access',
  Integration_Apis: 'Integration APIs',
  Ai_And_Automation: 'AI & Automation',
  Infrastructure: 'Infrastructure',
  Devops_Lifecycle: 'DevOps Lifecycle',
};

export type WellArchitectedPillar =
  | 'Trust'
  | 'Reliability'
  | 'Operational_Excellence'
  | 'Cost_Optimization'
  | 'Fairness';

export const WELL_ARCHITECTED_PILLARS: WellArchitectedPillar[] = [
  'Trust',
  'Reliability',
  'Operational_Excellence',
  'Cost_Optimization',
  'Fairness',
];

export const WELL_ARCHITECTED_PILLAR_LABELS: Record<WellArchitectedPillar, string> = {
  Trust: 'Trust',
  Reliability: 'Reliability',
  Operational_Excellence: 'Operational Excellence',
  Cost_Optimization: 'Cost Optimization',
  Fairness: 'Fairness',
};

export type MetacognitiveQuadrant =
  | 'Calibrated_Conviction'
  | 'Calibrated_Humility'
  | 'Hesitant_Mastery'
  | 'Hazardous_Assumption';

export interface DrillOptionDTO {
  id: string;
  label: string;
  isCorrect: boolean;
  distractorAntipattern?: string;
  rationale: string;
  citationUrl?: string;
}

export interface RapidFireStepDTO {
  id: string;
  prompt: string;
  options: DrillOptionDTO[];
}

export type DiagramMode = 'fault' | 'compose' | 'compare';

export type DiagramVariantKind =
  | 'missing_node'
  | 'wrong_edge'
  | 'misplaced_component'
  | 'missing_edge'
  | 'compare_topology';

export type DiagramNodeKind = 'component' | 'slot';

export type DiagramHotspotTargetKind = 'node' | 'edge' | 'slot';

/** Normalized canvas point; renderer scales to pixels. */
export interface DiagramLayoutPoint {
  x: number;
  y: number;
}

export interface DiagramNodeDTO {
  id: string;
  label: string;
  kind: DiagramNodeKind;
  /** Optional layer/role hint for styling (e.g. ingest, lakehouse, activation). */
  layer?: string;
}

export interface DiagramEdgeDTO {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface DiagramGraphDTO {
  nodes: DiagramNodeDTO[];
  edges: DiagramEdgeDTO[];
}

/** Presentation layout, separated from topology so renderers can swap. */
export interface DiagramLayoutDTO {
  nodes: Record<string, DiagramLayoutPoint>;
  edges?: Record<string, DiagramLayoutPoint[]>;
}

export interface DiagramHotspotDTO {
  /** Matches a node id or edge id in the step graph. */
  id: string;
  targetKind: DiagramHotspotTargetKind;
  isCorrect: boolean;
  /** Plausible decoys: short antipattern name (2–5 words). Filler decoys omit this. */
  distractorAntipattern?: string;
  /** Optional richer miss copy for authored decoys. */
  missRationale?: string;
}

export interface DiagramHotspotStepDTO {
  id: string;
  mode: 'fault' | 'compose';
  prompt: string;
  /** Official Architect page whose topology was redrawn (learner-facing provenance). */
  sourceDiagramUrl: string;
  variant: DiagramVariantKind;
  graph: DiagramGraphDTO;
  layout: DiagramLayoutDTO;
  hotspots: DiagramHotspotDTO[];
  /** MCQ shown to choose the repair. */
  options: DrillOptionDTO[];
  /** Miss copy when a filler hotspot (no distractorAntipattern) is clicked. */
  genericMissCopy?: string;
}

export interface DiagramCompareOptionDTO extends DrillOptionDTO {
  /** SVG/image URL (or inline data URI / SVG path) of the candidate architecture diagram. */
  diagramUrl: string;
  /** Optional inline SVG string if embedded directly. */
  diagramSvg?: string;
}

export interface DiagramCompareStepDTO {
  id: string;
  mode: 'compare';
  prompt: string;
  /** Official Architect page whose topology was redrawn (learner-facing provenance). */
  sourceDiagramUrl: string;
  variant?: DiagramVariantKind;
  options: DiagramCompareOptionDTO[];
}

export type DiagramStepDTO = DiagramHotspotStepDTO | DiagramCompareStepDTO;

export function isDiagramHotspotStep(step: DiagramStepDTO): step is DiagramHotspotStepDTO {
  return step.mode === 'fault' || step.mode === 'compose';
}

export function isDiagramCompareStep(step: DiagramStepDTO): step is DiagramCompareStepDTO {
  return step.mode === 'compare';
}

/** Editorial lifecycle — drafts stay in content/ but are excluded from the live catalog. */
export type DrillStatus = 'draft' | 'published';

export const DRILL_STATUSES: DrillStatus[] = ['draft', 'published'];

/** Shared catalog metadata — recommendation and filters only need this surface. */
export interface DrillDefinitionBase {
  id: string;
  title: string;
  domain: ArchitecturalDomain;
  domainLabel: string;
  difficulty: 'Associate_Domain_Architect' | 'Lead_CTA';
  pillars: WellArchitectedPillar[];
  version: number;
  /** Only `published` drills are compiled into the learner-facing catalog. */
  status: DrillStatus;
  /** Friction Cards (local data/friction_cards.json) the distractors were modeled on. */
  sourceCardIds?: string[];
}

export interface RapidFireDrillDefinition extends DrillDefinitionBase {
  format: 'Rapid_Fire';
  steps: RapidFireStepDTO[];
}

export interface DiagramDrillDefinition extends DrillDefinitionBase {
  format: 'Diagram';
  steps: DiagramStepDTO[];
}

export type DrillDefinitionDTO = RapidFireDrillDefinition | DiagramDrillDefinition;

export function isRapidFireDrill(d: DrillDefinitionDTO): d is RapidFireDrillDefinition {
  return d.format === 'Rapid_Fire';
}

export function isDiagramDrill(d: DrillDefinitionDTO): d is DiagramDrillDefinition {
  return d.format === 'Diagram';
}

export interface AttemptSubmissionDTO {
  drillId: string;
  stepId: string;
  selectedOptionId: string;
  confidence: ConfidenceAnchor;
  isCorrect: boolean;
  timeToCommitMs: number;
}

export interface StepAttemptTelemetry {
  stepId: string;
  confidence: ConfidenceAnchor;
  isCorrect: boolean;
  score: number;
  selectedOptionId?: string;
  distractorAntipattern?: string;
}

export interface DrillAttemptRecord {
  drillId: string;
  format: DrillFormat;
  completedAt: string; // ISO 8601 string
  score: number;
  accuracy: number; // 0 to 1
  attemptsCount: number;
  steps?: StepAttemptTelemetry[];
}

export type ProficiencyDimension = 'domains';

export interface DimensionProficiency {
  id: string; // ArchitecturalDomain
  label: string;
  totalQuestions: number;
  correctQuestions: number;
  accuracy: number; // 0 to 100 percentage
  isMeasured: boolean; // totalQuestions >= threshold (e.g. 4)
  drillsCompleted: number;
}

export interface VisitorProgressState {
  version: 1;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  completedDrills: Record<string, DrillAttemptRecord>;
}
