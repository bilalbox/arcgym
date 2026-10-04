import { getDrillFormatDescriptor } from '../formats/index.js';
import type { DrillDefinitionDTO } from '../types/drill.js';

import type { WordingFinding, WordingRuleId } from './types.js';

export type { WordingFinding, WordingRuleId };

/** Answer tells and feedback defects that let a learner find the answer without architectural judgment. */
export function lintDrillWording(drill: DrillDefinitionDTO): WordingFinding[] {
  return getDrillFormatDescriptor(drill.format).lintWording(drill);
}
