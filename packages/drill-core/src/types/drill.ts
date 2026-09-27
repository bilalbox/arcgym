export type ConfidenceAnchor = 0.5 | 0.7 | 0.85 | 0.95;

export type DrillFormat = 'Lesson' | 'Rapid_Fire' | 'Currency' | 'Scenario';

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

export interface CurrencyCategoryDTO {
  id: string;
  label: string;
  description?: string;
  defaultPoints: number;
  maxPoints: number;
  step?: number;
}

export type BudgetRuleOp = 'lte' | 'gte';

export interface BudgetOptimalRuleDTO {
  categoryId: string;
  op: BudgetRuleOp;
  value: number;
}

export interface ScenarioOptionDTO {
  id: string;
  text: string;
  trustDelta: number;
  reliabilityDelta: number;
  techDebtImpact: string;
  isOptimal: boolean;
}

export interface ScenarioMoveDTO {
  moveNumber: number;
  stakeholderPersona: string;
  dialogueText: string;
  options: ScenarioOptionDTO[];
}

export interface LessonOptionDTO {
  id: string;
  text: string;
  isCorrect: boolean;
  coachingFeedback: string;
}

export interface LessonStageDTO {
  stageNumber: number;
  stageName: string;
  scenario: string;
  options: LessonOptionDTO[];
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
}

export interface RapidFireDrillDefinition extends DrillDefinitionBase {
  format: 'Rapid_Fire';
  steps: RapidFireStepDTO[];
}

export interface CurrencyDrillDefinition extends DrillDefinitionBase {
  format: 'Currency';
  prompt: string;
  detail?: string;
  totalPoints: number;
  categories: CurrencyCategoryDTO[];
  optimalRules: BudgetOptimalRuleDTO[];
  analysis?: string;
  citationUrl?: string;
}

export interface ScenarioDrillDefinition extends DrillDefinitionBase {
  format: 'Scenario';
  initialTrust: number;
  initialReliability: number;
  moves: ScenarioMoveDTO[];
}

export interface LessonDrillDefinition extends DrillDefinitionBase {
  format: 'Lesson';
  stages: LessonStageDTO[];
}

export type DrillDefinitionDTO =
  | RapidFireDrillDefinition
  | CurrencyDrillDefinition
  | ScenarioDrillDefinition
  | LessonDrillDefinition;

export function isRapidFireDrill(d: DrillDefinitionDTO): d is RapidFireDrillDefinition {
  return d.format === 'Rapid_Fire';
}

export function isCurrencyDrill(d: DrillDefinitionDTO): d is CurrencyDrillDefinition {
  return d.format === 'Currency';
}

export function isScenarioDrill(d: DrillDefinitionDTO): d is ScenarioDrillDefinition {
  return d.format === 'Scenario';
}

export function isLessonDrill(d: DrillDefinitionDTO): d is LessonDrillDefinition {
  return d.format === 'Lesson';
}

export interface AttemptSubmissionDTO {
  drillId: string;
  stepId: string;
  selectedOptionId: string;
  confidence: ConfidenceAnchor;
  isCorrect: boolean;
  timeToCommitMs: number;
}

export interface DrillAttemptRecord {
  drillId: string;
  format: DrillFormat;
  completedAt: string; // ISO 8601 string
  score: number;
  accuracy: number; // 0 to 1
  attemptsCount: number;
}

export interface VisitorProgressState {
  version: 1;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  completedDrills: Record<string, DrillAttemptRecord>;
}
