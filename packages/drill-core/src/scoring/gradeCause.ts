import type {
  CauseVerdict,
  HiddenDistractorDTO,
  TroubleshootingDrillDefinition,
} from '../types/drill.js';

/** Catchall CLEF choice id for vague / unmatched wrong causes. */
export const CAUSE_OTHER_ID = 'other';

/** Authored CLEF criterion text for the something-else bucket. */
export const DEFAULT_OTHER_CRITERION =
  'Something else — a vague, mixed, or unrelated root cause that does not match any authored diagnosis.';

/** CLEF model used for production Troubleshoot cause grading. */
export const CAUSE_GRADE_MODEL = '@cf/cloudflare/clef';

export type CauseScoreOverrides = Record<string, number>;

export interface GradedPassage {
  id: string;
  kind: 'gold' | 'distractor' | 'other';
  text: string;
  rationale: string;
  antipattern?: string;
  score: number;
}

export interface GradeCauseResult {
  verdict: CauseVerdict;
  isCorrect: boolean;
  /** CLEF choice id with the highest probability (`gold`, a distractor id, or `other`). */
  chosenId: string;
  scores: GradedPassage[];
  goldScore: number;
  bestDistractorScore: number;
  otherScore: number;
  matchedDistractor: (HiddenDistractorDTO & { score: number }) | null;
  goldRationale: string;
  goldCitationUrl?: string;
}

/**
 * Grade a free-text cause from an injected CLEF choice probability map
 * (`gold`, each hidden distractor id, and `other`). Unit CI never calls Workers AI.
 *
 * Policy: argmax among those options.
 * - gold → correct
 * - distractor id → incorrect_distractor (attach authored antipattern)
 * - other → incorrect_miss
 */
export function gradeCause(
  drill: TroubleshootingDrillDefinition,
  _causeText: string,
  scoreOverrides?: CauseScoreOverrides | null,
): GradeCauseResult {
  if (!scoreOverrides || typeof scoreOverrides !== 'object') {
    throw new Error(
      'gradeCause requires scoreOverrides (inject CLEF choice probabilities; no live AI in tests)',
    );
  }

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

  const otherPassage: GradedPassage = {
    id: CAUSE_OTHER_ID,
    kind: 'other',
    text: DEFAULT_OTHER_CRITERION,
    rationale: 'Learner cause did not match the gold diagnosis or a known antipattern distractor.',
    score: requireScore(CAUSE_OTHER_ID),
  };

  const scores = [goldPassage, ...distractorPassages, otherPassage].sort(
    (a, b) => b.score - a.score,
  );
  const chosen = scores[0] ?? otherPassage;
  const bestDistractor = distractorPassages.reduce((a, b) => (b.score > a.score ? b : a));

  let verdict: CauseVerdict;
  let matchedDistractor: GradeCauseResult['matchedDistractor'] = null;

  if (chosen.id === 'gold') {
    verdict = 'correct';
  } else if (chosen.kind === 'distractor') {
    verdict = 'incorrect_distractor';
    const source = drill.hiddenDistractors.find((d) => d.id === chosen.id);
    if (source) {
      matchedDistractor = { ...source, score: chosen.score };
    }
  } else {
    verdict = 'incorrect_miss';
  }

  return {
    verdict,
    isCorrect: verdict === 'correct',
    chosenId: chosen.id,
    scores,
    goldScore: goldPassage.score,
    bestDistractorScore: bestDistractor.score,
    otherScore: otherPassage.score,
    matchedDistractor,
    goldRationale: drill.goldCause.rationale,
    goldCitationUrl: drill.goldCause.citationUrl,
  };
}

/** CLEF choice criteria: gold + hidden distractors + something-else catchall. */
export function causeGradeCriteria(drill: TroubleshootingDrillDefinition): Record<string, string> {
  const criteria: Record<string, string> = {
    gold: drill.goldCause.text,
  };
  for (const d of drill.hiddenDistractors) {
    criteria[d.id] = d.text;
  }
  criteria[CAUSE_OTHER_ID] = DEFAULT_OTHER_CRITERION;
  return criteria;
}

/**
 * Token Jaccard stand-in for local Vite preview when the Pages CLEF grade route
 * is unavailable — never used as the production grader.
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
  // Mild prior so vague answers land on other instead of a weak distractor paraphrase.
  overrides[CAUSE_OTHER_ID] = Math.max(0.15, scoreOne(DEFAULT_OTHER_CRITERION));
  return overrides;
}
