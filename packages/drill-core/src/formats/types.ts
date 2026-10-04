import type { WordingFinding } from '../lint/types.js';
import type { ClientDrillDefinitionDTO, DrillDefinitionDTO, DrillFormat } from '../types/drill.js';
import type { ValidationContext, ValidationFinding } from '../validator/types.js';

export interface DrillFormatDescriptor<
  TAuthored extends DrillDefinitionDTO = DrillDefinitionDTO,
  TClient extends ClientDrillDefinitionDTO = ClientDrillDefinitionDTO,
> {
  format: DrillFormat;
  label: string;
  routePrefix: string;
  countsForStreak: boolean;
  isDailyEligible: boolean;
  isAuthored(drill: unknown): drill is TAuthored;
  isClient(drill: unknown): drill is TClient;
  validate(
    drill: Record<string, unknown>,
    ctx: ValidationContext,
    findings: ValidationFinding[],
  ): void;
  lintWording(drill: TAuthored): WordingFinding[];
  getQuestionCount(drill: TAuthored | TClient): number;
  sanitizeForClient(drill: TAuthored): TClient;
}
