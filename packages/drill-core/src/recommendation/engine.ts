import type {
  ArchitecturalDomain,
  DrillAttemptRecord,
  DrillDefinitionDTO,
} from '../types/drill.js';

export type RecommendationReason = 'daily' | 'next_uncompleted' | 'review';

export interface RecommendedRound {
  drills: DrillDefinitionDTO[];
  reason: RecommendationReason;
  isDaily: boolean;
  uncompletedCount: number;
  totalCount: number;
  completionPercentage: number;
}

/** Backward compatibility alias */
export type RapidFireSetRecommendation = RecommendedRound;

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
    setCount = 3,
  } = params;

  const candidateDrills = drills.filter((d) => {
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

/** Backward-compatibility alias */
export const selectRecommendedRapidFireSet = selectRecommendedRound;
