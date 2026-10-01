export type ConfidenceAnchor = 0.5 | 0.7 | 0.85 | 0.95;

export type DrillFormat = 'Rapid_Fire' | 'Case_File';

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

/** Official CTA Review Board / Evaluation scoring domains. Orthogonal to Architectural Domain. */
export type BoardDomain =
  | 'System_Architecture'
  | 'Security'
  | 'Data'
  | 'Solution_Architecture'
  | 'Integration'
  | 'Development_Lifecycle'
  | 'Communication';

export const BOARD_DOMAINS: BoardDomain[] = [
  'System_Architecture',
  'Security',
  'Data',
  'Solution_Architecture',
  'Integration',
  'Development_Lifecycle',
  'Communication',
];

export const BOARD_DOMAIN_LABELS: Record<BoardDomain, string> = {
  System_Architecture: 'System Architecture',
  Security: 'Security',
  Data: 'Data',
  Solution_Architecture: 'Solution Architecture',
  Integration: 'Integration',
  Development_Lifecycle: 'Development Lifecycle',
  Communication: 'Communication',
};

export type ProbeTier = 'pivotal' | 'useful' | 'distractor';

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
  /** Optional SVG or image asset URL for visual architecture choices. */
  diagramUrl?: string;
}

export interface RapidFireStepDTO {
  id: string;
  prompt: string;
  options: DrillOptionDTO[];
}

/** Clarifying question in a Case File station. Answers are scenario facts, not architecture advice. */
export interface ProbeOptionDTO {
  id: string;
  label: string;
  tier: ProbeTier;
  answer: string;
  distractorAntipattern?: string;
}

/** Fictional narrative for a Case File — always present. */
export interface CaseBriefDTO {
  title: string;
  synopsis: string;
  exhibits?: Array<{ label: string; diagramUrl: string }>;
}

/** One CTA-domain decision inside a Case File: Probe Budget then recommendation. */
export interface CaseFileStationDTO {
  id: string;
  domain: ArchitecturalDomain;
  boardDomain: BoardDomain;
  prompt: string;
  probeBudget: number;
  probes: ProbeOptionDTO[];
  options: DrillOptionDTO[];
}

/** Editorial lifecycle — drafts stay in content/ but are excluded from the learner catalog. */
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

export interface CaseFileDrillDefinition extends DrillDefinitionBase {
  format: 'Case_File';
  brief: CaseBriefDTO;
  /** Always exactly 3 stations under one Brief. */
  stations: CaseFileStationDTO[];
}

export type DrillDefinitionDTO = RapidFireDrillDefinition | CaseFileDrillDefinition;

export function isRapidFireDrill(d: DrillDefinitionDTO): d is RapidFireDrillDefinition {
  return d.format === 'Rapid_Fire';
}

export function isCaseFileDrill(d: DrillDefinitionDTO): d is CaseFileDrillDefinition {
  return d.format === 'Case_File';
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
  /** Case File: selected clarifying-question ids. */
  selectedProbeIds?: string[];
  probeScore?: number;
  recommendationScore?: number;
  missedPivotal?: boolean;
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
