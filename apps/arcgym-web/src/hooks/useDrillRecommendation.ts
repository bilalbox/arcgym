import { useState, useMemo, useCallback } from 'react';
import {
  DrillDefinitionDTO,
  DrillFormat,
  DrillAttemptRecord,
  selectRecommendedDrill,
  RecommendationResult,
} from '@arcgym/drill-core';
import rawCanonicalDrills from '../data/canonicalDrills.json';

const ALL_DRILLS = rawCanonicalDrills as unknown as DrillDefinitionDTO[];

export function useDrillRecommendation(
  format: DrillFormat,
  completedDrills: Record<string, DrillAttemptRecord>
) {
  const [sessionSkipCount, setSessionSkipCount] = useState<number>(0);

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const recommendation = useMemo<RecommendationResult | null>(() => {
    return selectRecommendedDrill({
      drills: ALL_DRILLS,
      completedDrills,
      todayDateStr,
      format,
      sessionSkipCount,
    });
  }, [completedDrills, todayDateStr, format, sessionSkipCount]);

  const advanceToNextDrill = useCallback(() => {
    setSessionSkipCount((prev) => prev + 1);
  }, []);

  const resetSessionSkip = useCallback(() => {
    setSessionSkipCount(0);
  }, []);

  return {
    recommendation,
    currentDrill: recommendation?.drill ?? null,
    isDaily: recommendation?.isDaily ?? false,
    reason: recommendation?.reason ?? 'daily',
    isReviewMode: recommendation?.reason === 'review',
    previousAttempt: recommendation?.previousAttempt,
    uncompletedCount: recommendation?.uncompletedCount ?? 0,
    totalCount: recommendation?.totalCount ?? 0,
    completionPercentage: recommendation?.completionPercentage ?? 0,
    allDrillsCount: ALL_DRILLS.length,
    advanceToNextDrill,
    resetSessionSkip,
  };
}
