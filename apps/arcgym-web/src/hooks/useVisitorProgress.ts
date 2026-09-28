import { useState, useCallback, useMemo } from 'react';
import {
  VisitorProgressState,
  DrillAttemptRecord,
  DrillFormat,
  computeNewStreak,
  calculateActiveStreak,
  calculateTotalPoints,
  getTodayString,
  getYesterdayString,
} from '@arcgym/drill-core';

const STORAGE_KEY = 'arcgym_visitor_state_v1';
const LEGACY_STREAK_KEY = 'arcgym_streak';

function initializeState(): VisitorProgressState {
  const defaultState: VisitorProgressState = {
    version: 1,
    streakDays: 0,
    lastActiveDate: '',
    completedDrills: {},
  };

  if (typeof window === 'undefined') return defaultState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VisitorProgressState;
      if (parsed && typeof parsed.completedDrills === 'object') {
        const completedCount = Object.keys(parsed.completedDrills).length;
        if (completedCount === 0) {
          return {
            ...parsed,
            streakDays: 0,
            lastActiveDate: '',
          };
        }
        const activeStreak = calculateActiveStreak(
          parsed.streakDays,
          parsed.lastActiveDate,
          completedCount
        );
        return {
          ...parsed,
          streakDays: activeStreak,
        };
      }
    }

    // Attempt migration from legacy arcgym_streak only if streak was non-zero
    const legacy = localStorage.getItem(LEGACY_STREAK_KEY);
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      if (parsedLegacy?.streakDays && parsedLegacy?.lastActiveDate) {
        const active = calculateActiveStreak(
          Number(parsedLegacy.streakDays) || 0,
          parsedLegacy.lastActiveDate.slice(0, 10),
          1 // assume at least 1 drill completed if legacy streak was set
        );
        defaultState.streakDays = active;
        defaultState.lastActiveDate = active > 0 ? parsedLegacy.lastActiveDate.slice(0, 10) : '';
      }
    }
  } catch (err) {
    console.error('Failed to load visitor progress from localStorage', err);
  }

  return defaultState;
}

export function useVisitorProgress() {
  const [state, setState] = useState<VisitorProgressState>(initializeState);

  // Sync to localStorage
  const saveState = useCallback((newState: VisitorProgressState) => {
    setState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      localStorage.setItem(
        LEGACY_STREAK_KEY,
        JSON.stringify({ streakDays: newState.streakDays, lastActiveDate: newState.lastActiveDate })
      );
    } catch (e) {
      console.error('Failed to save visitor progress to localStorage', e);
    }
  }, []);

  // Record a completed drill
  const recordDrillCompletion = useCallback(
    (params: {
      drillId: string;
      format: DrillFormat;
      score: number;
      accuracy: number;
      steps?: import('@arcgym/drill-core').StepAttemptTelemetry[];
    }) => {
      const today = getTodayString();
      const yesterday = getYesterdayString();

      setState((prev) => {
        const newStreak = computeNewStreak(
          prev.streakDays,
          prev.lastActiveDate,
          today,
          yesterday
        );

        const existingRecord = prev.completedDrills[params.drillId];
        const newRecord: DrillAttemptRecord = {
          drillId: params.drillId,
          format: params.format,
          completedAt: new Date().toISOString(),
          score: params.score,
          accuracy: params.accuracy,
          attemptsCount: (existingRecord?.attemptsCount || 0) + 1,
          ...(params.steps ? { steps: params.steps } : {}),
        };

        const updated: VisitorProgressState = {
          ...prev,
          streakDays: newStreak,
          lastActiveDate: today,
          completedDrills: {
            ...prev.completedDrills,
            [params.drillId]: newRecord,
          },
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          localStorage.setItem(
            LEGACY_STREAK_KEY,
            JSON.stringify({ streakDays: updated.streakDays, lastActiveDate: updated.lastActiveDate })
          );
        } catch (e) {
          console.error('Failed to persist progress', e);
        }

        return updated;
      });
    },
    []
  );

  // Record completion of all reps in a Rapid Fire drill set to achieve that day's streak
  const recordRapidFireSetCompletion = useCallback(
    (
      attempts: Array<{
        drillId: string;
        format: DrillFormat;
        score: number;
        accuracy: number;
        steps?: import('@arcgym/drill-core').StepAttemptTelemetry[];
      }>
    ) => {
      const today = getTodayString();
      const yesterday = getYesterdayString();

      setState((prev) => {
        const newStreak = computeNewStreak(
          prev.streakDays,
          prev.lastActiveDate,
          today,
          yesterday
        );

        const updatedCompleted = { ...prev.completedDrills };
        const now = new Date().toISOString();

        for (const item of attempts) {
          const existingRecord = updatedCompleted[item.drillId];
          updatedCompleted[item.drillId] = {
            drillId: item.drillId,
            format: item.format,
            completedAt: now,
            score: item.score,
            accuracy: item.accuracy,
            attemptsCount: (existingRecord?.attemptsCount || 0) + 1,
            ...(item.steps ? { steps: item.steps } : {}),
          };
        }

        const updated: VisitorProgressState = {
          ...prev,
          streakDays: newStreak,
          lastActiveDate: today,
          completedDrills: updatedCompleted,
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          localStorage.setItem(
            LEGACY_STREAK_KEY,
            JSON.stringify({ streakDays: updated.streakDays, lastActiveDate: updated.lastActiveDate })
          );
        } catch (e) {
          console.error('Failed to persist progress', e);
        }

        return updated;
      });
    },
    []
  );

  // Reset progress history
  const resetProgress = useCallback(() => {
    const cleanState: VisitorProgressState = {
      version: 1,
      streakDays: 0,
      lastActiveDate: '',
      completedDrills: {},
    };
    saveState(cleanState);
  }, [saveState]);

  const isDrillCompleted = useCallback(
    (drillId: string) => Boolean(state.completedDrills[drillId]),
    [state.completedDrills]
  );

  const totalCompleted = Object.keys(state.completedDrills).length;

  const activeStreak = useMemo(() => {
    return calculateActiveStreak(state.streakDays, state.lastActiveDate, totalCompleted);
  }, [state.streakDays, state.lastActiveDate, totalCompleted]);

  const totalPoints = useMemo(() => {
    return calculateTotalPoints(state.completedDrills);
  }, [state.completedDrills]);

  const isStreakEarnedToday = state.lastActiveDate === getTodayString();

  return {
    progress: state,
    streakDays: activeStreak,
    isStreakEarnedToday,
    totalPoints,
    completedDrills: state.completedDrills,
    totalCompleted,
    isDrillCompleted,
    recordDrillCompletion,
    recordRapidFireSetCompletion,
    resetProgress,
  };
}
