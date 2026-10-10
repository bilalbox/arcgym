import { getDrillFormatDescriptor } from '../formats/index.js';
import { RAPID_FIRE_REPS_PER_DRILL } from '../progress/streak.js';
import {
  type ArchitecturalDomain,
  type CaseFileDrillDefinition,
  type ClientDrillDefinitionDTO,
  type ClientTroubleshootingDrillDefinition,
  type DrillAttemptRecord,
  type DrillDefinitionDTO,
  isCaseFileDrill,
  isRapidFireDrill,
  isTroubleshootingDrill,
  type RapidFireDrillDefinition,
} from '../types/drill.js';

export { contrastPrincipleForRound } from './contrastRound.js';

export type RecommendationReason = 'daily' | 'next_uncompleted' | 'review';

export interface RecommendedRound {
  drills: DrillDefinitionDTO[];
  reason: RecommendationReason;
  isDaily: boolean;
  uncompletedCount: number;
  totalCount: number;
  completionPercentage: number;
  /** Present when the round is one complete Contrast Set of three siblings. */
  contrastSetId?: string;
  /** Principle line for a contrast round; shown once after the third rep. */
  contrastPrinciple?: string;
}

/** Backward compatibility alias */
export type RapidFireSetRecommendation = RecommendedRound;

export type DailyWorkoutFormat = 'Rapid_Fire' | 'Case_File' | 'Troubleshooting';

export interface DailyWorkoutAssignment {
  format: DailyWorkoutFormat;
  title: string;
  description: string;
  estimatedMinutes: number;
  isCompletedToday: boolean;
  rapidFireRound?: RecommendedRound;
  caseFile?: CaseFileDrillDefinition;
  incident?: ClientTroubleshootingDrillDefinition;
  drillId?: string;
}

/**
 * Hashes an arbitrary string into a stable positive 32-bit integer.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Hashes a date string (e.g. "2026-09-27") into a stable positive 32-bit integer.
 */
export function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns the index of today's featured drill deterministically based on date.
 */
export function getDailyDrillIndex(dateStr: string, totalDrills: number): number {
  if (totalDrills <= 0) return 0;
  return hashDateString(dateStr) % totalDrills;
}

/**
 * Selects a set of drills (default 3) for a multi-rep workout round.
 * Guarantees exactly setCount reps. Prioritizes today's uncompleted featured drill,
 * followed by next uncompleted drills, and fills with review drills (or cycling) as needed.
 */
