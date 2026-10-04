import { RAPID_FIRE_REPS_PER_DRILL } from '../progress/streak.js';
import { ArcGymScoringEngine } from '../scoring/brier.js';
import type { RapidFireDrillDefinition, StepAttemptTelemetry } from '../types/drill.js';
import type {
  PracticeRepState,
  PracticeSessionAction,
  PracticeSessionState,
  RoundCompletionResult,
} from './types.js';

export function createPracticeSessionState(
  drills: RapidFireDrillDefinition[],
): PracticeSessionState {
  const reps: PracticeRepState[] = drills.map((drill, index) => ({
    drill,
    step: drill.steps[0] ?? {
      id: `step-${index}`,
      prompt: drill.title,
      options: [],
    },
    selectedOptionId: null,
    committedConfidence: null,
    isCorrect: null,
    score: null,
    quadrant: null,
    distractorAntipattern: undefined,
    isSubmitted: false,
  }));

  return {
    drills,
    reps,
    currentRepIndex: 0,
    isCompleted: false,
    totalScore: 0,
    accuracy: 0,
    attempts: [],
  };
}

export function practiceSessionReducer(
  state: PracticeSessionState,
  action: PracticeSessionAction,
): PracticeSessionState {
  switch (action.type) {
    case 'SELECT_OPTION': {
      if (state.isCompleted) return state;
      const currentRep = state.reps[state.currentRepIndex];
      if (!currentRep || currentRep.isSubmitted) return state;

      const updatedReps = state.reps.map((rep, idx) =>
        idx === state.currentRepIndex ? { ...rep, selectedOptionId: action.optionId } : rep,
      );

      return {
        ...state,
        reps: updatedReps,
      };
    }

    case 'COMMIT_CONFIDENCE': {
      if (state.isCompleted) return state;
      const currentRep = state.reps[state.currentRepIndex];
      if (!currentRep || currentRep.isSubmitted || !currentRep.selectedOptionId) {
        return state;
      }

      const chosenOption = currentRep.step.options.find(
        (o) => o.id === currentRep.selectedOptionId,
      );
      const isCorrect = Boolean(chosenOption?.isCorrect);

      const brierResult = ArcGymScoringEngine.calculateDecisionScore(action.confidence, isCorrect);

      const updatedReps: PracticeRepState[] = state.reps.map((rep, idx) => {
        if (idx !== state.currentRepIndex) return rep;
        return {
          ...rep,
          committedConfidence: action.confidence,
          isCorrect,
          score: brierResult.pointsAwarded,
          quadrant: brierResult.quadrant,
          distractorAntipattern: isCorrect ? undefined : chosenOption?.distractorAntipattern,
          isSubmitted: true,
        };
      });

      return {
        ...state,
        reps: updatedReps,
      };
    }

    case 'ADVANCE_REP': {
      if (state.isCompleted) return state;
      const currentRep = state.reps[state.currentRepIndex];
      if (!currentRep?.isSubmitted) return state;

      if (state.currentRepIndex + 1 < state.reps.length) {
        return {
          ...state,
          currentRepIndex: state.currentRepIndex + 1,
        };
      }

      // Final rep completed -> calculate round totals and attempts
      const now = new Date().toISOString();
      const totalScore = state.reps.reduce((acc, r) => acc + (r.score ?? 0), 0);
      const correctCount = state.reps.filter((r) => r.isCorrect).length;
      const accuracy = state.reps.length > 0 ? correctCount / state.reps.length : 0;

      const attempts = state.reps.map((rep) => ({
        drillId: rep.drill.id,
        format: 'Rapid_Fire' as const,
        completedAt: now,
        score: rep.score ?? 0,
        accuracy: rep.isCorrect ? 1 : 0,
        attemptsCount: 1,
        steps: [
          {
            stepId: rep.step.id,
            confidence: rep.committedConfidence ?? 0.5,
            isCorrect: Boolean(rep.isCorrect),
            score: rep.score ?? 0,
            selectedOptionId: rep.selectedOptionId ?? undefined,
            distractorAntipattern: rep.distractorAntipattern,
          },
        ],
      }));

      return {
        ...state,
        isCompleted: true,
        totalScore,
        accuracy,
        attempts,
      };
    }

    case 'RESET_SESSION': {
      return createPracticeSessionState(action.drills ?? state.drills);
    }

    default:
      return state;
  }
}

export function getCurrentRep(state: PracticeSessionState): PracticeRepState | null {
  return state.reps[state.currentRepIndex] ?? null;
}

export function getRoundCompletionResult(
  state: PracticeSessionState,
): RoundCompletionResult | null {
  if (!state.isCompleted) return null;

  const steps: StepAttemptTelemetry[] = state.reps.map((r) => ({
    stepId: r.step.id,
    confidence: r.committedConfidence ?? 0.5,
    isCorrect: Boolean(r.isCorrect),
    score: r.score ?? 0,
    selectedOptionId: r.selectedOptionId ?? undefined,
    distractorAntipattern: r.distractorAntipattern,
  }));

  return {
    attempts: state.attempts,
    totalScore: state.totalScore,
    accuracy: state.accuracy,
    repsCount: state.reps.length,
    isStreakEligible: state.reps.length >= RAPID_FIRE_REPS_PER_DRILL,
    steps,
  };
}
