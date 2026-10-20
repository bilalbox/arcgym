import { probeBudgetReducer } from '../probeBudget/index.js';
import { calculateCaseFileScore, calculateStationScore } from '../scoring/probe.js';
import type {
  CaseFileDrillDefinition,
  CaseFileStationDTO,
  ConfidenceAnchor,
  DrillAttemptRecord,
  FirstCallCapture,
  MetacognitiveQuadrant,
  StepAttemptTelemetry,
} from '../types/drill.js';

export type CasePhase = 'brief' | 'first_call' | 'probes' | 'commit' | 'feedback';

export type { FirstCallCapture };

export interface CaseStationState {
  station: CaseFileStationDTO;
  firstCall: FirstCallCapture | null;
  flippingProbeId: string | null;
  selectedProbeIds: string[];
  probesLocked: boolean;
  selectedOptionId: string | null;
  committedConfidence: ConfidenceAnchor | null;
  isCorrect: boolean | null;
  probeScore: number | null;
  recommendationScore: number | null;
  stationScore: number | null;
  quadrant: MetacognitiveQuadrant | null;
  missedAllPivotal: boolean | null;
  distractorAntipattern?: string;
  isSubmitted: boolean;
}

export interface CaseSessionState {
  drill: CaseFileDrillDefinition;
  phase: CasePhase;
  stations: CaseStationState[];
  currentStationIndex: number;
  isCompleted: boolean;
  totalScore: number;
  accuracy: number;
  discoveryFailure: boolean;
  attempt: DrillAttemptRecord | null;
}

export type CaseSessionAction =
  | { type: 'BEGIN_STATIONS' }
  | { type: 'SUBMIT_FIRST_CALL'; hypothesis: string; confidence?: ConfidenceAnchor }
  | { type: 'SKIP_FIRST_CALL' }
  | { type: 'TOGGLE_PROBE'; probeId: string }
  | { type: 'LOCK_PROBES' }
  | { type: 'SELECT_OPTION'; optionId: string }
  | { type: 'COMMIT_CONFIDENCE'; confidence: ConfidenceAnchor }
  | { type: 'ADVANCE_STATION' }
  | { type: 'RESET_SESSION' };

function createStationState(station: CaseFileStationDTO): CaseStationState {
  return {
    station,
    firstCall: null,
    flippingProbeId: null,
    selectedProbeIds: [],
    probesLocked: false,
    selectedOptionId: null,
    committedConfidence: null,
    isCorrect: null,
    probeScore: null,
    recommendationScore: null,
    stationScore: null,
    quadrant: null,
    missedAllPivotal: null,
    isSubmitted: false,
  };
}

export function createCaseSessionState(drill: CaseFileDrillDefinition): CaseSessionState {
  return {
    drill,
    phase: 'brief',
    stations: drill.stations.map(createStationState),
    currentStationIndex: 0,
    isCompleted: false,
    totalScore: 0,
    accuracy: 0,
    discoveryFailure: false,
    attempt: null,
  };
}

export function getCurrentCaseStation(state: CaseSessionState): CaseStationState | null {
  return state.stations[state.currentStationIndex] ?? null;
}

/**
 * Returns the gold recommendation labels of all completed prior stations in the Case File.
 * Carried forward as established facts for later stations.
 */
export function getEstablishedDecisions(state: CaseSessionState): string[] {
  const decisions: string[] = [];
  for (let i = 0; i < state.currentStationIndex; i++) {
    const st = state.stations[i];
    if (st) {
      const goldOption = st.station.options.find((o) => o.isCorrect);
      if (goldOption) {
        decisions.push(goldOption.label);
      }
    }
  }
  return decisions;
}

/**
 * Last selected pivotal probe, else last selected probe — discovery highlight after First Call.
 * Requires a non-skipped First Call with non-empty hypothesis text and at least one probe.
 * Does not compare free-text to the final recommendation option (no false “flip”).
 */
export function resolveFlippingProbeId(
  selectedProbeIds: string[],
  probes: CaseFileStationDTO['probes'],
  firstCall: FirstCallCapture | null,
): string | null {
  if (!firstCall || firstCall.skipped) return null;
  if (!firstCall.hypothesis?.trim()) return null;
  if (selectedProbeIds.length === 0) return null;

  for (let i = selectedProbeIds.length - 1; i >= 0; i--) {
    const probeId = selectedProbeIds[i];
    const probe = probes.find((p) => p.id === probeId);
    if (probe?.tier === 'pivotal') return probeId ?? null;
  }
  return selectedProbeIds[selectedProbeIds.length - 1] ?? null;
}

function synthesizeAttempt(state: CaseSessionState): {
  attempt: DrillAttemptRecord;
  totalScore: number;
  accuracy: number;
  discoveryFailure: boolean;
} {
  const submitted = state.stations.filter((s) => s.isSubmitted);
  const pack = calculateCaseFileScore(
    submitted.map((s) => ({
      stationScore: s.stationScore ?? 0,
      missedAllPivotal: s.missedAllPivotal ?? false,
    })),
  );

  const correctCount = submitted.filter((s) => s.isCorrect).length;
  const accuracy = submitted.length === 0 ? 0 : correctCount / submitted.length;

  const steps: StepAttemptTelemetry[] = submitted.map((s) => ({
    stepId: s.station.id,
    confidence: s.committedConfidence ?? 0.5,
    isCorrect: s.isCorrect ?? false,
    score: s.stationScore ?? 0,
    selectedOptionId: s.selectedOptionId ?? undefined,
    distractorAntipattern: s.distractorAntipattern,
    selectedProbeIds: s.selectedProbeIds,
    probeScore: s.probeScore ?? undefined,
    recommendationScore: s.recommendationScore ?? undefined,
    missedPivotal: s.missedAllPivotal ?? undefined,
    firstCall: s.firstCall
      ? {
          hypothesis: s.firstCall.hypothesis ?? undefined,
          confidence: s.firstCall.confidence ?? undefined,
          skipped: s.firstCall.skipped,
        }
      : undefined,
    flippingProbeId: s.flippingProbeId ?? undefined,
  }));

  return {
    attempt: {
      drillId: state.drill.id,
      format: 'Case_File',
      completedAt: new Date().toISOString(),
      score: pack.meanScore,
      accuracy,
      attemptsCount: submitted.length,
      steps,
    },
    totalScore: pack.meanScore,
    accuracy,
    discoveryFailure: pack.discoveryFailure,
  };
}