export function selectRecommendedRound(params: {
  drills: DrillDefinitionDTO[];
  completedDrills: Record<string, DrillAttemptRecord>;
  todayDateStr: string;
  domain?: ArchitecturalDomain;
  sessionSkipCount?: number;
  setCount?: number;
}): RecommendedRound | null {
  const {
    drills,
    completedDrills,
    todayDateStr,
    domain,
    sessionSkipCount = 0,
    setCount = RAPID_FIRE_REPS_PER_DRILL,
  } = params;

  // Daily streak filters by isDailyEligible format descriptor.
  const candidateDrills = drills.filter((d) => {
    if (!getDrillFormatDescriptor(d.format).isDailyEligible) return false;
    if (domain && d.domain !== domain) return false;
    return true;
  });

  if (candidateDrills.length === 0) {
    return null;
  }

  const totalCount = candidateDrills.length;
  const uncompleted = candidateDrills.filter((d) => !completedDrills[d.id]);
  const uncompletedCount = uncompleted.length;
  const completionPercentage = Math.round(((totalCount - uncompletedCount) / totalCount) * 100);

  const dailyIndex = getDailyDrillIndex(todayDateStr, totalCount);
  const todayDrill = candidateDrills[dailyIndex];
  const isTodayCompleted = Boolean(completedDrills[todayDrill.id]);

  const sortedUncompleted = [...uncompleted].sort((a, b) => {
    const idxA = candidateDrills.findIndex((d) => d.id === a.id);
    const idxB = candidateDrills.findIndex((d) => d.id === b.id);
    const distA = (idxA - dailyIndex + totalCount) % totalCount;
    const distB = (idxB - dailyIndex + totalCount) % totalCount;
    return distA - distB;
  });

  const sortedReview = [...candidateDrills]
    .filter((d) => Boolean(completedDrills[d.id]))
    .sort((a, b) => {
      const recA = completedDrills[a.id];
      const recB = completedDrills[b.id];
      if (!recA || !recB) return 0;
      const timeA = new Date(recA.completedAt).getTime();
      const timeB = new Date(recB.completedAt).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (recA.score || 0) - (recB.score || 0);
    });

  let reason: RecommendationReason = 'daily';
  if (isTodayCompleted || sessionSkipCount > 0) {
    reason = uncompletedCount > 0 ? 'next_uncompleted' : 'review';
  }

  const contrastRound = pickContrastSetRound({
    candidateDrills,
    completedDrills,
    todayDateStr,
    sessionSkipCount,
    setCount,
  });

  if (contrastRound) {
    const isDaily = contrastRound.drills.some((d) => d.id === todayDrill.id);
    return {
      drills: contrastRound.drills,
      reason,
      isDaily,
      uncompletedCount,
      totalCount,
      completionPercentage,
      contrastSetId: contrastRound.contrastSetId,
      contrastPrinciple: contrastRound.contrastPrinciple,
    };
  }

  const selectedDrills: DrillDefinitionDTO[] = [];
  const selectedIds = new Set<string>();

  if (uncompletedCount > 0) {
    const startIdx = (sessionSkipCount * setCount) % sortedUncompleted.length;
    for (let i = 0; i < sortedUncompleted.length && selectedDrills.length < setCount; i++) {
      const drill = sortedUncompleted[(startIdx + i) % sortedUncompleted.length];
      if (!selectedIds.has(drill.id)) {
        selectedDrills.push(drill);
        selectedIds.add(drill.id);
      }
    }
  }

  if (selectedDrills.length < setCount && sortedReview.length > 0) {
    const reviewStartIdx = (sessionSkipCount * setCount) % sortedReview.length;
    for (let i = 0; i < sortedReview.length && selectedDrills.length < setCount; i++) {
      const drill = sortedReview[(reviewStartIdx + i) % sortedReview.length];
      if (!selectedIds.has(drill.id)) {
        selectedDrills.push(drill);
        selectedIds.add(drill.id);
      }
    }
  }

  if (selectedDrills.length < setCount) {
    const baseList = sortedUncompleted.length > 0 ? sortedUncompleted : candidateDrills;
    let cycleIdx = 0;
    while (selectedDrills.length < setCount) {
      selectedDrills.push(baseList[cycleIdx % baseList.length]);
      cycleIdx++;
    }
  }

  const isDaily = selectedDrills.some((d) => d.id === todayDrill.id);

  return {
    drills: selectedDrills,
    reason,
    isDaily,
    uncompletedCount,
    totalCount,
    completionPercentage,
  };
}

/**
 * When a complete Contrast Set has all members still uncompleted, return those
 * three siblings as the round. Deterministic pick among eligible sets via date + skip.
 */
function pickContrastSetRound(params: {
  candidateDrills: DrillDefinitionDTO[];
  completedDrills: Record<string, DrillAttemptRecord>;
  todayDateStr: string;
  sessionSkipCount: number;
  setCount: number;
}): {
  drills: DrillDefinitionDTO[];
  contrastSetId: string;
  contrastPrinciple: string;
} | null {
  const { candidateDrills, completedDrills, todayDateStr, sessionSkipCount, setCount } = params;
  // Contrast Sets preferentially fill the first daily round only; later skips use independent picks.
  if (sessionSkipCount > 0) return null;
  if (setCount !== RAPID_FIRE_REPS_PER_DRILL) return null;

  const bySet = new Map<string, RapidFireDrillDefinition[]>();
  for (const drill of candidateDrills) {
    if (!isRapidFireDrill(drill) || !drill.contrastSetId) continue;
    const siblings = bySet.get(drill.contrastSetId) ?? [];
    siblings.push(drill);
    bySet.set(drill.contrastSetId, siblings);
  }

  const eligible: Array<{
    contrastSetId: string;
    contrastPrinciple: string;
    drills: RapidFireDrillDefinition[];
  }> = [];

  for (const [contrastSetId, siblings] of bySet) {
    if (siblings.length !== RAPID_FIRE_REPS_PER_DRILL) continue;
    if (siblings.some((d) => completedDrills[d.id])) continue;
    const principle = siblings[0]?.contrastPrinciple?.trim();
    if (!principle) continue;
    if (!siblings.every((d) => (d.contrastPrinciple ?? '').trim() === principle)) continue;

    // Stable order by catalog position so the round is deterministic.
    const ordered = [...siblings].sort((a, b) => {
      const idxA = candidateDrills.findIndex((d) => d.id === a.id);
      const idxB = candidateDrills.findIndex((d) => d.id === b.id);
      return idxA - idxB;
    });

    eligible.push({
      contrastSetId,
      contrastPrinciple: principle,
      drills: ordered,
    });
  }

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => a.contrastSetId.localeCompare(b.contrastSetId));
  const pickIndex = hashDateString(todayDateStr) % eligible.length;
  const picked = eligible[pickIndex];
  return {
    drills: picked.drills,
    contrastSetId: picked.contrastSetId,
    contrastPrinciple: picked.contrastPrinciple,
  };
}

