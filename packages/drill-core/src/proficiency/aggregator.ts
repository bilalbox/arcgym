import {
  ArchitecturalDomain,
  ARCHITECTURAL_DOMAINS,
  ARCHITECTURAL_DOMAIN_LABELS,
  DimensionProficiency,
  DrillAttemptRecord,
  DrillDefinitionDTO,
  isDiagramDrill,
  isLessonDrill,
  isRapidFireDrill,
  ProficiencyDimension,
  WellArchitectedPillar,
  WELL_ARCHITECTED_PILLARS,
  WELL_ARCHITECTED_PILLAR_LABELS,
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
export function getDrillQuestionCount(drill: DrillDefinitionDTO): number {
  if (isRapidFireDrill(drill)) {
    return drill.steps?.length || 1;
  }
  if (isLessonDrill(drill)) {
    return drill.stages?.length || 1;
  }
  if (isDiagramDrill(drill)) {
    // Hotspot commit + optional MCQ on the success path.
    return (drill.steps?.length || 1) * 2;
  }
  return 1;
}

/**
 * Aggregates client-side drill attempts into proficiency data for Architectural Domains or Well-Architected Pillars.
 */
export function calculateProficiencyReport(
  completedDrills: Record<string, DrillAttemptRecord>,
  allDrills: DrillDefinitionDTO[],
  dimension: ProficiencyDimension,
  minQuestionsThreshold = 4
): ProficiencyReportData {
  const drillMap = new Map<string, DrillDefinitionDTO>();
  for (const d of allDrills) {
    drillMap.set(d.id, d);
  }

  // Intermediate accumulator per key
  interface StatAcc {
    totalQuestions: number;
    correctQuestions: number;
    drillsCompleted: number;
  }

  const domainStats = new Map<ArchitecturalDomain, StatAcc>();
  for (const dom of ARCHITECTURAL_DOMAINS) {
    domainStats.set(dom, { totalQuestions: 0, correctQuestions: 0, drillsCompleted: 0 });
  }

  const pillarStats = new Map<WellArchitectedPillar, StatAcc>();
  for (const pil of WELL_ARCHITECTED_PILLARS) {
    pillarStats.set(pil, { totalQuestions: 0, correctQuestions: 0, drillsCompleted: 0 });
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

    // Accumulate for all associated Well-Architected pillars
    for (const pillar of drill.pillars || []) {
      const pStat = pillarStats.get(pillar);
      if (pStat) {
        pStat.totalQuestions += qCount;
        pStat.correctQuestions += cCount;
        pStat.drillsCompleted += 1;
      }
    }
  }

  let items: DimensionProficiency[] = [];

  if (dimension === 'domains') {
    items = ARCHITECTURAL_DOMAINS.map((domain) => {
      const stat = domainStats.get(domain)!;
      const accuracy =
        stat.totalQuestions > 0
          ? Math.round((stat.correctQuestions / stat.totalQuestions) * 100)
          : 0;
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
  } else {
    items = WELL_ARCHITECTED_PILLARS.map((pillar) => {
      const stat = pillarStats.get(pillar)!;
      const accuracy =
        stat.totalQuestions > 0
          ? Math.round((stat.correctQuestions / stat.totalQuestions) * 100)
          : 0;
      return {
        id: pillar,
        label: WELL_ARCHITECTED_PILLAR_LABELS[pillar],
        totalQuestions: stat.totalQuestions,
        correctQuestions: stat.correctQuestions,
        accuracy,
        isMeasured: stat.totalQuestions >= minQuestionsThreshold,
        drillsCompleted: stat.drillsCompleted,
      };
    });
  }

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
    dimension,
    items,
    whereToStart,
    strengths,
    collectingData,
    totalQuestionsAnswered,
    measuredCount: measured.length,
    totalCount: items.length,
  };
}
