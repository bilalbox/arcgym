import { probeBudgetReducer } from '../probeBudget/index.js';
import { ArcGymScoringEngine } from '../scoring/brier.js';
import type { GradeCauseResult } from '../scoring/grader/types.js';
import { calculateProbeDecisionScore } from '../scoring/probe.js';
import type {
  ClientTroubleshootingDrillDefinition,
  ConfidenceAnchor,
  DrillAttemptRecord,
  MetacognitiveQuadrant,
  StepAttemptTelemetry,
  TroubleshootingDrillDefinition,
  TroubleshootingFixDefinition,
} from '../types/drill.js';

export type TroubleshootPhase =
  | 'brief'
  | 'first_call'
  | 'probes'
  | 'cause'
  | 'commit_cause'
  | 'cause_reveal'
  | 'fix'
  | 'commit_fix'
  | 'feedback';

export interface TroubleshootFirstCallCapture {
  hypothesis: string | null;
  confidence: ConfidenceAnchor | null;
  skipped: boolean;
}

export interface TroubleshootSessionState {
  drill: TroubleshootingDrillDefinition | ClientTroubleshootingDrillDefinition;
  phase: TroubleshootPhase;
  firstCall: TroubleshootFirstCallCapture | null;
  selectedProbeIds: string[];
  probesLocked: boolean;
  causeText: string;
  committedConfidence: ConfidenceAnchor | null;
  grade: GradeCauseResult | null;
  isCorrect: boolean | null;
  probeScore: number | null;
  causeScore: number | null;
  // Fix state
  fix: TroubleshootingFixDefinition | null;
  selectedFixOptionId: string | null;
  committedFixConfidence: ConfidenceAnchor | null;
  isFixCorrect: boolean | null;
  fixScore: number | null;
  fixQuadrant: MetacognitiveQuadrant | null;
  fixDistractorAntipattern?: string;
  // Total & telemetry
  totalScore: number;
  quadrant: MetacognitiveQuadrant | null;
  missedAllPivotal: boolean | null;
  distractorAntipattern?: string;
  isCompleted: boolean;
  attempt: DrillAttemptRecord | null;
}

export type TroubleshootSessionAction =
  | { type: 'RESET_SESSION' }
  | { type: 'BEGIN_DRILL' }
  | { type: 'SUBMIT_FIRST_CALL'; hypothesis: string; confidence?: ConfidenceAnchor }
  | { type: 'SKIP_FIRST_CALL' }
  | { type: 'TOGGLE_PROBE'; probeId: string }
  | { type: 'LOCK_PROBES' }
  | { type: 'SET_CAUSE_TEXT'; text: string }
  | { type: 'BEGIN_COMMIT_CAUSE' }
  | {
      type: 'RECEIVE_CAUSE_GRADE';
      confidence: ConfidenceAnchor;
      grade: GradeCauseResult;
      fix?: TroubleshootingFixDefinition;
    }
  | { type: 'PROCEED_TO_FIX' }
  | { type: 'SELECT_FIX_OPTION'; optionId: string }
  | { type: 'BEGIN_COMMIT_FIX' }
  | { type: 'COMMIT_FIX_CONFIDENCE'; confidence: ConfidenceAnchor }
  | { type: 'FINISH' };

export function createTroubleshootSessionState(
  drill: TroubleshootingDrillDefinition | ClientTroubleshootingDrillDefinition,
): TroubleshootSessionState {
  const initialFix = 'fix' in drill && drill.fix ? drill.fix : null;
  return {
    drill,
    phase: 'brief',
    firstCall: null,
    selectedProbeIds: [],
    probesLocked: false,
    causeText: '',
    committedConfidence: null,
    grade: null,
    isCorrect: null,
    probeScore: null,
    causeScore: null,
    fix: initialFix,
    selectedFixOptionId: null,
    committedFixConfidence: null,
    isFixCorrect: null,
    fixScore: null,
    fixQuadrant: null,
    fixDistractorAntipattern: undefined,
    totalScore: 0,
    quadrant: null,
    missedAllPivotal: null,
    isCompleted: false,
    attempt: null,
  };
}

