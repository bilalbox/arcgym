import { isEligibleCorrectOptionCitation } from '../types/citationManifest.js';
import {
  ARCHITECTURAL_DOMAINS,
  type ArchitecturalDomain,
  BOARD_DOMAINS,
  type BoardDomain,
  CASE_FILE_MIN_PROBES_PER_STATION,
  CASE_FILE_MIN_STATIONS,
  CASE_FILE_PIVOTAL_PROBES_PER_STATION,
  DRILL_DIFFICULTIES,
  DRILL_FORMATS,
  DRILL_STATUSES,
  type DrillDefinitionDTO,
  type DrillDifficulty,
  type DrillFormat,
  type DrillStatus,
  PROBE_TIERS,
  type ProbeTier,
  TROUBLESHOOTING_HIDDEN_DISTRACTOR_COUNT,
  TROUBLESHOOTING_MIN_PIVOTAL_PROBES,
  TROUBLESHOOTING_MIN_PROBES,
  TROUBLESHOOTING_PROBE_BUDGET,
  WELL_ARCHITECTED_PILLARS,
  type WellArchitectedPillar,
} from '../types/drill.js';
import {
  isAllowedCitationUrl,
  isValidDrillId,
  isValidFrictionCardId,
} from '../types/validation.js';

export type ValidationRuleId =
  | 'missing-field'
  | 'invalid-enum'
  | 'option-set'
  | 'missing-rationale'
  | 'missing-distractor-antipattern'
  | 'probe-pool'
  | 'station-set'
  | 'hidden-distractors'
  | 'citation-manifest'
  | 'missing-asset';

export interface ValidationFinding {
  ruleId: ValidationRuleId;
  where: string;
  message: string;
}

export interface ValidationContext {
  citationManifest?: ReadonlySet<string>;
  assetExists?: (url: string) => boolean;
}

export type ValidationResult =
  | { ok: true; drill: DrillDefinitionDTO }
  | { ok: false; findings: ValidationFinding[] };

export function isValidationFindingSurgicallyFixable(ruleId: ValidationRuleId): boolean {
  return ruleId !== 'citation-manifest' && ruleId !== 'missing-asset';
}

function isCitationValid(url: unknown, ctx: ValidationContext): boolean {
  if (ctx.citationManifest) {
    return isEligibleCorrectOptionCitation(url, ctx.citationManifest);
  }
  return isAllowedCitationUrl(url);
}

function validateDiagramUrl(
  diagramUrl: unknown,
  where: string,
  ctx: ValidationContext,
  findings: ValidationFinding[],
): void {
  if (diagramUrl === undefined) return;
  if (typeof diagramUrl !== 'string' || !diagramUrl.startsWith('/')) {
    findings.push({
      ruleId: 'missing-asset',
      where,
      message: `${where} diagramUrl must be an absolute path (e.g. /diagrams/...)`,
    });
    return;
  }
  if (ctx.assetExists && !ctx.assetExists(diagramUrl)) {
    findings.push({
      ruleId: 'missing-asset',
      where,
      message: `${where} diagramUrl references missing asset: ${diagramUrl}`,
    });
  }
}

function validateMcqOptions(
  options: unknown,
  wherePrefix: string,
  ctx: ValidationContext,
  findings: ValidationFinding[],
): void {
  if (!Array.isArray(options) || options.length < 2) {
    findings.push({
      ruleId: 'option-set',
      where: `${wherePrefix} options`,
      message: `${wherePrefix} requires at least 2 options`,
    });
    return;
  }

  const ids = options.map((o) =>
    o && typeof o === 'object' ? (o as { id?: unknown }).id : undefined,
  );
  if (new Set(ids).size !== ids.length) {
    findings.push({
      ruleId: 'option-set',
      where: `${wherePrefix} options`,
      message: `${wherePrefix} has duplicate option ids`,
    });
  }

  if (
    !options.some(
      (o) => o && typeof o === 'object' && (o as { isCorrect?: unknown }).isCorrect === true,
    )
  ) {
    findings.push({
      ruleId: 'option-set',
      where: `${wherePrefix} options`,
      message: `${wherePrefix} has NO correct option marked`,
    });
  }

  for (const opt of options) {
    if (!opt || typeof opt !== 'object') {
      findings.push({
        ruleId: 'missing-field',
        where: `${wherePrefix} options`,
        message: `${wherePrefix} contains invalid option`,
      });
      continue;
    }
    const option = opt as Record<string, unknown>;
    const optId = String(option.id ?? 'unknown');
    const whereOption = `${wherePrefix} option ${optId}`;

    if (!option.rationale || typeof option.rationale !== 'string') {
      findings.push({
        ruleId: 'missing-rationale',
        where: `${whereOption} rationale`,
        message: `option ${optId} is missing rationale`,
      });
    }

    if (
      !option.isCorrect &&
      (!option.distractorAntipattern || typeof option.distractorAntipattern !== 'string')
    ) {
      findings.push({
        ruleId: 'missing-distractor-antipattern',
        where: `${whereOption} distractorAntipattern`,
        message: `incorrect option ${optId} is missing distractorAntipattern`,
      });
    }

    if (option.isCorrect) {
      if (!isCitationValid(option.citationUrl, ctx)) {
        findings.push({
          ruleId: 'citation-manifest',
          where: `${whereOption} citationUrl`,
          message: `correct option ${optId} must cite an exact Citation Manifest URL (got ${option.citationUrl ?? 'none'})`,
        });
      }
    }

    if (option.diagramUrl !== undefined) {
      validateDiagramUrl(option.diagramUrl, `${whereOption} diagramUrl`, ctx, findings);
    }
  }
}

