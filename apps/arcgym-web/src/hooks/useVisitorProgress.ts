import { useState, useCallback } from 'react';
import { VisitorProgressState, DrillAttemptRecord, DrillFormat } from '@arcgym/drill-core';

const STORAGE_KEY = 'arcgym_visitor_state_v1';
const LEGACY_STREAK_KEY = 'arcgym_streak';

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function initializeState(): VisitorProgressState {
  const today = getTodayString();
  const defaultState: VisitorProgressState = {
    version: 1,
    streakDays: 1,
    lastActiveDate: today,
    completedDrills: {},
  };

  if (typeof window === 'undefined') return defaultState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VisitorProgressState;
      if (parsed && typeof parsed.completedDrills === 'object') {
        return parsed;
      }
    }

    // Attempt migration from legacy arcgym_streak
    const legacy = localStorage.getItem(LEGACY_STREAK_KEY);
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      if (parsedLegacy?.streakDays) {
        defaultState.streakDays = Number(parsedLegacy.streakDays) || 1;
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
    }) => {
      const today = getTodayString();
      const yesterday = getYesterdayString();

      setState((prev) => {
        let newStreak = prev.streakDays;
        if (prev.lastActiveDate === yesterday) {
          newStreak += 1;
        } else if (prev.lastActiveDate !== today) {
          // If missed more than 1 day
          newStreak = 1;
        }

        const existingRecord = prev.completedDrills[params.drillId];
        const newRecord: DrillAttemptRecord = {
          drillId: params.drillId,
          format: params.format,
          completedAt: new Date().toISOString(),
          score: params.score,
          accuracy: params.accuracy,
          attemptsCount: (existingRecord?.attemptsCount || 0) + 1,
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

  // Reset progress history
  const resetProgress = useCallback(() => {
    const today = getTodayString();
    const cleanState: VisitorProgressState = {
      version: 1,
      streakDays: 1,
      lastActiveDate: today,
      completedDrills: {},
    };
    saveState(cleanState);
  }, [saveState]);

  const isDrillCompleted = useCallback(
    (drillId: string) => Boolean(state.completedDrills[drillId]),
    [state.completedDrills]
  );

  const totalCompleted = Object.keys(state.completedDrills).length;

  return {
    progress: state,
    streakDays: state.streakDays,
    completedDrills: state.completedDrills,
    totalCompleted,
    isDrillCompleted,
    recordDrillCompletion,
    resetProgress,
  };
}
