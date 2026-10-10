import type { DrillOptionDTO } from '../types/drill.js';
import type { PracticeRepState } from './types.js';

export interface DistractorAutopsyChip {
  optionId: string;
  distractorAntipattern?: string;
  rationale: string;
}

export interface DistractorAutopsyPrompt {
  /** Antipattern Distractor the autopsy asks about (prefer learner's pick). */
  focusOptionId: string;
  focusAntipattern?: string;
  chips: DistractorAutopsyChip[];
}

/**
 * Build unscored Distractor Autopsy chips from wrong-option rationales.
 * Prefers the learner-picked distractor as the focus when it is a wrong option.
 */
export function buildDistractorAutopsy(
  options: readonly DrillOptionDTO[],
  preferredDistractorOptionId: string | null | undefined,
): DistractorAutopsyPrompt | null {
  const wrongWithRationale = options.filter((o) => !o.isCorrect && o.rationale.trim().length > 0);
  if (wrongWithRationale.length === 0) return null;

  const preferred = preferredDistractorOptionId
    ? wrongWithRationale.find((o) => o.id === preferredDistractorOptionId)
    : undefined;
  const focus = preferred ?? wrongWithRationale[0];

  return {
    focusOptionId: focus.id,
    focusAntipattern: focus.distractorAntipattern,
    chips: wrongWithRationale.map((o) => ({
      optionId: o.id,
      distractorAntipattern: o.distractorAntipattern,
      rationale: o.rationale,
    })),
  };
}

/** Autopsy only after reveal on an incorrect first commit with chip material. */
export function isAutopsyApplicable(rep: PracticeRepState): boolean {
  if (!(rep.isSubmitted && !rep.hypercorrectionActive) || rep.isCorrect !== false) {
    return false;
  }
  return buildDistractorAutopsy(rep.step.options, rep.selectedOptionId) !== null;
}

export function isAutopsyPending(rep: PracticeRepState): boolean {
  return isAutopsyApplicable(rep) && !rep.autopsySelectedOptionId;
}
