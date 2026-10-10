import {
  type ArchitecturalDomain,
  type ClientDrillDefinitionDTO,
  type DailyWorkoutAssignment,
  type DeferredRetestSlot,
  type DrillAttemptRecord,
  isRapidFireDrill,
  RAPID_FIRE_REPS_PER_DRILL,
  type RapidFireDrillDefinition,
  type RecommendedRound,
  selectDailyWorkout,
  selectRecommendedRound,
} from '@arcgym/drill-core';
import { useCallback, useMemo, useState } from 'react';
import rawCanonicalDrills from '../data/canonicalDrills.json';

const ALL_DRILLS = rawCanonicalDrills as unknown as ClientDrillDefinitionDTO[];
const RAPID_FIRE_DRILLS = ALL_DRILLS.filter(isRapidFireDrill);

export function useDrillRecommendation(
  completedDrills: Record<string, DrillAttemptRecord>,
  domain?: ArchitecturalDomain,
  visitorId?: string,
  deferredRetest?: DeferredRetestSlot | null,
) {
  const [sessionSkipCount, setSessionSkipCount] = useState<number>(0);

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const dailyWorkout: DailyWorkoutAssignment | null = useMemo(() => {
    return selectDailyWorkout({
      allDrills: ALL_DRILLS,
      completedDrills,
      todayDateStr,
      visitorId: visitorId || 'guest',
      rapidFireReps: RAPID_FIRE_REPS_PER_DRILL,
      deferredRetest,
    });
  }, [completedDrills, todayDateStr, visitorId, deferredRetest]);

  const activeRound: RecommendedRound | null = useMemo(() => {
    return selectRecommendedRound({
      drills: RAPID_FIRE_DRILLS,
      completedDrills,
      todayDateStr,
      domain,
      sessionSkipCount,
      setCount: RAPID_FIRE_REPS_PER_DRILL,
      deferredRetest,
    });
  }, [completedDrills, todayDateStr, domain, sessionSkipCount, deferredRetest]);

  const advanceToNextDrill = useCallback(() => {
    setSessionSkipCount((prev) => prev + 1);
  }, []);

  const resetSessionSkip = useCallback(() => {
    setSessionSkipCount(0);
  }, []);

  const previousAttempt = activeRound?.drills[0]
    ? completedDrills[activeRound.drills[0].id]
    : undefined;

  const rapidFireDrills = (activeRound?.drills ?? []).filter(isRapidFireDrill);

  return {
    round: activeRound,
    drills: rapidFireDrills,
    rapidFireDrills: rapidFireDrills as RapidFireDrillDefinition[],
    dailyWorkout,
    isDaily: activeRound?.isDaily ?? false,
    reason: activeRound?.reason ?? null,
    isReviewMode: activeRound?.reason === 'review',
    previousAttempt,
    uncompletedCount: activeRound?.uncompletedCount ?? 0,
    totalCount: activeRound?.totalCount ?? 0,
    completionPercentage: activeRound?.completionPercentage ?? 0,
    allDrillsCount: RAPID_FIRE_DRILLS.length,
    advanceToNextDrill,
    resetSessionSkip,
  };
}

export { ALL_DRILLS };
