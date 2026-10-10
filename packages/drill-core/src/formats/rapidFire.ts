import type { RapidFireDrillDefinition } from '../types/drill.js';
import { isValidContrastSetId } from '../types/validation.js';
import type { ValidationContext, ValidationFinding } from '../validator/types.js';
import type { DrillFormatDescriptor } from './types.js';
import { validateMcqOptions } from './validationHelpers.js';
import { lintQuestion, type Question } from './wordingHelpers.js';

export function isRapidFireDrillAuthored(drill: unknown): drill is RapidFireDrillDefinition {
  return (
    typeof drill === 'object' &&
    drill !== null &&
    'format' in drill &&
    (drill as { format: unknown }).format === 'Rapid_Fire'
  );
}

function validateContrastLinkage(
  drill: Record<string, unknown>,
  findings: ValidationFinding[],
): void {
  const hasSetId = drill.contrastSetId !== undefined;
  const hasPrinciple = drill.contrastPrinciple !== undefined;

  if (hasSetId) {
    if (!isValidContrastSetId(drill.contrastSetId)) {
      findings.push({
        ruleId: 'contrast-set',
        where: 'contrastSetId',
        message: 'contrastSetId must match CS-<slug> (lowercase letters, digits, hyphen segments)',
      });
    }
    if (
      typeof drill.contrastPrinciple !== 'string' ||
      drill.contrastPrinciple.trim().length === 0
    ) {
      findings.push({
        ruleId: 'contrast-set',
        where: 'contrastPrinciple',
        message: 'contrastPrinciple is required when contrastSetId is set',
      });
    }
  } else if (hasPrinciple) {
    findings.push({
      ruleId: 'contrast-set',
      where: 'contrastSetId',
      message: 'contrastSetId is required when contrastPrinciple is set',
    });
  }
}

export function validateRapidFire(
  drill: Record<string, unknown>,
  ctx: ValidationContext,
  findings: ValidationFinding[],
): void {
  validateContrastLinkage(drill, findings);

  if (!Array.isArray(drill.steps) || drill.steps.length === 0) {
    findings.push({
      ruleId: 'missing-field',
      where: 'steps',
      message: 'Rapid_Fire requires non-empty steps',
    });
    return;
  }

  for (const s of drill.steps) {
    if (!s || typeof s !== 'object') {
      findings.push({
        ruleId: 'missing-field',
        where: 'steps',
        message: 'step is invalid',
      });
      continue;
    }
    const step = s as Record<string, unknown>;
    const stepId = String(step.id ?? 'unknown');
    const whereStep = `step ${stepId}`;

    if (!step.prompt || typeof step.prompt !== 'string') {
      findings.push({
        ruleId: 'missing-field',
        where: `${whereStep} prompt`,
        message: `${whereStep} has invalid prompt`,
      });
    }

    validateMcqOptions(step.options, whereStep, ctx, findings);
  }
}

export function questionsOfRapidFire(drill: RapidFireDrillDefinition): Question[] {
  return drill.steps.map((step) => ({
    format: drill.format,
    where: `step ${step.id}`,
    stem: step.prompt,
    choices: step.options.map((o) => ({
      id: o.id,
      text: o.label,
      isCorrect: o.isCorrect,
      feedbackField: 'rationale' as const,
      feedback: o.rationale,
      antipattern: o.isCorrect ? undefined : (o.distractorAntipattern ?? ''),
    })),
  }));
}

export const rapidFireDescriptor: DrillFormatDescriptor<
  RapidFireDrillDefinition,
  RapidFireDrillDefinition
> = {
  format: 'Rapid_Fire',
  label: 'Rapid Fire',
  routePrefix: '/',
  countsForStreak: true,
  isDailyEligible: true,
  isAuthored: isRapidFireDrillAuthored,
  isClient: isRapidFireDrillAuthored,
  validate: validateRapidFire,
  lintWording: (drill) => questionsOfRapidFire(drill).flatMap(lintQuestion),
  getQuestionCount: (drill) => drill.steps?.length || 1,
  sanitizeForClient: (drill) => drill,
};
