import { getDrillFormatDescriptor } from '../formats/index.js';
import type { DrillDefinitionDTO } from '../types/drill.js';

export type WordingRuleId =
  | 'length-tell'
  | 'verdict-prefix'
  | 'antipattern-name'
  | 'label-echo'
  | 'self-refuting-distractor'
  | 'long-stem'
  | 'pivotal-leak'
  | 'probe-not-question'
  | 'cause-leak'
  | 'gold-too-long';

export interface WordingFinding {
  ruleId: WordingRuleId;
  where: string;
  message: string;
}

/** Answer tells and feedback defects that let a learner find the answer without architectural judgment. */
export function lintDrillWording(drill: DrillDefinitionDTO): WordingFinding[] {
  return getDrillFormatDescriptor(drill.format).lintWording(drill);
}
