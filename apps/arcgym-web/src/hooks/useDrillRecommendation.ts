import {
  type ArchitecturalDomain,
  type DrillAttemptRecord,
  type DrillDefinitionDTO,
  type RapidFireDrillDefinition,
  type RapidFireSetRecommendation,
  type RecommendationResult,
  selectRecommendedRapidFireSet,
} from '@arcgym/drill-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rawCanonicalDrills from '../data/canonicalDrills.json';

const ALL_DRILLS = rawCanonicalDrills as unknown as DrillDefinitionDTO[];

function recommendationFromSet(rfSet: RapidFireSetRecommendation): RecommendationResult {
  return {
    drill: rfSet.drills[0],
    reason: rfSet.reason,
    isDaily: rfSet.isDaily,
    uncompletedCount: rfSet.uncompletedCount,
    totalCount: rfSet.totalCount,
    completionPercentage: rfSet.completionPercentage,
  };
}

export function useDrillRecommendation(
  completedDrills: Record<string, DrillAttemptRecord>,
  domain?: ArchitecturalDomain,
) {
  const [, setSessionSkipCount] = useState<number>(0);

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const completedDrillsRef = useRef(completedDrills);
  completedDrillsRef.current = completedDrills;

  const [activeRapidFireSet, setActiveRapidFireSet] = useState<RapidFireSetRecommendation | null>(
    () =>
      selectRecommendedRapidFireSet({
        drills: ALL_DRILLS,
        completedDrills,
        todayDateStr: new Date().toISOString().slice(0, 10),
        domain,
        sessionSkipCount: 0,
        setCount: 5,
      }),
  );

  const [activeRecommendation, setActiveRecommendation] = useState<RecommendationResult | null>(
    () => {
      const rfSet = selectRecommendedRapidFireSet({
        drills: ALL_DRILLS,
        completedDrills,
        todayDateStr: new Date().toISOString().slice(0, 10),
        domain,
        sessionSkipCount: 0,
        setCount: 5,
      });
      if (rfSet && rfSet.drills.length > 0) {
        return recommendationFromSet(rfSet);
      }
      return null;
    },
  );

  // When domain filter changes, pick the new recommended set
  useEffect(() => {
    setSessionSkipCount(0);
    const rfSet = selectRecommendedRapidFireSet({
      drills: ALL_DRILLS,
      completedDrills: completedDrillsRef.current,
      todayDateStr,
      domain,
      sessionSkipCount: 0,
      setCount: 5,
    });
    setActiveRapidFireSet(rfSet);
    setActiveRecommendation(rfSet && rfSet.drills.length > 0 ? recommendationFromSet(rfSet) : null);
  }, [domain, todayDateStr]);

  const advanceToNextDrill = useCallback(() => {
    setSessionSkipCount((prevSkip) => {
      const nextSkip = prevSkip + 1;
      const nextSet = selectRecommendedRapidFireSet({
        drills: ALL_DRILLS,
        completedDrills: completedDrillsRef.current,
        todayDateStr,
        domain,
        sessionSkipCount: nextSkip,
        setCount: 5,
      });
      setActiveRapidFireSet(nextSet);
      if (nextSet && nextSet.drills.length > 0) {
        setActiveRecommendation(recommendationFromSet(nextSet));
      }
      return nextSkip;
    });
  }, [domain, todayDateStr]);

  const resetSessionSkip = useCallback(() => {
    setSessionSkipCount(0);
    const rfSet = selectRecommendedRapidFireSet({
      drills: ALL_DRILLS,
      completedDrills: completedDrillsRef.current,
      todayDateStr,
      domain,
      sessionSkipCount: 0,
      setCount: 5,
    });
    setActiveRapidFireSet(rfSet);
    setActiveRecommendation(rfSet && rfSet.drills.length > 0 ? recommendationFromSet(rfSet) : null);
  }, [domain, todayDateStr]);

  const candidateDrills = useMemo(() => {
    return ALL_DRILLS.filter((d) => {
      if (domain && d.domain !== domain) return false;
      return true;
    });
  }, [domain]);

  const totalCount = candidateDrills.length;
  const uncompletedCount = useMemo(() => {
    return candidateDrills.filter((d) => !completedDrills[d.id]).length;
  }, [candidateDrills, completedDrills]);

  const completionPercentage =
    totalCount > 0 ? Math.round(((totalCount - uncompletedCount) / totalCount) * 100) : 0;

  return {
    recommendation: activeRecommendation,
    currentDrill: activeRecommendation?.drill ?? null,
    rapidFireDrills: (activeRapidFireSet?.drills ?? []) as RapidFireDrillDefinition[],
    isDaily: activeRecommendation?.isDaily ?? false,
    reason: activeRecommendation?.reason ?? null,
    isReviewMode: activeRecommendation?.reason === 'review',
    previousAttempt: activeRecommendation?.previousAttempt,
    uncompletedCount,
    totalCount,
    completionPercentage,
    allDrillsCount: ALL_DRILLS.length,
    advanceToNextDrill,
    resetSessionSkip,
  };
}

export { ALL_DRILLS };
