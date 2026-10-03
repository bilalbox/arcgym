import {
  type ArchitecturalDomain,
  type ClientDrillDefinitionDTO,
  type DrillAttemptRecord,
  isRapidFireDrill,
  type RapidFireDrillDefinition,
  type RecommendedRound,
  selectRecommendedRound,
} from '@arcgym/drill-core';
import { useCallback, useMemo, useState } from 'react';
import rawCanonicalDrills from '../data/canonicalDrills.json';

const ALL_DRILLS = rawCanonicalDrills as unknown as ClientDrillDefinitionDTO[];
const RAPID_FIRE_DRILLS = ALL_DRILLS.filter(isRapidFireDrill);

export function useDrillRecommendation(
  completedDrills: Record<string, DrillAttemptRecord>,
  domain?: ArchitecturalDomain,
) {
  const [sessionSkipCount, setSessionSkipCount] = useState<number>(0);

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const activeRound: RecommendedRound | null = useMemo(() => {
    return selectRecommendedRound({
      drills: RAPID_FIRE_DRILLS,
      completedDrills,
      todayDateStr,
      domain,
      sessionSkipCount,
      setCount: 3,
    });
  }, [completedDrills, todayDateStr, domain, sessionSkipCount]);

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
