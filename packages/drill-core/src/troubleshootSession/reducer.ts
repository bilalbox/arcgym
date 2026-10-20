import { probeBudgetReducer } from '../probeBudget/index.js';
import { ArcGymScoringEngine } from '../scoring/brier.js';
import type { FirstCallGradeSummary, GradeCauseResult } from '../scoring/grader/types.js';
import { calculateProbeDecisionScore } from '../scoring/probe.js';
import type {
  ClientTroubleshootingDrillDefinition,
  ConfidenceAnchor,
  DrillAttemptRecord,
  FirstCallCapture,
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
  | 'feedback';

/** @deprecated Prefer FirstCallCapture from types/drill. */
export type TroubleshootFirstCallCapture = FirstCallCapture;

export interface TroubleshootSessionState {
  drill: TroubleshootingDrillDefinition | ClientTroubleshootingDrillDefinition;
  phase: TroubleshootPhase;
  firstCall: FirstCallCapture | null;
  selectedProbeIds: string[];
  probesLocked: boolean;
  causeText: string;
  committedConfidence: ConfidenceAnchor | null;
  grade: GradeCauseResult | null;
  firstCallGrade: FirstCallGradeSummary | null;
  isCorrect: boolean | null;
  probeScore: number | null;
  causeScore: number | null;
  fix: TroubleshootingFixDefinition | null;
  selectedFixOptionId: string | null;
  committedFixConfidence: ConfidenceAnchor | null;
  isFixCorrect: boolean | null;
  fixScore: number | null;
  fixQuadrant: MetacognitiveQuadrant | null;
  fixDistractorAntipattern?: string;
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
      fix: TroubleshootingFixDefinition;
      firstCallGrade?: FirstCallGradeSummary;
    }
  | { type: 'PROCEED_TO_FIX' }
  | { type: 'SELECT_FIX_OPTION'; optionId: string }
  | { type: 'COMMIT_FIX'; optionId: string; confidence: ConfidenceAnchor }
  | { type: 'FINISH' };

export function createTroubleshootSessionState(
  drill: TroubleshootingDrillDefinition | ClientTroubleshootingDrillDefinition,
): TroubleshootSessionState {
  return {
    drill,
    phase: 'brief',
    firstCall: null,
    selectedProbeIds: [],
    probesLocked: false,
    causeText: '',
    committedConfidence: null,
    grade: null,
    firstCallGrade: null,
    isCorrect: null,
    probeScore: null,
    causeScore: null,
    fix: null,
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

  const causeStep: StepAttemptTelemetry = {
    stepId: 'cause',
    confidence: state.committedConfidence ?? 0.5,
    isCorrect: state.isCorrect ?? false,
    score: (state.probeScore ?? 0) + (state.causeScore ?? 0),
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
    firstCallVerdict: state.firstCallGrade?.verdict,
  };

  const fixStep: StepAttemptTelemetry = {
    stepId: 'fix',
    confidence: state.committedFixConfidence ?? 0.5,
    isCorrect: state.isFixCorrect ?? false,
    score: state.fixScore ?? 0,
    fixScore: state.fixScore ?? undefined,
    fixConfidence: state.committedFixConfidence ?? undefined,
    selectedFixOptionId: state.selectedFixOptionId ?? undefined,
    distractorAntipattern: state.fixDistractorAntipattern,
  };

  return {
    drillId: state.drill.id,
    format: 'Troubleshooting',
    completedAt: new Date().toISOString(),
    score: state.totalScore,
    accuracy,
    attemptsCount: 1,
    steps: [causeStep, fixStep],
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

      return {
        ...state,
        phase: 'cause_reveal',
        committedConfidence: action.confidence,
        grade,
        firstCallGrade: action.firstCallGrade ?? null,
        isCorrect: grade.isCorrect,
        probeScore: scored.probe.probeScore,
        causeScore: scored.decisionScore,
        totalScore: scored.totalScore,
        quadrant: scored.quadrant,
        missedAllPivotal: scored.probe.missedAllPivotal,
        distractorAntipattern: grade.matchedDistractor?.antipattern,
        fix: action.fix,
      };
    }

    case 'PROCEED_TO_FIX': {
      if (state.phase !== 'cause_reveal') return state;
      if (!state.fix) return state;
      return { ...state, phase: 'fix' };
    }

    case 'SELECT_FIX_OPTION': {
      if (state.phase !== 'fix') return state;
      return { ...state, selectedFixOptionId: action.optionId };
    }

    case 'COMMIT_FIX': {
      if (state.phase !== 'fix') return state;
      if (!state.fix) return state;

      const chosenOption = state.fix.options.find((o) => o.id === action.optionId);
      if (!chosenOption) return state;

      const isFixCorrect = Boolean(chosenOption.isCorrect);
      const fixBrier = ArcGymScoringEngine.calculateDecisionScore(action.confidence, isFixCorrect);
      const fixScore = fixBrier.pointsAwarded;
      const currentProbe = state.probeScore ?? 0;
      const currentCause = state.causeScore ?? 0;
      const totalScore = currentProbe + currentCause + fixScore;

      return {
        ...state,
        phase: 'feedback',
        selectedFixOptionId: action.optionId,
        committedFixConfidence: action.confidence,
        isFixCorrect,
        fixScore,
        fixQuadrant: fixBrier.quadrant,
        fixDistractorAntipattern: isFixCorrect ? undefined : chosenOption.distractorAntipattern,
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
