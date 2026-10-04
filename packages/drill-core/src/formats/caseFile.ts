import type { WordingFinding } from '../lint/types.js';
import {
  ARCHITECTURAL_DOMAINS,
  type ArchitecturalDomain,
  BOARD_DOMAINS,
  type BoardDomain,
  CASE_FILE_MIN_PROBES_PER_STATION,
  CASE_FILE_MIN_STATIONS,
  CASE_FILE_PIVOTAL_PROBES_PER_STATION,
  type CaseFileDrillDefinition,
} from '../types/drill.js';
import type { ValidationContext, ValidationFinding } from '../validator/types.js';
import type { DrillFormatDescriptor } from './types.js';
import { validateDiagramUrl, validateMcqOptions, validateProbePool } from './validationHelpers.js';
import {
  lintQuestion,
  MAX_BRIEF_WORDS,
  QUESTION_MARK,
  type Question,
  wordCount,
} from './wordingHelpers.js';

export function isCaseFileDrillAuthored(drill: unknown): drill is CaseFileDrillDefinition {
  return (
    typeof drill === 'object' &&
    drill !== null &&
    'format' in drill &&
    (drill as { format: unknown }).format === 'Case_File'
  );
}

export function validateCaseFile(
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

export function questionsOfCaseFile(drill: CaseFileDrillDefinition): Question[] {
  return drill.stations.map((station) => ({
    format: drill.format,
    where: `station ${station.id}`,
    stem: station.prompt,
    choices: station.options.map((o) => ({
      id: o.id,
      text: o.label,
      isCorrect: o.isCorrect,
      feedbackField: 'rationale' as const,
      feedback: o.rationale,
      antipattern: o.isCorrect ? undefined : (o.distractorAntipattern ?? ''),
    })),
  }));
}

export function lintCaseFileExtras(drill: CaseFileDrillDefinition): WordingFinding[] {
  const findings: WordingFinding[] = [];
  const briefWords = wordCount(drill.brief.synopsis);
  if (briefWords > MAX_BRIEF_WORDS) {
    findings.push({
      ruleId: 'long-stem',
      where: 'brief.synopsis',
      message: `brief synopsis has ${briefWords} words (max ${MAX_BRIEF_WORDS}); keep Evaluation-scale, not a full Review Board packet`,
    });
  }

  const synopsisLower = drill.brief.synopsis.toLowerCase();
  for (const station of drill.stations) {
    for (const probe of station.probes) {
      if (!QUESTION_MARK.test(probe.label)) {
        findings.push({
          ruleId: 'probe-not-question',
          where: `station ${station.id} probe ${probe.id}`,
          message: 'probe label must be a clarifying question ending with ?',
        });
      }
      if (probe.tier === 'pivotal') {
        const answer = probe.answer.trim();
        if (answer.length >= 8 && synopsisLower.includes(answer.toLowerCase())) {
          findings.push({
            ruleId: 'pivotal-leak',
            where: `station ${station.id} probe ${probe.id}`,
            message:
              'pivotal probe answer appears in brief.synopsis; leave critical facts behind the Probe Budget',
          });
        }
      }
      if (probe.tier === 'distractor' && probe.distractorAntipattern) {
        const words = wordCount(probe.distractorAntipattern);
        if (words < 2 || words > 5 || /[.!?]/.test(probe.distractorAntipattern)) {
          findings.push({
            ruleId: 'antipattern-name',
            where: `station ${station.id} probe ${probe.id}`,
            message: `distractorAntipattern "${probe.distractorAntipattern}" must be a 2–5 word name, not a sentence`,
          });
        }
      }
    }
  }

  return findings;
}

export const caseFileDescriptor: DrillFormatDescriptor<
  CaseFileDrillDefinition,
  CaseFileDrillDefinition
> = {
  format: 'Case_File',
  label: 'Case File',
  routePrefix: '/cases',
  countsForStreak: false,
  isDailyEligible: false,
  isAuthored: isCaseFileDrillAuthored,
  isClient: isCaseFileDrillAuthored,
  validate: validateCaseFile,
  lintWording: (drill) => [
    ...questionsOfCaseFile(drill).flatMap(lintQuestion),
    ...lintCaseFileExtras(drill),
  ],
  getQuestionCount: (drill) => drill.stations?.length || 1,
  sanitizeForClient: (drill) => drill,
};
