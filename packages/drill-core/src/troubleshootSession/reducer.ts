import { probeBudgetReducer } from '../probeBudget/index.js';
import type { GradeCauseResult } from '../scoring/grader/types.js';
import { calculateProbeDecisionScore } from '../scoring/probe.js';
import type {
  ClientTroubleshootingDrillDefinition,
  ConfidenceAnchor,
  DrillAttemptRecord,
  MetacognitiveQuadrant,
  StepAttemptTelemetry,
  TroubleshootingDrillDefinition,
} from '../types/drill.js';

export type TroubleshootPhase = 'brief' | 'probes' | 'cause' | 'commit' | 'feedback';

export interface TroubleshootSessionState {
  drill: TroubleshootingDrillDefinition | ClientTroubleshootingDrillDefinition;
  phase: TroubleshootPhase;
  selectedProbeIds: string[];
  probesLocked: boolean;
  causeText: string;
  committedConfidence: ConfidenceAnchor | null;
  grade: GradeCauseResult | null;
  isCorrect: boolean | null;
  probeScore: number | null;
  causeScore: number | null;
  totalScore: number;
  quadrant: MetacognitiveQuadrant | null;
  missedAllPivotal: boolean | null;
  distractorAntipattern?: string;
  isCompleted: boolean;
  attempt: DrillAttemptRecord | null;
}

export type TroubleshootSessionAction =
  | { type: 'RESET_SESSION' }
  | { type: 'BEGIN_PROBES' }
  | { type: 'TOGGLE_PROBE'; probeId: string }
  | { type: 'LOCK_PROBES' }
  | { type: 'SET_CAUSE_TEXT'; text: string }
  | { type: 'BEGIN_COMMIT' }
  | {
      type: 'COMMIT_CONFIDENCE';
      confidence: ConfidenceAnchor;
      grade: GradeCauseResult;
    }
  | { type: 'FINISH' };

export function createTroubleshootSessionState(
  drill: TroubleshootingDrillDefinition | ClientTroubleshootingDrillDefinition,
): TroubleshootSessionState {
  return {
    drill,
    phase: 'brief',
    selectedProbeIds: [],
    probesLocked: false,
    causeText: '',
    committedConfidence: null,
    grade: null,
    isCorrect: null,
    probeScore: null,
    causeScore: null,
    totalScore: 0,
    quadrant: null,
    missedAllPivotal: null,
    isCompleted: false,
    attempt: null,
  };
}

function synthesizeAttempt(state: TroubleshootSessionState): DrillAttemptRecord {
  const step: StepAttemptTelemetry = {
    stepId: 'cause',
    confidence: state.committedConfidence ?? 0.5,
    isCorrect: state.isCorrect ?? false,
    score: state.totalScore,
    distractorAntipattern: state.distractorAntipattern,
    selectedProbeIds: state.selectedProbeIds,
    probeScore: state.probeScore ?? undefined,
    recommendationScore: state.causeScore ?? undefined,
    missedPivotal: state.missedAllPivotal ?? undefined,
    causeVerdict: state.grade?.verdict,
  };

  return {
    drillId: state.drill.id,
    format: 'Troubleshooting',
    completedAt: new Date().toISOString(),
    score: state.totalScore,
    accuracy: state.isCorrect ? 1 : 0,
    attemptsCount: 1,
    steps: [step],
  };
}

export function troubleshootSessionReducer(
  state: TroubleshootSessionState,
  action: TroubleshootSessionAction,
): TroubleshootSessionState {
  switch (action.type) {
    case 'RESET_SESSION':
      return createTroubleshootSessionState(state.drill);

    case 'BEGIN_PROBES':
      if (state.phase !== 'brief') return state;
      return { ...state, phase: 'probes' };

    case 'TOGGLE_PROBE': {
      if (state.phase !== 'probes') return state;
      const nextBudget = probeBudgetReducer(
        { selectedProbeIds: state.selectedProbeIds, probesLocked: state.probesLocked },
        action,
        { probes: state.drill.probes, probeBudget: state.drill.probeBudget },
      );
      if (nextBudget.selectedProbeIds === state.selectedProbeIds) return state;
      return { ...state, selectedProbeIds: nextBudget.selectedProbeIds };
    }

    case 'LOCK_PROBES': {
      if (state.phase !== 'probes') return state;
      const nextBudget = probeBudgetReducer(
        { selectedProbeIds: state.selectedProbeIds, probesLocked: state.probesLocked },
        action,
        { probes: state.drill.probes, probeBudget: state.drill.probeBudget },
      );
      if (!nextBudget.probesLocked) return state;
      return { ...state, probesLocked: true, phase: 'cause' };
    }

    case 'SET_CAUSE_TEXT': {
      if (state.phase !== 'cause') return state;
      return { ...state, causeText: action.text };
    }

    case 'BEGIN_COMMIT': {
      if (state.phase !== 'cause') return state;
      if (!state.causeText.trim()) return state;
      return { ...state, causeText: state.causeText.trim(), phase: 'commit' };
    }

    case 'COMMIT_CONFIDENCE': {
      if (state.phase !== 'commit') return state;
      const text = state.causeText.trim();
      if (!text) return state;

      const grade = action.grade;
      const scored = calculateProbeDecisionScore({
        probes: state.drill.probes,
        selectedProbeIds: state.selectedProbeIds,
        confidence: action.confidence,
        isCorrect: grade.isCorrect,
      });

      return {
        ...state,
        phase: 'feedback',
        committedConfidence: action.confidence,
        grade,
        isCorrect: grade.isCorrect,
        probeScore: scored.probe.probeScore,
        causeScore: scored.decisionScore,
        totalScore: scored.totalScore,
        quadrant: scored.quadrant,
        missedAllPivotal: scored.probe.missedAllPivotal,
        distractorAntipattern: grade.matchedDistractor?.antipattern,
      };
    }

    case 'FINISH': {
      if (state.phase !== 'feedback' || state.isCompleted) return state;
      return {
        ...state,
        isCompleted: true,
        attempt: synthesizeAttempt(state),
      };
    }

    default:
      return state;
  }
}