export function caseSessionReducer(
  state: CaseSessionState,
  action: CaseSessionAction,
): CaseSessionState {
  switch (action.type) {
    case 'RESET_SESSION':
      return createCaseSessionState(state.drill);

    case 'BEGIN_STATIONS':
      return { ...state, phase: 'first_call', currentStationIndex: 0 };

    case 'SUBMIT_FIRST_CALL': {
      if (state.phase !== 'first_call') return state;
      const idx = state.currentStationIndex;
      const current = state.stations[idx];
      if (!current) return state;

      const hypothesis = action.hypothesis.trim();
      if (!hypothesis) return state;

      const firstCall: FirstCallCapture = {
        hypothesis,
        confidence: action.confidence ?? null,
        skipped: false,
      };
      const stations = state.stations.map((s, i) => (i === idx ? { ...s, firstCall } : s));
      return { ...state, stations, phase: 'probes' };
    }

    case 'SKIP_FIRST_CALL': {
      if (state.phase !== 'first_call') return state;
      if (state.drill.difficulty !== 'Associate_Domain_Architect') return state;
      const idx = state.currentStationIndex;
      const firstCall: FirstCallCapture = {
        hypothesis: null,
        confidence: null,
        skipped: true,
      };
      const stations = state.stations.map((s, i) => (i === idx ? { ...s, firstCall } : s));
      return { ...state, stations, phase: 'probes' };
    }

    case 'TOGGLE_PROBE': {
      if (state.phase !== 'probes') return state;
      const idx = state.currentStationIndex;
      const current = state.stations[idx];
      if (!current) return state;

      const nextBudget = probeBudgetReducer(
        { selectedProbeIds: current.selectedProbeIds, probesLocked: current.probesLocked },
        action,
        { probes: current.station.probes, probeBudget: current.station.probeBudget },
      );
      if (nextBudget.selectedProbeIds === current.selectedProbeIds) return state;

      const stations = state.stations.map((s, i) =>
        i === idx ? { ...s, selectedProbeIds: nextBudget.selectedProbeIds } : s,
      );
      return { ...state, stations };
    }

    case 'LOCK_PROBES': {
      if (state.phase !== 'probes') return state;
      const idx = state.currentStationIndex;
      const current = state.stations[idx];
      if (!current) return state;

      const nextBudget = probeBudgetReducer(
        { selectedProbeIds: current.selectedProbeIds, probesLocked: current.probesLocked },
        action,
        { probes: current.station.probes, probeBudget: current.station.probeBudget },
      );
      if (!nextBudget.probesLocked) return state;

      const stations = state.stations.map((s, i) => (i === idx ? { ...s, probesLocked: true } : s));
      return { ...state, stations, phase: 'commit' };
    }

    case 'SELECT_OPTION': {
      if (state.phase !== 'commit') return state;
      const idx = state.currentStationIndex;
      const stations = state.stations.map((s, i) =>
        i === idx ? { ...s, selectedOptionId: action.optionId } : s,
      );
      return { ...state, stations };
    }

    case 'COMMIT_CONFIDENCE': {
      if (state.phase !== 'commit') return state;
      const idx = state.currentStationIndex;
      const current = state.stations[idx];
      if (!current?.selectedOptionId) return state;

      const option = current.station.options.find((o) => o.id === current.selectedOptionId);
      if (!option) return state;

      const scored = calculateStationScore({
        probes: current.station.probes,
        selectedProbeIds: current.selectedProbeIds,
        confidence: action.confidence,
        isCorrect: option.isCorrect,
      });

      const flippingProbeId = resolveFlippingProbeId(
        current.selectedProbeIds,
        current.station.probes,
        current.firstCall,
      );

      const stations = state.stations.map((s, i) =>
        i === idx
          ? {
              ...s,
              committedConfidence: action.confidence,
              isCorrect: option.isCorrect,
              probeScore: scored.probe.probeScore,
              recommendationScore: scored.recommendationScore,
              stationScore: scored.stationScore,
              quadrant: scored.quadrant,
              missedAllPivotal: scored.probe.missedAllPivotal,
              distractorAntipattern: option.isCorrect ? undefined : option.distractorAntipattern,
              flippingProbeId,
              isSubmitted: true,
            }
          : s,
      );

      return { ...state, stations, phase: 'feedback' };
    }

    case 'ADVANCE_STATION': {
      if (state.phase !== 'feedback') return state;
      const nextIndex = state.currentStationIndex + 1;
      if (nextIndex >= state.stations.length) {
        const synthesized = synthesizeAttempt({ ...state, isCompleted: true });
        return {
          ...state,
          isCompleted: true,
          totalScore: synthesized.totalScore,
          accuracy: synthesized.accuracy,
          discoveryFailure: synthesized.discoveryFailure,
          attempt: synthesized.attempt,
        };
      }
      return {
        ...state,
        currentStationIndex: nextIndex,
        phase: 'first_call',
      };
    }

    default:
      return state;
  }
}
