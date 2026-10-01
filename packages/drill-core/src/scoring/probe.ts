import type { ConfidenceAnchor, MetacognitiveQuadrant, ProbeOptionDTO } from '../types/drill.js';
import { ArcGymScoringEngine } from './brier.js';

export interface ProbeQualityResult {
  pivotalHit: number;
  pivotalTotal: number;
  usefulHit: number;
  distractorCount: number;
  /** Raw probe component before clamp, can be negative from waste. */
  rawProbeScore: number;
  /** Clamped to [0, 60] for station composition. */
  probeScore: number;
  missedAllPivotal: boolean;
}

export interface StationScoreResult {
  probe: ProbeQualityResult;
  recommendationScore: number;
  quadrant: MetacognitiveQuadrant;
  overconfidencePenaltyApplied: boolean;
  stationScore: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Scores clarifying-question selection against author-tagged probe tiers.
 * pivotalHit/pivotalTotal drive the main discovery signal; distractors penalize waste.
 */
export function calculateProbeQuality(
  probes: ProbeOptionDTO[],
  selectedProbeIds: string[],
): ProbeQualityResult {
  const selected = new Set(selectedProbeIds);
  const pivotal = probes.filter((p) => p.tier === 'pivotal');
  const useful = probes.filter((p) => p.tier === 'useful');
  const distractors = probes.filter((p) => p.tier === 'distractor');

  const pivotalHit = pivotal.filter((p) => selected.has(p.id)).length;
  const pivotalTotal = pivotal.length;
  const usefulHit = useful.filter((p) => selected.has(p.id)).length;
  const distractorCount = distractors.filter((p) => selected.has(p.id)).length;

  const pivotalRatio = pivotalTotal === 0 ? 0 : pivotalHit / pivotalTotal;
  const usefulBonus = Math.min(20, 10 * usefulHit);
  const rawProbeScore = 50 * pivotalRatio - 15 * distractorCount + usefulBonus;
  const probeScore = clamp(rawProbeScore, 0, 60);

  return {
    pivotalHit,
    pivotalTotal,
    usefulHit,
    distractorCount,
    rawProbeScore,
    probeScore,
    missedAllPivotal: pivotalTotal > 0 && pivotalHit === 0,
  };
}

/**
 * Dual station score: Probe Quality (0–60) + Brier recommendation points.
 */
export function calculateStationScore(params: {
  probes: ProbeOptionDTO[];
  selectedProbeIds: string[];
  confidence: ConfidenceAnchor;
  isCorrect: boolean;
}): StationScoreResult {
  const probe = calculateProbeQuality(params.probes, params.selectedProbeIds);
  const brier = ArcGymScoringEngine.calculateDecisionScore(params.confidence, params.isCorrect);
  return {
    probe,
    recommendationScore: brier.pointsAwarded,
    quadrant: brier.quadrant,
    overconfidencePenaltyApplied: brier.overconfidencePenaltyApplied,
    stationScore: probe.probeScore + brier.pointsAwarded,
  };
}

export interface CaseFileScoreResult {
  stationScores: number[];
  meanScore: number;
  discoveryFailure: boolean;
}

/** Mean of station scores; discoveryFailure if any station missed all pivotal probes. */
export function calculateCaseFileScore(
  stations: Array<{ probe: ProbeQualityResult; stationScore: number }>,
): CaseFileScoreResult {
  const stationScores = stations.map((s) => s.stationScore);
  const meanScore =
    stationScores.length === 0
      ? 0
      : Math.round(stationScores.reduce((a, b) => a + b, 0) / stationScores.length);
  const discoveryFailure = stations.some((s) => s.probe.missedAllPivotal);
  return { stationScores, meanScore, discoveryFailure };
}