interface ProbePoolRules {
  wherePrefix: string;
  minProbes: number;
  expectedPivotal?: { exact?: number; min?: number };
  requireTiers?: { useful?: boolean; distractor?: boolean };
}

function validateProbePool(
  probes: unknown,
  probeBudget: unknown,
  rules: ProbePoolRules,
  findings: ValidationFinding[],
): void {
  const { wherePrefix, minProbes, expectedPivotal, requireTiers } = rules;
  const targetWhere = wherePrefix ? `${wherePrefix} probes` : 'probes';

  if (!Array.isArray(probes) || probes.length < minProbes) {
    findings.push({
      ruleId: 'probe-pool',
      where: targetWhere,
      message: `${wherePrefix ? `${wherePrefix} ` : ''}requires at least ${minProbes} probes`,
    });
    return;
  }

  const ids = probes.map((p) =>
    p && typeof p === 'object' ? (p as { id?: unknown }).id : undefined,
  );
  if (new Set(ids).size !== ids.length) {
    findings.push({
      ruleId: 'probe-pool',
      where: targetWhere,
      message: `${wherePrefix ? `${wherePrefix} ` : ''}has duplicate probe ids`,
    });
  }

  let pivotalCount = 0;
  let hasUseful = false;
  let hasDistractor = false;

  for (const p of probes) {
    if (!p || typeof p !== 'object') {
      findings.push({
        ruleId: 'missing-field',
        where: targetWhere,
        message: `${wherePrefix ? `${wherePrefix} ` : ''}contains invalid probe`,
      });
      continue;
    }
    const probe = p as Record<string, unknown>;
    const probeId = String(probe.id ?? 'unknown');
    const whereProbe = wherePrefix ? `${wherePrefix} probe ${probeId}` : `probe ${probeId}`;

    if (
      !probe.label ||
      !probe.answer ||
      typeof probe.label !== 'string' ||
      typeof probe.answer !== 'string'
    ) {
      findings.push({
        ruleId: 'missing-field',
        where: whereProbe,
        message: `${whereProbe} missing label or answer`,
      });
    }

    if (!PROBE_TIERS.includes(probe.tier as ProbeTier)) {
      findings.push({
        ruleId: 'invalid-enum',
        where: `${whereProbe} tier`,
        message: `${whereProbe} invalid tier: ${probe.tier}`,
      });
    } else {
      if (probe.tier === 'pivotal') pivotalCount++;
      if (probe.tier === 'useful') hasUseful = true;
      if (probe.tier === 'distractor') {
        hasDistractor = true;
        if (!probe.distractorAntipattern || typeof probe.distractorAntipattern !== 'string') {
          findings.push({
            ruleId: 'missing-distractor-antipattern',
            where: `${whereProbe} distractorAntipattern`,
            message: `${whereProbe} distractor probe missing distractorAntipattern`,
          });
        }
      }
    }
  }

  if (expectedPivotal?.exact !== undefined && pivotalCount !== expectedPivotal.exact) {
    findings.push({
      ruleId: 'probe-pool',
      where: targetWhere,
      message: `${wherePrefix ? `${wherePrefix} ` : ''}must have exactly ${expectedPivotal.exact} pivotal probes (got ${pivotalCount})`,
    });
  }

  if (expectedPivotal?.min !== undefined && pivotalCount < expectedPivotal.min) {
    findings.push({
      ruleId: 'probe-pool',
      where: targetWhere,
      message: `${wherePrefix ? `${wherePrefix} ` : ''}requires at least ${expectedPivotal.min} pivotal probes (got ${pivotalCount})`,
    });
  }

  if (requireTiers?.useful && !hasUseful) {
    findings.push({
      ruleId: 'probe-pool',
      where: targetWhere,
      message: `${wherePrefix ? `${wherePrefix} ` : ''}requires at least one useful probe`,
    });
  }

  if (requireTiers?.distractor && !hasDistractor) {
    findings.push({
      ruleId: 'probe-pool',
      where: targetWhere,
      message: `${wherePrefix ? `${wherePrefix} ` : ''}requires at least one distractor probe`,
    });
  }

  if (typeof probeBudget === 'number' && probeBudget > probes.length) {
    findings.push({
      ruleId: 'probe-pool',
      where: wherePrefix ? `${wherePrefix} probeBudget` : 'probeBudget',
      message: `${wherePrefix ? `${wherePrefix} ` : ''}probeBudget exceeds probe pool size`,
    });
  }
}

