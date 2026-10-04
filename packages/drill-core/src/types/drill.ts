export type ConfidenceAnchor = 0.5 | 0.7 | 0.85 | 0.95;

export type DrillFormat = 'Rapid_Fire' | 'Case_File' | 'Troubleshooting';

export const DRILL_FORMATS: DrillFormat[] = ['Rapid_Fire', 'Case_File', 'Troubleshooting'];

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

export const PROBE_TIERS: ProbeTier[] = ['pivotal', 'useful', 'distractor'];

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

export type DrillDifficulty = 'Associate_Domain_Architect' | 'Lead_CTA';
export const DRILL_DIFFICULTIES: DrillDifficulty[] = ['Associate_Domain_Architect', 'Lead_CTA'];

/** Case File rule constants */
export const CASE_FILE_MIN_STATIONS = 3;
export const CASE_FILE_MIN_PROBES_PER_STATION = 5;
export const CASE_FILE_PIVOTAL_PROBES_PER_STATION = 2;

/** Incident (Troubleshooting) rule constants */
export const TROUBLESHOOTING_PROBE_BUDGET = 3;
export const TROUBLESHOOTING_HIDDEN_DISTRACTOR_COUNT = 3;
export const TROUBLESHOOTING_MIN_PROBES = 5;
export const TROUBLESHOOTING_MIN_PIVOTAL_PROBES = 2;

/** Editorial lifecycle — drafts stay in content/ but are excluded from the learner catalog. */
export type DrillStatus = 'draft' | 'published';

export const DRILL_STATUSES: DrillStatus[] = ['draft', 'published'];

/** Shared catalog metadata — recommendation and filters only need this surface. */
export interface DrillDefinitionBase {
  id: string;
  title: string;
  domain: ArchitecturalDomain;
  domainLabel: string;
  difficulty: DrillDifficulty;
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
  /** At least 3 stations under one Brief. */
  stations: CaseFileStationDTO[];
}

/** Topology synopsis + required diagram for a Troubleshooting Incident. */
export interface TroubleshootingArchitectureDTO {
  synopsis: string;
  /** Absolute path to diagram asset (e.g. /diagrams/...). */
  diagramUrl: string;
  diagramLabel?: string;
}

/** Remediation path to prevent recurrence of a troubleshooting failure mode. */
export interface TroubleshootingRemediationDTO {
  title: string;
  description: string;
  /** Optional Citation Manifest URL when the remediation pattern is documentation-backed. */
  citationUrl?: string;
}

/** Authored gold root cause — free-text grading target; never shown as an MCQ. */
export interface GoldCauseDTO {
  text: string;
  rationale: string;
  /** Optional Citation Manifest URL when the failure class is documentation-backed. */
  citationUrl?: string;
  /** Optional architectural remediations to prevent recurrence. */
  remediations?: TroubleshootingRemediationDTO[];
}

/** Hidden antipattern distractor for free-text cause grading — never rendered as a choice. */
export interface HiddenDistractorDTO {
  id: string;
  text: string;
  antipattern: string;
  rationale: string;
}

export interface TroubleshootingDrillDefinition extends DrillDefinitionBase {
  format: 'Troubleshooting';
  architecture: TroubleshootingArchitectureDTO;
  issue: string;
  /** Clarifying-question budget before cause commit (v1: 3). */
  probeBudget: number;
  probes: ProbeOptionDTO[];
  goldCause: GoldCauseDTO;
  /** Exactly three hidden distractors for antipattern-aware grading. */
  hiddenDistractors: HiddenDistractorDTO[];
}

export type ClientTroubleshootingDrillDefinition = Omit<
  TroubleshootingDrillDefinition,
  'goldCause' | 'hiddenDistractors'
>;

export type DrillDefinitionDTO =
  | RapidFireDrillDefinition
  | CaseFileDrillDefinition
  | TroubleshootingDrillDefinition;

export type ClientDrillDefinitionDTO =
  | RapidFireDrillDefinition
  | CaseFileDrillDefinition
  | ClientTroubleshootingDrillDefinition;

import { getDrillFormatDescriptor } from '../formats/index.js';

export function isRapidFireDrill(
  d: DrillDefinitionDTO | ClientDrillDefinitionDTO,
): d is RapidFireDrillDefinition {
  return getDrillFormatDescriptor('Rapid_Fire').isClient(d);
}

export function isCaseFileDrill(
  d: DrillDefinitionDTO | ClientDrillDefinitionDTO,
): d is CaseFileDrillDefinition {
  return getDrillFormatDescriptor('Case_File').isClient(d);
}

export function isTroubleshootingDrill(d: DrillDefinitionDTO): d is TroubleshootingDrillDefinition;
export function isTroubleshootingDrill(
  d: ClientDrillDefinitionDTO,
): d is ClientTroubleshootingDrillDefinition;
export function isTroubleshootingDrill(
  d: DrillDefinitionDTO | ClientDrillDefinitionDTO,
): d is TroubleshootingDrillDefinition | ClientTroubleshootingDrillDefinition {
  return getDrillFormatDescriptor('Troubleshooting').isClient(d);
}

export function sanitizeDrillForClient(drill: DrillDefinitionDTO): ClientDrillDefinitionDTO {
  return getDrillFormatDescriptor(drill.format).sanitizeForClient(drill);
}

export interface AttemptSubmissionDTO {
  drillId: string;
  stepId: string;
  selectedOptionId: string;
  confidence: ConfidenceAnchor;
  isCorrect: boolean;
  timeToCommitMs: number;
}

export type CauseVerdict = 'correct' | 'incorrect_distractor' | 'incorrect_miss';

export interface StepAttemptTelemetry {
  stepId: string;
  confidence: ConfidenceAnchor;
  isCorrect: boolean;
  score: number;
  selectedOptionId?: string;
  distractorAntipattern?: string;
  /** Case File / Troubleshooting: selected clarifying-question ids. */
  selectedProbeIds?: string[];
  probeScore?: number;
  recommendationScore?: number;
  missedPivotal?: boolean;
  /** Troubleshooting: free-text cause grading verdict. */
  causeVerdict?: CauseVerdict;
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
