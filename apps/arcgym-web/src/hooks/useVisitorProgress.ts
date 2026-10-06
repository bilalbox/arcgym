import {
  calculateActiveStreak,
  calculateTotalPoints,
  computeNewStreak,
  type DrillAttemptRecord,
  type DrillFormat,
  getDrillFormatDescriptor,
  getTodayString,
  getYesterdayString,
  mergeProgressStates,
  type VisitorProgressState,
} from '@arcgym/drill-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'arcgym_visitor_state_v1';
const LEGACY_STREAK_KEY = 'arcgym_streak';
export const AUTH_CACHE_KEY = 'arcgym_auth_cached';
const VISITOR_ID_KEY = 'arcgym_visitor_id';

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'guest';
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = `v_${Math.random().toString(36).slice(2, 11)}_${Date.now().toString(36)}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'guest';
  }
}

function getInitialAuthState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(AUTH_CACHE_KEY) === '1') return true;
    if (
      document.cookie.includes('arcgym_logged_in=1') ||
      window.location.search.includes('auth=success')
    ) {
      localStorage.setItem(AUTH_CACHE_KEY, '1');
      return true;
    }
  } catch {
    // ignore private browsing exceptions
  }
  return false;
}

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
          completedCount,
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
          1, // assume at least 1 drill completed if legacy streak was set
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getInitialAuthState);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const authCheckedRef = useRef(false);

  // Sync to localStorage
  const saveState = useCallback((newState: VisitorProgressState) => {
    setState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      localStorage.setItem(
        LEGACY_STREAK_KEY,
        JSON.stringify({
          streakDays: newState.streakDays,
          lastActiveDate: newState.lastActiveDate,
        }),
      );
    } catch (e) {
      console.error('Failed to save visitor progress to localStorage', e);
    }
  }, []);

  // Background push helper to Cloudflare D1
  const pushToCloud = useCallback(async (stateToPush: VisitorProgressState) => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/learner/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateToPush),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          authenticated: boolean;
          progress: VisitorProgressState;
        };
        if (data.authenticated && data.progress) {
          setState((prev) => {
            const merged = mergeProgressStates(prev, data.progress);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {
              // ignore
            }
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Sync push to cloud failed (offline or unauthenticated)', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Check auth and initial cloud pull on mount
  useEffect(() => {
    if (authCheckedRef.current) return;
    authCheckedRef.current = true;

    async function initialSync() {
      try {
        const res = await fetch('/api/learner/sync');
        if (!res.ok) return;
        const data = (await res.json()) as {
          authenticated: boolean;
          learnerId?: string;
          progress: VisitorProgressState | null;
        };

        if (data.authenticated) {
          setIsAuthenticated(true);
          try {
            localStorage.setItem(AUTH_CACHE_KEY, '1');
          } catch {
            // ignore
          }
          if (data.learnerId) setLearnerId(data.learnerId);

          if (data.progress) {
            const cloudProgress = data.progress;
            setState((prev) => {
              const merged = mergeProgressStates(prev, cloudProgress);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              } catch {
                // ignore
              }
              // If local had extra items not in cloud, push merged state back
              const localKeys = Object.keys(prev.completedDrills);
              const cloudKeys = Object.keys(cloudProgress.completedDrills || {});
              const hasLocalUnsynced = localKeys.some((k) => !cloudKeys.includes(k));
              if (hasLocalUnsynced) {
                pushToCloud(merged);
              }
              return merged;
            });
          } else {
            // First cloud login: push local trial progress
            pushToCloud(state);
          }
        } else {
          setIsAuthenticated(false);
          setLearnerId(null);
          try {
            localStorage.removeItem(AUTH_CACHE_KEY);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('Initial cloud sync check skipped', err);
      } finally {
        if (typeof window !== 'undefined' && window.location.search.includes('auth=')) {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('auth');
            url.searchParams.delete('reason');
            window.history.replaceState(
              {},
              '',
              url.pathname + (url.search ? url.search : '') + url.hash,
            );
          } catch {
            // ignore
          }
        }
      }
    }

    initialSync();
  }, [pushToCloud, state]);

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
        const countsForStreak = getDrillFormatDescriptor(params.format).countsForStreak;
        const newStreak = countsForStreak
          ? computeNewStreak(prev.streakDays, prev.lastActiveDate, today, yesterday)
          : prev.streakDays;

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
          lastActiveDate: countsForStreak ? today : prev.lastActiveDate,
          completedDrills: {
            ...prev.completedDrills,
            [params.drillId]: newRecord,
          },
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          localStorage.setItem(
            LEGACY_STREAK_KEY,
            JSON.stringify({
              streakDays: updated.streakDays,
              lastActiveDate: updated.lastActiveDate,
            }),
          );
        } catch (e) {
          console.error('Failed to persist progress', e);
        }

        if (isAuthenticated) {
          pushToCloud(updated);
        }

        return updated;
      });
    },
    [isAuthenticated, pushToCloud],
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
      }>,
    ) => {
      const today = getTodayString();
      const yesterday = getYesterdayString();

      setState((prev) => {
        const newStreak = computeNewStreak(prev.streakDays, prev.lastActiveDate, today, yesterday);

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
            JSON.stringify({
              streakDays: updated.streakDays,
              lastActiveDate: updated.lastActiveDate,
            }),
          );
        } catch (e) {
          console.error('Failed to persist progress', e);
        }

        if (isAuthenticated) {
          pushToCloud(updated);
        }

        return updated;
      });
    },
    [isAuthenticated, pushToCloud],
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

  const signInWithGoogle = useCallback((returnUrl?: string) => {
    const target = returnUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');
    window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(target)}`;
  }, []);

  const signInWithGithub = useCallback((returnUrl?: string) => {
    const target = returnUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');
    window.location.href = `/api/auth/github/login?returnUrl=${encodeURIComponent(target)}`;
  }, []);

  const signIn = useCallback(
    (provider: 'google' | 'github', returnUrl?: string) => {
      if (provider === 'github') {
        signInWithGithub(returnUrl);
      } else {
        signInWithGoogle(returnUrl);
      }
    },
    [signInWithGithub, signInWithGoogle],
  );

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(AUTH_CACHE_KEY);
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setLearnerId(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout failed', e);
    }
  }, []);

  const eraseAllData = useCallback(async () => {
    try {
      localStorage.removeItem(AUTH_CACHE_KEY);
    } catch {
      // ignore
    }
    resetProgress();
    setIsAuthenticated(false);
    setLearnerId(null);
    try {
      await fetch('/api/learner/delete', { method: 'POST' });
    } catch (e) {
      console.error('Telemetry erase failed', e);
    }
  }, [resetProgress]);

  const isDrillCompleted = useCallback(
    (drillId: string) => Boolean(state.completedDrills[drillId]),
    [state.completedDrills],
  );

  const totalCompleted = Object.keys(state.completedDrills).length;

  // Guest status: unauthenticated visitors are prompted to sign in for free practice
  const isTrialExhausted = !isAuthenticated;

  const activeStreak = useMemo(() => {
    return calculateActiveStreak(state.streakDays, state.lastActiveDate, totalCompleted);
  }, [state.streakDays, state.lastActiveDate, totalCompleted]);

  const totalPoints = useMemo(() => {
    return calculateTotalPoints(state.completedDrills);
  }, [state.completedDrills]);

  const isStreakEarnedToday = state.lastActiveDate === getTodayString();
  const visitorId = useMemo(() => learnerId || getOrCreateVisitorId(), [learnerId]);

  return {
    progress: state,
    streakDays: activeStreak,
    isStreakEarnedToday,
    totalPoints,
    completedDrills: state.completedDrills,
    totalCompleted,
    isAuthenticated,
    learnerId,
    visitorId,
    isSyncing,
    isTrialExhausted,
    isDrillCompleted,
    recordDrillCompletion,
    recordRapidFireSetCompletion,
    resetProgress,
    signInWithGoogle,
    signInWithGithub,
    signIn,
    signOut,
    eraseAllData,
  };
}
