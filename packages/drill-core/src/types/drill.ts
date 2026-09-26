export type ConfidenceAnchor = 0.50 | 0.70 | 0.85 | 0.95;

export type DrillFormat = 'Lesson' | 'Rapid_Fire' | 'Currency' | 'Scenario';

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

export interface DrillDefinitionDTO {
  id: string;
  title: string;
  format: DrillFormat;
  domain: string;
  difficulty: 'Associate_Domain_Architect' | 'Lead_CTA';
  pillars: WellArchitectedPillar[];
  steps: RapidFireStepDTO[];
  version: number;
}

export interface AttemptSubmissionDTO {
  drillId: string;
  stepId: string;
  selectedOptionId: string;
  confidence: ConfidenceAnchor;
  isCorrect: boolean;
  timeToCommitMs: number;
}
