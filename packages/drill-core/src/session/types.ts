import type {
  ConfidenceAnchor,
  DrillAttemptRecord,
  MetacognitiveQuadrant,
  RapidFireDrillDefinition,
  RapidFireStepDTO,
  StepAttemptTelemetry,
} from '../types/drill.js';

export interface PracticeRepState {
  drill: RapidFireDrillDefinition;
  step: RapidFireStepDTO;
  selectedOptionId: string | null;
  committedConfidence: ConfidenceAnchor | null;
  isCorrect: boolean | null;
  score: number | null;
  quadrant: MetacognitiveQuadrant | null;
  distractorAntipattern?: string;
  isSubmitted: boolean;
  /** Open Hypercorrection Intercept (wrong first commit at ≥85%). */
  hypercorrectionActive: boolean;
  /** First wrong option removed from the second-try set. */
  hypercorrectionExcludedOptionId?: string;
  /** Second-try option after intercept resolve; scoring stays on first commit. */
  retryOptionId?: string;
}

export interface PracticeSessionState {
  drills: RapidFireDrillDefinition[];
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
  | { type: 'RETRY_OPTION'; optionId: string }
  | { type: 'SKIP_HYPERCORRECTION' }
  | { type: 'ADVANCE_REP' }
  | { type: 'RESET_SESSION'; drills?: RapidFireDrillDefinition[] };

export interface RoundCompletionResult {
  attempts: DrillAttemptRecord[];
  totalScore: number;
  accuracy: number;
  repsCount: number;
  isStreakEligible: boolean;
  steps: StepAttemptTelemetry[];
}
