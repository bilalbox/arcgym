import { getDrillFormatDescriptor } from '../formats/index.js';
import {
  ARCHITECTURAL_DOMAIN_LABELS,
  ARCHITECTURAL_DOMAINS,
  type ArchitecturalDomain,
  type ClientDrillDefinitionDTO,
  type DimensionProficiency,
  type DrillAttemptRecord,
  type DrillDefinitionDTO,
  type ProficiencyDimension,
} from '../types/drill.js';

export interface ProficiencyReportData {
  dimension: ProficiencyDimension;
  items: DimensionProficiency[];
  whereToStart: DimensionProficiency[];
  strengths: DimensionProficiency[];
  collectingData: DimensionProficiency[];
  totalQuestionsAnswered: number;
  measuredCount: number;
  totalCount: number;
}

/**
 * Derives the total decision reps / question steps for a given drill definition.
 */
export function getDrillQuestionCount(
  drill: DrillDefinitionDTO | ClientDrillDefinitionDTO,
): number {
  return getDrillFormatDescriptor(drill.format).getQuestionCount(drill);
}

/**
 * Counts Case File stations where First Call differed from the final recommendation
 * (probe-driven revisions). Skipped First Calls do not count.
 */
export function countProbeDrivenRevisions(
  completedDrills: Record<string, DrillAttemptRecord>,
): number {
  let count = 0;
  for (const attempt of Object.values(completedDrills)) {
    for (const step of attempt.steps ?? []) {
      const first = step.firstCall;
      if (!first || first.skipped || !first.optionId || !step.selectedOptionId) continue;
      if (first.optionId !== step.selectedOptionId) count += 1;
    }
  }
  return count;
}

/**
 * Aggregates client-side drill attempts into proficiency data for the 7 Architectural Domains.
 */
export function calculateProficiencyReport(
  completedDrills: Record<string, DrillAttemptRecord>,
  allDrills: Array<DrillDefinitionDTO | ClientDrillDefinitionDTO>,
  minQuestionsThresholdOrDimension: number | ProficiencyDimension = 4,
  optionalThreshold = 4,
): ProficiencyReportData {
  const minQuestionsThreshold =
    typeof minQuestionsThresholdOrDimension === 'number'
      ? minQuestionsThresholdOrDimension
      : optionalThreshold;

  const drillMap = new Map<string, DrillDefinitionDTO | ClientDrillDefinitionDTO>();
  for (const d of allDrills) {
    drillMap.set(d.id, d);
  }

  // Intermediate accumulator per domain key
  interface StatAcc {
    totalQuestions: number;
    correctQuestions: number;
    drillsCompleted: number;
  }

  const domainStats = new Map<ArchitecturalDomain, StatAcc>();
  for (const dom of ARCHITECTURAL_DOMAINS) {
    domainStats.set(dom, { totalQuestions: 0, correctQuestions: 0, drillsCompleted: 0 });
  }

  let totalQuestionsAnswered = 0;

  for (const attempt of Object.values(completedDrills)) {
    const drill = drillMap.get(attempt.drillId);
    if (!drill) continue;

    let qCount = 0;
    let cCount = 0;

    if (attempt.steps && attempt.steps.length > 0) {
      qCount = attempt.steps.length;
      cCount = attempt.steps.filter((s) => s.isCorrect).length;
    } else {
      qCount = getDrillQuestionCount(drill);
      cCount = Math.round((attempt.accuracy ?? 1) * qCount);
    }

    totalQuestionsAnswered += qCount;

    // Accumulate for primary domain
    const dStat = domainStats.get(drill.domain);
    if (dStat) {
      dStat.totalQuestions += qCount;
      dStat.correctQuestions += cCount;
      dStat.drillsCompleted += 1;
    }
  }

  const items: DimensionProficiency[] = ARCHITECTURAL_DOMAINS.map((domain) => {
    const stat = domainStats.get(domain) ?? {
      totalQuestions: 0,
      correctQuestions: 0,
      drillsCompleted: 0,
    };
    const accuracy =
      stat.totalQuestions > 0 ? Math.round((stat.correctQuestions / stat.totalQuestions) * 100) : 0;
    return {
      id: domain,
      label: ARCHITECTURAL_DOMAIN_LABELS[domain],
      totalQuestions: stat.totalQuestions,
      correctQuestions: stat.correctQuestions,
      accuracy,
      isMeasured: stat.totalQuestions >= minQuestionsThreshold,
      drillsCompleted: stat.drillsCompleted,
    };
  });

  const measured = items.filter((item) => item.isMeasured);
  const collectingData = items
    .filter((item) => !item.isMeasured)
    .sort((a, b) => b.totalQuestions - a.totalQuestions);

  // Where to start: measured items with accuracy < 80%, sorted lowest first
  const whereToStart = measured
    .filter((item) => item.accuracy < 80)
    .sort((a, b) => a.accuracy - b.accuracy || a.totalQuestions - b.totalQuestions);

  // Your strengths: measured items with accuracy >= 80%, sorted highest first
  const strengths = measured
    .filter((item) => item.accuracy >= 80)
    .sort((a, b) => b.accuracy - a.accuracy || b.totalQuestions - a.totalQuestions);

  return {
    dimension: 'domains',
    items,
    whereToStart,
    strengths,
    collectingData,
    totalQuestionsAnswered,
    measuredCount: measured.length,
    totalCount: items.length,
  };
}
