import { DrillDefinitionDTO, DrillFormat, DrillAttemptRecord } from '../types/drill.js';

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
    hash = ((hash << 5) - hash) + char;
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
 * Selects the optimal drill for the visitor:
 * 1. If today's drill for the format is uncompleted, recommend it (reason: 'daily').
 * 2. If today's drill is already completed, recommend the next uncompleted drill (reason: 'next_uncompleted').
 *    If an offset is specified (e.g. user clicked "Next Drill"), skip forward among uncompleted drills.
 * 3. If all drills in the format are completed, enter review mode (reason: 'review'),
 *    prioritizing the least recently completed drill or lowest score.
 */
export function selectRecommendedDrill(params: {
  drills: DrillDefinitionDTO[];
  completedDrills: Record<string, DrillAttemptRecord>;
  todayDateStr: string;
  format?: DrillFormat;
  sessionSkipCount?: number;
}): RecommendationResult | null {
  const { drills, completedDrills, todayDateStr, format, sessionSkipCount = 0 } = params;

  // Filter by format if provided
  const candidateDrills = format
    ? drills.filter((d) => d.format === format)
    : drills;

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

  // Case 1: Today's drill is NOT completed and user hasn't skipped past it
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

  // Case 2: Today's drill is completed, or user requested next drill, but uncompleted drills remain
  if (uncompletedCount > 0) {
    // Sort uncompleted candidates starting circularly after the daily index
    const sortedUncompleted = [...uncompleted].sort((a, b) => {
      const idxA = candidateDrills.findIndex((d) => d.id === a.id);
      const idxB = candidateDrills.findIndex((d) => d.id === b.id);
      const distA = (idxA - dailyIndex + totalCount) % totalCount;
      const distB = (idxB - dailyIndex + totalCount) % totalCount;
      return distA - distB;
    });

    // Handle skip count safely with modulo
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

  // Case 3: All candidate drills are completed -> Mastery Review Mode
  // Sort candidate drills by oldest completedAt (or lowest score as tiebreak)
  const reviewSorted = [...candidateDrills].sort((a, b) => {
    const recA = completedDrills[a.id];
    const recB = completedDrills[b.id];
    if (!recA || !recB) return 0;

    const timeA = new Date(recA.completedAt).getTime();
    const timeB = new Date(recB.completedAt).getTime();
    if (timeA !== timeB) return timeA - timeB; // Oldest first

    return (recA.score || 0) - (recB.score || 0); // Lowest score first
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
