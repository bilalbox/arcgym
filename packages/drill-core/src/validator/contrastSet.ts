import { RAPID_FIRE_REPS_PER_DRILL } from '../progress/streak.js';
import {
  type DrillDefinitionDTO,
  isRapidFireDrill,
  type RapidFireDrillDefinition,
} from '../types/drill.js';
import type { ValidationFinding } from './types.js';

/** Published Rapid Fire siblings required for a complete Contrast Set (matches round size). */
export const CONTRAST_SET_SIZE = RAPID_FIRE_REPS_PER_DRILL;

/**
 * Catalog-level Contrast Set linkage: every contrastSetId among published Rapid Fire
 * drills must have exactly three siblings sharing one principle.
 */
export function validateContrastSetCatalog(
  drills: readonly DrillDefinitionDTO[],
): ValidationFinding[] {
  const bySet = new Map<string, RapidFireDrillDefinition[]>();

  for (const drill of drills) {
    if (!isRapidFireDrill(drill) || drill.status !== 'published' || !drill.contrastSetId) {
      continue;
    }
    const siblings = bySet.get(drill.contrastSetId) ?? [];
    siblings.push(drill);
    bySet.set(drill.contrastSetId, siblings);
  }

  const findings: ValidationFinding[] = [];

  for (const [setId, siblings] of bySet) {
    if (siblings.length !== CONTRAST_SET_SIZE) {
      findings.push({
        ruleId: 'contrast-set',
        where: `contrastSetId ${setId}`,
        message: `Contrast Set ${setId} must have exactly ${CONTRAST_SET_SIZE} published Rapid Fire siblings (found ${siblings.length}: ${siblings.map((d) => d.id).join(', ')})`,
      });
      continue;
    }

    const principles = new Set(
      siblings.map((d) => (d.contrastPrinciple ?? '').trim()).filter(Boolean),
    );
    if (principles.size !== 1) {
      findings.push({
        ruleId: 'contrast-set',
        where: `contrastSetId ${setId}`,
        message: `Contrast Set ${setId} siblings must share one contrastPrinciple`,
      });
    }
  }

  return findings;
}
