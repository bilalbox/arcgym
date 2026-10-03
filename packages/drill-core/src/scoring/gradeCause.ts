import type {
  CauseVerdict,
  HiddenDistractorDTO,
  TroubleshootingDrillDefinition,
} from '../types/drill.js';

/** Absolute thresholds + symmetric margin from the troubleshooting-ai prototype. */
export const DEFAULT_CAUSE_GRADING = {
  correctThreshold: 0.62,
  distractorThreshold: 0.55,
  goldMargin: 0.08,
} as const;

export type CauseScoreOverrides = Record<string, number>;

export interface GradedPassage {
  id: string;
  kind: 'gold' | 'distractor';
  text: string;
  rationale: string;
  antipattern?: string;
  score: number;
}

export interface GradeCauseResult {
  verdict: CauseVerdict;
  isCorrect: boolean;
  scores: GradedPassage[];
  goldScore: number;
  bestDistractorScore: number;
  matchedDistractor: (HiddenDistractorDTO & { score: number }) | null;
  goldRationale: string;
  goldCitationUrl?: string;
  thresholds: typeof DEFAULT_CAUSE_GRADING;
}

/**
 * Grade a free-text cause against gold + hidden distractors using an injected
 * BGE-reranker score map. Tests and the Worker scorer both supply overrides;
 * unit CI never calls Workers AI.
 */
export function gradeCause(
  drill: TroubleshootingDrillDefinition,
  _causeText: string,
  scoreOverrides?: CauseScoreOverrides | null,
): GradeCauseResult {
  if (!scoreOverrides || typeof scoreOverrides !== 'object') {
    throw new Error(
      'gradeCause requires scoreOverrides (inject BGE rerank scores; no live AI in tests)',
    );
  }

  const { correctThreshold, distractorThreshold, goldMargin } = DEFAULT_CAUSE_GRADING;

  const requireScore = (id: string): number => {
    const score = scoreOverrides[id];
    if (typeof score !== 'number' || Number.isNaN(score)) {
      throw new Error(`gradeCause scoreOverrides missing numeric score for "${id}"`);
    }
    return score;
  };

  const goldPassage: GradedPassage = {
    id: 'gold',
    kind: 'gold',
    text: drill.goldCause.text,
    rationale: drill.goldCause.rationale,
    score: requireScore('gold'),
  };

  const distractorPassages: GradedPassage[] = drill.hiddenDistractors.map((d) => ({
    id: d.id,
    kind: 'distractor' as const,
    text: d.text,
    rationale: d.rationale,
    antipattern: d.antipattern,
    score: requireScore(d.id),
  }));

  const scores = [goldPassage, ...distractorPassages].sort((a, b) => b.score - a.score);
  const bestDistractor = distractorPassages.reduce((a, b) => (b.score > a.score ? b : a));

  const beatsDistractor = goldPassage.score >= bestDistractor.score + goldMargin;
  const distractorBeatsGold = bestDistractor.score >= goldPassage.score + goldMargin;

  let verdict: CauseVerdict;
  let matchedDistractor: GradeCauseResult['matchedDistractor'] = null;

  if (goldPassage.score >= correctThreshold && beatsDistractor) {
    verdict = 'correct';
  } else if (bestDistractor.score >= distractorThreshold && distractorBeatsGold) {
    verdict = 'incorrect_distractor';
    const source = drill.hiddenDistractors.find((d) => d.id === bestDistractor.id);
    if (source) {
      matchedDistractor = { ...source, score: bestDistractor.score };
    }
  } else {
    verdict = 'incorrect_miss';
  }

  return {
    verdict,
    isCorrect: verdict === 'correct',
    scores,
    goldScore: goldPassage.score,
    bestDistractorScore: bestDistractor.score,
    matchedDistractor,
    goldRationale: drill.goldCause.rationale,
    goldCitationUrl: drill.goldCause.citationUrl,
    thresholds: DEFAULT_CAUSE_GRADING,
  };
}

/** Passage list for Workers AI `@cf/baai/bge-reranker-base`. */
export function causeGradePassages(
  drill: TroubleshootingDrillDefinition,
): Array<{ id: string; text: string }> {
  return [
    { id: 'gold', text: drill.goldCause.text },
    ...drill.hiddenDistractors.map((d) => ({ id: d.id, text: d.text })),
  ];
}

/**
 * Token Jaccard stand-in from the troubleshooting-ai prototype.
 * For local Vite preview only when the Pages AI grade route is unavailable —
 * never used as the production grader.
 */
export function stubCauseScoreOverrides(
  drill: TroubleshootingDrillDefinition,
  causeText: string,
): CauseScoreOverrides {
  const tok = (s: string) =>
    new Set(
      String(s)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );

  const scoreOne = (passage: string): number => {
    const a = tok(causeText);
    const b = tok(passage);
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter += 1;
    const union = a.size + b.size - inter;
    const coverage = inter / a.size;
    return Number((0.65 * (inter / union) + 0.35 * coverage).toFixed(4));
  };

  const overrides: CauseScoreOverrides = {
    gold: scoreOne(drill.goldCause.text),
  };
  for (const d of drill.hiddenDistractors) {
    overrides[d.id] = scoreOne(d.text);
  }
  return overrides;
}
