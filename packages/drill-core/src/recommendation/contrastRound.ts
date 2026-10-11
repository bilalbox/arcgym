import { RAPID_FIRE_REPS_PER_DRILL } from '../progress/streak.js';
import { isRapidFireDrill, type RapidFireDrillDefinition } from '../types/drill.js';

/**
 * When a round is exactly one complete Contrast Set, returns the shared principle line.
 * Otherwise undefined (independent reps — no principle chrome).
 */
export function contrastPrincipleForRound(
  drills: readonly RapidFireDrillDefinition[],
): string | undefined {
  if (drills.length !== RAPID_FIRE_REPS_PER_DRILL) return undefined;
  if (!drills.every(isRapidFireDrill)) return undefined;

  const setId = drills[0]?.contrastSetId;
  const principle = drills[0]?.contrastPrinciple?.trim();
  if (!setId || !principle) return undefined;

  const isCompleteSet = drills.every(
    (d) => d.contrastSetId === setId && (d.contrastPrinciple ?? '').trim() === principle,
  );
  return isCompleteSet ? principle : undefined;
}