/** Backward-compatibility alias */
export const selectRecommendedRapidFireSet = selectRecommendedRound;

/**
 * Selects today's assigned workout for a specific user deterministically.
 * Randomizes across Rapid Fire (3 reps), Case File (1 scenario), and Troubleshooting (1 incident),
 * seeded by date + visitor ID (Question 1 = B).
 */
export function selectDailyWorkout(params: {
  allDrills: (DrillDefinitionDTO | ClientDrillDefinitionDTO)[];
  completedDrills: Record<string, DrillAttemptRecord>;
  todayDateStr: string;
  visitorId: string;
  rapidFireReps?: number;
}): DailyWorkoutAssignment | null {
  const {
    allDrills,
    completedDrills,
    todayDateStr,
    visitorId,
    rapidFireReps = RAPID_FIRE_REPS_PER_DRILL,
  } = params;

  if (allDrills.length === 0) return null;

  const rapidFireCatalog = allDrills.filter(isRapidFireDrill) as RapidFireDrillDefinition[];
  const caseFiles = allDrills.filter(isCaseFileDrill) as CaseFileDrillDefinition[];
  const incidents = allDrills.filter(
    isTroubleshootingDrill,
  ) as ClientTroubleshootingDrillDefinition[];

  const availableFormats: DailyWorkoutFormat[] = [];
  if (rapidFireCatalog.length > 0) availableFormats.push('Rapid_Fire');
  if (caseFiles.length > 0) availableFormats.push('Case_File');
  if (incidents.length > 0) availableFormats.push('Troubleshooting');

  if (availableFormats.length === 0) return null;

  // Deterministic seed based on date and visitor ID
  const userDailySeed = hashString(`${todayDateStr}:${visitorId || 'guest'}`);
  const formatIndex = userDailySeed % availableFormats.length;
  const format = availableFormats[formatIndex];

  if (format === 'Case_File') {
    const uncompletedCases = caseFiles.filter((c) => !completedDrills[c.id]);
    const pool = uncompletedCases.length > 0 ? uncompletedCases : caseFiles;
    const caseIndex = userDailySeed % pool.length;
    const assignedCase = pool[caseIndex];

    const attempt = completedDrills[assignedCase.id];
    const isCompletedToday = Boolean(attempt && attempt.completedAt.slice(0, 10) === todayDateStr);

    return {
      format: 'Case_File',
      title: assignedCase.title,
      description:
        assignedCase.brief?.synopsis ||
        'Enterprise narrative Brief with scarce Probe Budget across stations.',
      estimatedMinutes: 10,
      isCompletedToday,
      caseFile: assignedCase,
      drillId: assignedCase.id,
    };
  }

  if (format === 'Troubleshooting') {
    const uncompletedIncidents = incidents.filter((inc) => !completedDrills[inc.id]);
    const pool = uncompletedIncidents.length > 0 ? uncompletedIncidents : incidents;
    const incidentIndex = userDailySeed % pool.length;
    const assignedIncident = pool[incidentIndex];

    const attempt = completedDrills[assignedIncident.id];
    const isCompletedToday = Boolean(attempt && attempt.completedAt.slice(0, 10) === todayDateStr);

    return {
      format: 'Troubleshooting',
      title: assignedIncident.title,
      description:
        assignedIncident.issue ||
        'Diagnose architectural failure from system topology diagram and scarce probes.',
      estimatedMinutes: 8,
      isCompletedToday,
      incident: assignedIncident,
      drillId: assignedIncident.id,
    };
  }

  // Rapid_Fire (3 reps, ~5 min)
  const round = selectRecommendedRound({
    drills: rapidFireCatalog,
    completedDrills,
    todayDateStr,
    setCount: rapidFireReps,
  });

  const isCompletedToday = Boolean(
    round &&
      round.drills.length > 0 &&
      round.drills.every((d) => {
        const att = completedDrills[d.id];
        return att && att.completedAt.slice(0, 10) === todayDateStr;
      }),
  );

  return {
    format: 'Rapid_Fire',
    title: `${rapidFireReps}-Rep High-Tempo Decision Workout`,
    description:
      'Calibrate architectural judgment across platform trade-offs before committing recommendations.',
    estimatedMinutes: 5,
    isCompletedToday,
    rapidFireRound: round ?? undefined,
  };
}
