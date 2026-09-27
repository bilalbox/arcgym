import {
  ArchitecturalDomain,
  DrillDefinitionDTO,
  DrillFormat,
  DrillAttemptRecord,
} from '../types/drill.js';

export type RecommendationReason = 'daily' | 'next_uncompleted' | 'review';

export interface RecommendationResult {
  drill: DrillDefinitionDTO;
  reason: RecommendationReason;
  isDaily: boolean;
  uncompletedCount: number;
  totalCount: number;
  completionPercentage: number;
  previousAttempt?: DrillAttemptRecord;
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
 * Selects the optimal drill for the visitor within Format ∩ optional Architectural Domain:
 * 1. If today's drill is uncompleted, recommend it (reason: 'daily').
 * 2. If today's drill is completed, recommend the next uncompleted drill.
 * 3. If all candidates are completed, enter review mode.
 */
export function selectRecommendedDrill(params: {
  drills: DrillDefinitionDTO[];
  completedDrills: Record<string, DrillAttemptRecord>;
  todayDateStr: string;
  format?: DrillFormat;
  domain?: ArchitecturalDomain;
  sessionSkipCount?: number;
}): RecommendationResult | null {
  const {
    drills,
    completedDrills,
    todayDateStr,
    format,
    domain,
    sessionSkipCount = 0,
  } = params;

  const candidateDrills = drills.filter((d) => {
    if (format && d.format !== format) return false;
    if (domain && d.domain !== domain) return false;
    return true;
  });

  if (candidateDrills.length === 0) {
    return null;
  }

  const totalCount = candidateDrills.length;
  const uncompleted = candidateDrills.filter((d) => !completedDrills[d.id]);
  const uncompletedCount = uncompleted.length;
  const completionPercentage = Math.round(
    ((totalCount - uncompletedCount) / totalCount) * 100
  );

  const dailyIndex = getDailyDrillIndex(todayDateStr, totalCount);
  const todayDrill = candidateDrills[dailyIndex];
  const isTodayCompleted = Boolean(completedDrills[todayDrill.id]);

  if (!isTodayCompleted && sessionSkipCount === 0) {
    return {
      drill: todayDrill,
      reason: 'daily',
      isDaily: true,
      uncompletedCount,
      totalCount,
      completionPercentage,
    };
  }

  if (uncompletedCount > 0) {
    const sortedUncompleted = [...uncompleted].sort((a, b) => {
      const idxA = candidateDrills.findIndex((d) => d.id === a.id);
      const idxB = candidateDrills.findIndex((d) => d.id === b.id);
      const distA = (idxA - dailyIndex + totalCount) % totalCount;
      const distB = (idxB - dailyIndex + totalCount) % totalCount;
      return distA - distB;
    });

    const chosenIndex = sessionSkipCount % sortedUncompleted.length;
    const chosenDrill = sortedUncompleted[chosenIndex];

    return {
      drill: chosenDrill,
      reason: 'next_uncompleted',
      isDaily: chosenDrill.id === todayDrill.id,
      uncompletedCount,
      totalCount,
      completionPercentage,
    };
  }

  const reviewSorted = [...candidateDrills].sort((a, b) => {
    const recA = completedDrills[a.id];
    const recB = completedDrills[b.id];
    if (!recA || !recB) return 0;

    const timeA = new Date(recA.completedAt).getTime();
    const timeB = new Date(recB.completedAt).getTime();
    if (timeA !== timeB) return timeA - timeB;

    return (recA.score || 0) - (recB.score || 0);
  });

  const reviewIndex = sessionSkipCount % reviewSorted.length;
  const reviewDrill = reviewSorted[reviewIndex];

  return {
    drill: reviewDrill,
    reason: 'review',
    isDaily: reviewDrill.id === todayDrill.id,
    uncompletedCount: 0,
    totalCount,
    completionPercentage: 100,
    previousAttempt: completedDrills[reviewDrill.id],
  };
}
