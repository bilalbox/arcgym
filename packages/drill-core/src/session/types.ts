import type {
  ConfidenceAnchor,
  DrillAttemptRecord,
  DrillDefinitionDTO,
  MetacognitiveQuadrant,
  RapidFireStepDTO,
  StepAttemptTelemetry,
} from '../types/drill.js';

export interface PracticeRepState {
  drill: DrillDefinitionDTO;
  step: RapidFireStepDTO;
  selectedOptionId: string | null;
  committedConfidence: ConfidenceAnchor | null;
  isCorrect: boolean | null;
  score: number | null;
  quadrant: MetacognitiveQuadrant | null;
  distractorAntipattern?: string;
  isSubmitted: boolean;
}

export interface PracticeSessionState {
  drills: DrillDefinitionDTO[];
  reps: PracticeRepState[];
  currentRepIndex: number;
  isCompleted: boolean;
  totalScore: number;
  accuracy: number;
  attempts: DrillAttemptRecord[];
}

export type PracticeSessionAction =
  | { type: 'SELECT_OPTION'; optionId: string }
  | { type: 'COMMIT_CONFIDENCE'; confidence: ConfidenceAnchor }
  | { type: 'ADVANCE_REP' }
  | { type: 'RESET_SESSION' };

export interface RoundCompletionResult {
  attempts: DrillAttemptRecord[];
  totalScore: number;
  accuracy: number;
  repsCount: number;
  isStreakEligible: boolean;
  steps: StepAttemptTelemetry[];
}
