import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ArchitecturalDomain,
  DrillDefinitionDTO,
  DrillFormat,
  DrillAttemptRecord,
  selectRecommendedDrill,
  selectRecommendedRapidFireSet,
  RecommendationResult,
  RapidFireSetRecommendation,
  RapidFireDrillDefinition,
} from '@arcgym/drill-core';
import rawCanonicalDrills from '../data/canonicalDrills.json';

const ALL_DRILLS = rawCanonicalDrills as unknown as DrillDefinitionDTO[];

export function useDrillRecommendation(
  format: DrillFormat,
  completedDrills: Record<string, DrillAttemptRecord>,
  domain?: ArchitecturalDomain
) {
  const [, setSessionSkipCount] = useState<number>(0);

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const completedDrillsRef = useRef(completedDrills);
  completedDrillsRef.current = completedDrills;

  // Active Rapid Fire set (5 drills)
  const [activeRapidFireSet, setActiveRapidFireSet] = useState<RapidFireSetRecommendation | null>(() => {
    if (format === 'Rapid_Fire') {
      return selectRecommendedRapidFireSet({
        drills: ALL_DRILLS,
        completedDrills,
        todayDateStr: new Date().toISOString().slice(0, 10),
        domain,
        sessionSkipCount: 0,
        setCount: 5,
      });
    }
    return null;
  });

  // Active recommendation state (single drill for Diagram / Lesson, or primary drill for Rapid Fire)
  const [activeRecommendation, setActiveRecommendation] = useState<RecommendationResult | null>(() => {
    if (format === 'Rapid_Fire') {
      const rfSet = selectRecommendedRapidFireSet({
        drills: ALL_DRILLS,
        completedDrills,
        todayDateStr: new Date().toISOString().slice(0, 10),
        domain,
        sessionSkipCount: 0,
        setCount: 5,
      });
      if (rfSet && rfSet.drills.length > 0) {
        return {
          drill: rfSet.drills[0],
          reason: rfSet.reason,
          isDaily: rfSet.isDaily,
          uncompletedCount: rfSet.uncompletedCount,
          totalCount: rfSet.totalCount,
          completionPercentage: rfSet.completionPercentage,
        };
      }
      return null;
    }

    return selectRecommendedDrill({
      drills: ALL_DRILLS,
      completedDrills,
      todayDateStr: new Date().toISOString().slice(0, 10),
      format,
      domain,
      sessionSkipCount: 0,
    });
  });

  // When format or domain filter changes, pick the new recommended drill/set
  useEffect(() => {
    setSessionSkipCount(0);
    if (format === 'Rapid_Fire') {
      const rfSet = selectRecommendedRapidFireSet({
        drills: ALL_DRILLS,
        completedDrills: completedDrillsRef.current,
        todayDateStr,
        domain,
        sessionSkipCount: 0,
        setCount: 5,
      });
      setActiveRapidFireSet(rfSet);
      if (rfSet && rfSet.drills.length > 0) {
        setActiveRecommendation({
          drill: rfSet.drills[0],
          reason: rfSet.reason,
          isDaily: rfSet.isDaily,
          uncompletedCount: rfSet.uncompletedCount,
          totalCount: rfSet.totalCount,
          completionPercentage: rfSet.completionPercentage,
        });
      } else {
        setActiveRecommendation(null);
      }
    } else {
      setActiveRapidFireSet(null);
      const rec = selectRecommendedDrill({
        drills: ALL_DRILLS,
        completedDrills: completedDrillsRef.current,
        todayDateStr,
        format,
        domain,
        sessionSkipCount: 0,
      });
      setActiveRecommendation(rec);
    }
  }, [format, domain, todayDateStr]);

  const advanceToNextDrill = useCallback(() => {
    setSessionSkipCount((prevSkip) => {
      const nextSkip = prevSkip + 1;

      if (format === 'Rapid_Fire') {
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
          setActiveRecommendation({
            drill: nextSet.drills[0],
            reason: nextSet.reason,
            isDaily: nextSet.isDaily,
            uncompletedCount: nextSet.uncompletedCount,
            totalCount: nextSet.totalCount,
            completionPercentage: nextSet.completionPercentage,
          });
        }
      } else {
        const nextRec = selectRecommendedDrill({
          drills: ALL_DRILLS,
          completedDrills: completedDrillsRef.current,
          todayDateStr,
          format,
          domain,
          sessionSkipCount: nextSkip,
        });
        setActiveRecommendation(nextRec);
      }

      return nextSkip;
    });
  }, [format, domain, todayDateStr]);

  const resetSessionSkip = useCallback(() => {
    setSessionSkipCount(0);
    if (format === 'Rapid_Fire') {
      const rfSet = selectRecommendedRapidFireSet({
        drills: ALL_DRILLS,
        completedDrills: completedDrillsRef.current,
        todayDateStr,
        domain,
        sessionSkipCount: 0,
        setCount: 5,
      });
      setActiveRapidFireSet(rfSet);
      if (rfSet && rfSet.drills.length > 0) {
        setActiveRecommendation({
          drill: rfSet.drills[0],
          reason: rfSet.reason,
          isDaily: rfSet.isDaily,
          uncompletedCount: rfSet.uncompletedCount,
          totalCount: rfSet.totalCount,
          completionPercentage: rfSet.completionPercentage,
        });
      } else {
        setActiveRecommendation(null);
      }
    } else {
      setActiveRapidFireSet(null);
      const rec = selectRecommendedDrill({
        drills: ALL_DRILLS,
        completedDrills: completedDrillsRef.current,
        todayDateStr,
        format,
        domain,
        sessionSkipCount: 0,
      });
      setActiveRecommendation(rec);
    }
  }, [format, domain, todayDateStr]);

  // Dynamic progress stats for the active format ∩ domain
  const candidateDrills = useMemo(() => {
    return ALL_DRILLS.filter((d) => {
      if (format && d.format !== format) return false;
      if (domain && d.domain !== domain) return false;
      return true;
    });
  }, [format, domain]);

  const totalCount = candidateDrills.length;
  const uncompletedCount = useMemo(() => {
    return candidateDrills.filter((d) => !completedDrills[d.id]).length;
  }, [candidateDrills, completedDrills]);

  const completionPercentage =
    totalCount > 0
      ? Math.round(((totalCount - uncompletedCount) / totalCount) * 100)
      : 0;

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