function validateRapidFire(
  drill: Record<string, unknown>,
  ctx: ValidationContext,
  findings: ValidationFinding[],
): void {
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

function validateCaseFile(
  drill: Record<string, unknown>,
  ctx: ValidationContext,
  findings: ValidationFinding[],
): void {
  const brief = drill.brief as Record<string, unknown> | undefined;
  if (!brief || typeof brief.title !== 'string' || !brief.title) {
    findings.push({
      ruleId: 'missing-field',
      where: 'brief.title',
      message: 'Case_File requires brief.title',
    });
  }
  if (!brief || typeof brief.synopsis !== 'string' || !brief.synopsis) {
    findings.push({
      ruleId: 'missing-field',
      where: 'brief.synopsis',
      message: 'Case_File requires brief.synopsis',
    });
  }
  if (brief?.exhibits) {
    if (!Array.isArray(brief.exhibits)) {
      findings.push({
        ruleId: 'missing-field',
        where: 'brief.exhibits',
        message: 'brief.exhibits must be an array',
      });
    } else {
      for (const [i, ex] of brief.exhibits.entries()) {
        const exhibit = ex as Record<string, unknown> | undefined;
        if (!exhibit?.label || !exhibit.diagramUrl) {
          findings.push({
            ruleId: 'missing-field',
            where: `brief.exhibits[${i}]`,
            message: `brief.exhibits[${i}] requires label and diagramUrl`,
          });
        } else {
          validateDiagramUrl(exhibit.diagramUrl, `brief.exhibits[${i}].diagramUrl`, ctx, findings);
        }
      }
    }
  }

  if (!Array.isArray(drill.stations) || drill.stations.length === 0) {
    findings.push({
      ruleId: 'missing-field',
      where: 'stations',
      message: 'Case_File requires non-empty stations',
    });
    return;
  }

  if (drill.stations.length < CASE_FILE_MIN_STATIONS) {
    findings.push({
      ruleId: 'station-set',
      where: 'stations',
      message: `Case_File requires at least ${CASE_FILE_MIN_STATIONS} stations; got ${drill.stations.length}`,
    });
  }

  const stationIds = drill.stations.map((s) =>
    s && typeof s === 'object' ? (s as { id?: unknown }).id : undefined,
  );
  if (new Set(stationIds).size !== stationIds.length) {
    findings.push({
      ruleId: 'station-set',
      where: 'stations',
      message: 'Case_File has duplicate station ids',
    });
  }

  for (const st of drill.stations) {
    if (!st || typeof st !== 'object') {
      findings.push({
        ruleId: 'missing-field',
        where: 'stations',
        message: 'station is invalid',
      });
      continue;
    }
    const station = st as Record<string, unknown>;
    const stationId = String(station.id ?? 'unknown');
    const whereStation = `station ${stationId}`;

    if (!station.prompt || typeof station.prompt !== 'string') {
      findings.push({
        ruleId: 'missing-field',
        where: `${whereStation} prompt`,
        message: `${whereStation} missing prompt`,
      });
    }

    if (!ARCHITECTURAL_DOMAINS.includes(station.domain as ArchitecturalDomain)) {
      findings.push({
        ruleId: 'invalid-enum',
        where: `${whereStation} domain`,
        message: `${whereStation} invalid domain: ${station.domain}`,
      });
    }

    if (!BOARD_DOMAINS.includes(station.boardDomain as BoardDomain)) {
      findings.push({
        ruleId: 'invalid-enum',
        where: `${whereStation} boardDomain`,
        message: `${whereStation} invalid boardDomain: ${station.boardDomain}`,
      });
    }

    if (typeof station.probeBudget !== 'number' || station.probeBudget < 1) {
      findings.push({
        ruleId: 'probe-pool',
        where: `${whereStation} probeBudget`,
        message: `${whereStation} probeBudget must be a positive number`,
      });
    }

    validateProbePool(
      station.probes,
      station.probeBudget,
      {
        wherePrefix: whereStation,
        minProbes: CASE_FILE_MIN_PROBES_PER_STATION,
        expectedPivotal: { exact: CASE_FILE_PIVOTAL_PROBES_PER_STATION },
      },
      findings,
    );

    validateMcqOptions(station.options, whereStation, ctx, findings);
  }
}

function validateTroubleshooting(
  drill: Record<string, unknown>,
  ctx: ValidationContext,
  findings: ValidationFinding[],
): void {
  const architecture = drill.architecture as Record<string, unknown> | undefined;
  if (!architecture || typeof architecture.synopsis !== 'string' || !architecture.synopsis) {
    findings.push({
      ruleId: 'missing-field',
      where: 'architecture.synopsis',
      message: 'Troubleshooting requires architecture.synopsis',
    });
  }
  if (!architecture?.diagramUrl) {
    findings.push({
      ruleId: 'missing-field',
      where: 'architecture.diagramUrl',
      message: 'Troubleshooting requires architecture.diagramUrl',
    });
  } else {
    validateDiagramUrl(architecture.diagramUrl, 'architecture.diagramUrl', ctx, findings);
  }

  if (typeof drill.issue !== 'string' || !drill.issue) {
    findings.push({
      ruleId: 'missing-field',
      where: 'issue',
      message: 'Troubleshooting requires issue',
    });
  }

  if (drill.probeBudget !== TROUBLESHOOTING_PROBE_BUDGET) {
    findings.push({
      ruleId: 'probe-pool',
      where: 'probeBudget',
      message: `Troubleshooting probeBudget must be ${TROUBLESHOOTING_PROBE_BUDGET}`,
    });
  }

  const goldCause = drill.goldCause as Record<string, unknown> | undefined;
  if (!goldCause || typeof goldCause.text !== 'string' || !goldCause.text) {
    findings.push({
      ruleId: 'missing-field',
      where: 'goldCause.text',
      message: 'Troubleshooting requires goldCause.text',
    });
  }
  if (!goldCause || typeof goldCause.rationale !== 'string' || !goldCause.rationale) {
    findings.push({
      ruleId: 'missing-field',
      where: 'goldCause.rationale',
      message: 'Troubleshooting requires goldCause.rationale',
    });
  }
  if (goldCause?.citationUrl !== undefined) {
    if (!isCitationValid(goldCause.citationUrl, ctx)) {
      findings.push({
        ruleId: 'citation-manifest',
        where: 'goldCause.citationUrl',
        message: `goldCause.citationUrl must be an exact Citation Manifest URL (got ${goldCause.citationUrl})`,
      });
    }
  }

  if (
    !Array.isArray(drill.hiddenDistractors) ||
    drill.hiddenDistractors.length !== TROUBLESHOOTING_HIDDEN_DISTRACTOR_COUNT
  ) {
    findings.push({
      ruleId: 'hidden-distractors',
      where: 'hiddenDistractors',
      message: `Troubleshooting requires exactly ${TROUBLESHOOTING_HIDDEN_DISTRACTOR_COUNT} hiddenDistractors`,
    });
  } else {
    const distractorIds = drill.hiddenDistractors.map((d) =>
      d && typeof d === 'object' ? (d as { id?: unknown }).id : undefined,
    );
    if (new Set(distractorIds).size !== distractorIds.length) {
      findings.push({
        ruleId: 'hidden-distractors',
        where: 'hiddenDistractors',
        message: 'duplicate hiddenDistractor ids',
      });
    }
    for (const d of drill.hiddenDistractors) {
      const distractor = d as Record<string, unknown> | undefined;
      const dId = String(distractor?.id ?? 'unknown');
      if (!distractor?.text || !distractor?.antipattern || !distractor?.rationale) {
        findings.push({
          ruleId: 'hidden-distractors',
          where: `hiddenDistractor ${dId}`,
          message: `hiddenDistractor ${dId} requires text, antipattern, and rationale`,
        });
      }
    }
  }

  validateProbePool(
    drill.probes,
    drill.probeBudget,
    {
      wherePrefix: '',
      minProbes: TROUBLESHOOTING_MIN_PROBES,
      expectedPivotal: { min: TROUBLESHOOTING_MIN_PIVOTAL_PROBES },
      requireTiers: { useful: true, distractor: true },
    },
    findings,
  );
}

const formatValidators: Record<
  DrillFormat,
  (drill: Record<string, unknown>, ctx: ValidationContext, findings: ValidationFinding[]) => void
> = {
  Rapid_Fire: validateRapidFire,
  Case_File: validateCaseFile,
  Troubleshooting: validateTroubleshooting,
};

export function validateDrill(raw: unknown, ctx: ValidationContext = {}): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      findings: [
        {
          ruleId: 'missing-field',
          where: '',
          message: 'Drill must be a non-null object',
        },
      ],
    };
  }

  const drill = raw as Record<string, unknown>;
  const topFindings: ValidationFinding[] = [];

  if (!drill.id || typeof drill.id !== 'string') {
    topFindings.push({
      ruleId: 'missing-field',
      where: 'id',
      message: 'missing required field id',
    });
  } else if (!isValidDrillId(drill.id)) {
    topFindings.push({
      ruleId: 'missing-field',
      where: 'id',
      message: `id must match AGD-ddddd (got ${drill.id})`,
    });
  }

  if (!drill.title || typeof drill.title !== 'string') {
    topFindings.push({
      ruleId: 'missing-field',
      where: 'title',
      message: 'missing required field title',
    });
  }

  if (!drill.domain || typeof drill.domain !== 'string') {
    topFindings.push({
      ruleId: 'missing-field',
      where: 'domain',
      message: 'missing required field domain',
    });
  } else if (!ARCHITECTURAL_DOMAINS.includes(drill.domain as ArchitecturalDomain)) {
    topFindings.push({
      ruleId: 'invalid-enum',
      where: 'domain',
      message: `invalid Architectural Domain: ${drill.domain}`,
    });
  }

  if (!drill.domainLabel || typeof drill.domainLabel !== 'string') {
    topFindings.push({
      ruleId: 'missing-field',
      where: 'domainLabel',
      message: 'missing required field domainLabel',
    });
  }

  if (!drill.pillars || !Array.isArray(drill.pillars) || drill.pillars.length === 0) {
    topFindings.push({
      ruleId: 'missing-field',
      where: 'pillars',
      message: 'pillars must not be empty',
    });
  } else {
    for (const pillar of drill.pillars) {
      if (!WELL_ARCHITECTED_PILLARS.includes(pillar as WellArchitectedPillar)) {
        topFindings.push({
          ruleId: 'invalid-enum',
          where: 'pillars',
          message: `invalid Well-Architected pillar: ${pillar}`,
        });
      }
    }
  }

  if (!drill.format || typeof drill.format !== 'string') {
    topFindings.push({
      ruleId: 'missing-field',
      where: 'format',
      message: 'missing required field format',
    });
  } else if (!DRILL_FORMATS.includes(drill.format as DrillFormat)) {
    topFindings.push({
      ruleId: 'invalid-enum',
      where: 'format',
      message: `invalid Drill Format: ${drill.format}`,
    });
  }

  if (!drill.status || typeof drill.status !== 'string') {
    topFindings.push({
      ruleId: 'missing-field',
      where: 'status',
      message: 'missing required field status',
    });
  } else if (!DRILL_STATUSES.includes(drill.status as DrillStatus)) {
    topFindings.push({
      ruleId: 'invalid-enum',
      where: 'status',
      message: `invalid status: ${drill.status} (expected draft|published)`,
    });
  }

  if (topFindings.length > 0) {
    return { ok: false, findings: topFindings };
  }

  const findings: ValidationFinding[] = [];

  if (!drill.difficulty || typeof drill.difficulty !== 'string') {
    findings.push({
      ruleId: 'missing-field',
      where: 'difficulty',
      message: 'missing required field difficulty',
    });
  } else if (!DRILL_DIFFICULTIES.includes(drill.difficulty as DrillDifficulty)) {
    findings.push({
      ruleId: 'invalid-enum',
      where: 'difficulty',
      message: `invalid difficulty: ${drill.difficulty}`,
    });
  }

  if (drill.sourceCardIds !== undefined) {
    if (!Array.isArray(drill.sourceCardIds) || !drill.sourceCardIds.every(isValidFrictionCardId)) {
      findings.push({
        ruleId: 'missing-field',
        where: 'sourceCardIds',
        message: 'sourceCardIds must be an array of Friction Card ids (FC-<discussion_id>)',
      });
    }
  }

  const format = drill.format as DrillFormat;
  const validator = formatValidators[format];
  if (validator) {
    validator(drill, ctx, findings);
  }

  if (findings.length > 0) {
    return { ok: false, findings };
  }

  return { ok: true, drill: drill as unknown as DrillDefinitionDTO };
}