function synthesizeAttempt(state: TroubleshootSessionState): DrillAttemptRecord {
  const causeCorrect = state.isCorrect ? 1 : 0;
  const fixCorrect = state.isFixCorrect ? 1 : 0;
  const accuracy = (causeCorrect + fixCorrect) / 2;

  const step: StepAttemptTelemetry = {
    stepId: 'incident',
    confidence: state.committedConfidence ?? 0.5,
    isCorrect: state.isCorrect ?? false,
    score: state.totalScore,
    distractorAntipattern: state.distractorAntipattern,
    selectedProbeIds: state.selectedProbeIds,
    probeScore: state.probeScore ?? undefined,
    recommendationScore: state.causeScore ?? undefined,
    missedPivotal: state.missedAllPivotal ?? undefined,
    causeVerdict: state.grade?.verdict,
    firstCall: state.firstCall
      ? {
          hypothesis: state.firstCall.hypothesis ?? undefined,
          confidence: state.firstCall.confidence ?? undefined,
          skipped: state.firstCall.skipped,
        }
      : undefined,
    fixScore: state.fixScore ?? undefined,
    fixConfidence: state.committedFixConfidence ?? undefined,
    selectedFixOptionId: state.selectedFixOptionId ?? undefined,
  };

  return {
    drillId: state.drill.id,
    format: 'Troubleshooting',
    completedAt: new Date().toISOString(),
    score: state.totalScore,
    accuracy,
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

    case 'BEGIN_DRILL':
      if (state.phase !== 'brief') return state;
      return { ...state, phase: 'first_call' };

    case 'SUBMIT_FIRST_CALL': {
      if (state.phase !== 'first_call') return state;
      const hypothesis = action.hypothesis.trim();
      if (!hypothesis) return state;
      return {
        ...state,
        firstCall: {
          hypothesis,
          confidence: action.confidence ?? null,
          skipped: false,
        },
        phase: 'probes',
      };
    }

    case 'SKIP_FIRST_CALL': {
      if (state.phase !== 'first_call') return state;
      if (state.drill.difficulty !== 'Associate_Domain_Architect') return state;
      return {
        ...state,
        firstCall: {
          hypothesis: null,
          confidence: null,
          skipped: true,
        },
        phase: 'probes',
      };
    }

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

    case 'BEGIN_COMMIT_CAUSE': {
      if (state.phase !== 'cause') return state;
      if (!state.causeText.trim()) return state;
      return { ...state, causeText: state.causeText.trim(), phase: 'commit_cause' };
    }

    case 'RECEIVE_CAUSE_GRADE': {
      if (state.phase !== 'commit_cause') return state;
      const grade = action.grade;
      const scored = calculateProbeDecisionScore({
        probes: state.drill.probes,
        selectedProbeIds: state.selectedProbeIds,
        confidence: action.confidence,
        isCorrect: grade.isCorrect,
      });

      const fix = action.fix ?? state.fix;

      return {
        ...state,
        phase: 'cause_reveal',
        committedConfidence: action.confidence,
        grade,
        isCorrect: grade.isCorrect,
        probeScore: scored.probe.probeScore,
        causeScore: scored.decisionScore,
        totalScore: scored.totalScore,
        quadrant: scored.quadrant,
        missedAllPivotal: scored.probe.missedAllPivotal,
        distractorAntipattern: grade.matchedDistractor?.antipattern,
        fix,
      };
    }

    case 'PROCEED_TO_FIX': {
      if (state.phase !== 'cause_reveal') return state;
      return { ...state, phase: 'fix' };
    }

    case 'SELECT_FIX_OPTION': {
      if (state.phase !== 'fix') return state;
      return { ...state, selectedFixOptionId: action.optionId };
    }

    case 'BEGIN_COMMIT_FIX': {
      if (state.phase !== 'fix') return state;
      if (!state.selectedFixOptionId) return state;
      return { ...state, phase: 'commit_fix' };
    }

    case 'COMMIT_FIX_CONFIDENCE': {
      if (state.phase !== 'commit_fix') return state;
      if (!state.selectedFixOptionId || !state.fix) return state;

      const chosenOption = state.fix.options.find((o) => o.id === state.selectedFixOptionId);
      const isFixCorrect = Boolean(chosenOption?.isCorrect);
      const fixBrier = ArcGymScoringEngine.calculateDecisionScore(action.confidence, isFixCorrect);

      const fixScore = fixBrier.pointsAwarded;
      const currentProbe = state.probeScore ?? 0;
      const currentCause = state.causeScore ?? 0;
      const totalScore = currentProbe + currentCause + fixScore;

      return {
        ...state,
        phase: 'feedback',
        committedFixConfidence: action.confidence,
        isFixCorrect,
        fixScore,
        fixQuadrant: fixBrier.quadrant,
        fixDistractorAntipattern: isFixCorrect ? undefined : chosenOption?.distractorAntipattern,
        totalScore,
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
