import { ArcGymScoringEngine } from '../scoring/brier.js';
import {
  type CauseScoreOverrides,
  type GradeCauseResult,
  gradeCause,
} from '../scoring/gradeCause.js';
import { calculateProbeQuality } from '../scoring/probe.js';
import type {
  ConfidenceAnchor,
  DrillAttemptRecord,
  MetacognitiveQuadrant,
  StepAttemptTelemetry,
  TroubleshootingDrillDefinition,
} from '../types/drill.js';

export type TroubleshootPhase = 'brief' | 'probes' | 'cause' | 'commit' | 'feedback';

export interface TroubleshootSessionState {
  drill: TroubleshootingDrillDefinition;
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
      scoreOverrides: CauseScoreOverrides;
    }
  | { type: 'FINISH' };

export function createTroubleshootSessionState(
  drill: TroubleshootingDrillDefinition,
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
      if (state.phase !== 'probes' || state.probesLocked) return state;
      if (!state.drill.probes.some((p) => p.id === action.probeId)) return state;

      const already = state.selectedProbeIds.includes(action.probeId);
      let nextIds: string[];
      if (already) {
        nextIds = state.selectedProbeIds.filter((id) => id !== action.probeId);
      } else {
        if (state.selectedProbeIds.length >= state.drill.probeBudget) return state;
        nextIds = [...state.selectedProbeIds, action.probeId];
      }
      return { ...state, selectedProbeIds: nextIds };
    }

    case 'LOCK_PROBES': {
      if (state.phase !== 'probes' || state.probesLocked) return state;
      if (state.selectedProbeIds.length === 0) return state;
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

      const grade = gradeCause(state.drill, text, action.scoreOverrides);
      const probe = calculateProbeQuality(state.drill.probes, state.selectedProbeIds);
      const brier = ArcGymScoringEngine.calculateDecisionScore(action.confidence, grade.isCorrect);
      const totalScore = probe.probeScore + brier.pointsAwarded;

      return {
        ...state,
        phase: 'feedback',
        committedConfidence: action.confidence,
        grade,
        isCorrect: grade.isCorrect,
        probeScore: probe.probeScore,
        causeScore: brier.pointsAwarded,
        totalScore,
        quadrant: brier.quadrant,
        missedAllPivotal: probe.missedAllPivotal,
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
