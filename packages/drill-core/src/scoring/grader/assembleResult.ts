import type {
  CauseVerdict,
  HiddenDistractorDTO,
  TroubleshootingDrillDefinition,
} from '../../types/drill.js';
import { CAUSE_OTHER_ID, DEFAULT_OTHER_CRITERION } from '../gradeCause.js';
import type { GradeCauseResult, GradedPassage } from './types.js';

export function assembleGradeCauseResult(
  drill: TroubleshootingDrillDefinition,
  scoresMap: Record<string, number>,
  chosenIdOverride?: string | null,
): GradeCauseResult {
  const getScore = (id: string): number => {
    const s = scoresMap[id];
    return typeof s === 'number' && !Number.isNaN(s) ? s : 0;
  };

  const goldPassage: GradedPassage = {
    id: 'gold',
    kind: 'gold',
    text: drill.goldCause.text,
    rationale: drill.goldCause.rationale,
    score: getScore('gold'),
  };

  const distractorPassages: GradedPassage[] = drill.hiddenDistractors.map((d) => ({
    id: d.id,
    kind: 'distractor' as const,
    text: d.text,
    rationale: d.rationale,
    antipattern: d.antipattern,
    score: getScore(d.id),
  }));

  const otherPassage: GradedPassage = {
    id: CAUSE_OTHER_ID,
    kind: 'other',
    text: DEFAULT_OTHER_CRITERION,
    rationale: 'Learner cause did not match the gold diagnosis or a known antipattern distractor.',
    score: getScore(CAUSE_OTHER_ID),
  };

  const allPassages = [goldPassage, ...distractorPassages, otherPassage];
  const scores = [...allPassages].sort((a, b) => b.score - a.score);

  const match = chosenIdOverride ? allPassages.find((p) => p.id === chosenIdOverride) : undefined;
  const chosen = match ?? scores[0] ?? otherPassage;

  const bestDistractor = distractorPassages.reduce(
    (a, b) => (b.score > a.score ? b : a),
    distractorPassages[0],
  );

  let verdict: CauseVerdict;
  let matchedDistractor: (HiddenDistractorDTO & { score: number }) | null = null;

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
    bestDistractorScore: bestDistractor ? bestDistractor.score : 0,
    otherScore: otherPassage.score,
    matchedDistractor,
    goldText: drill.goldCause.text,
    goldRationale: drill.goldCause.rationale,
    goldCitationUrl: drill.goldCause.citationUrl,
    fix: drill.fix,
  };
}
