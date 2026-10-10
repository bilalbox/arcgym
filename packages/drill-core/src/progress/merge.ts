import type { DrillAttemptRecord, VisitorProgressState } from '../types/drill.js';
import { mergeDeferredRetestSlots } from './deferredRetest.js';
import { calculateActiveStreak, getLocalDateString } from './streak.js';

/**
 * Deterministic Two-Way Monotonic Merge for Learner Progress states.
 * Reconciles local and cloud attempts by taking the union of completed drills,
 * preserving maximum score and attemptsCount, and calculating active streak.
 * At most one Deferred Retest survives (earlier schedule wins; expired/completed cleared).
 */
export function mergeProgressStates(
  local: VisitorProgressState,
  cloud: VisitorProgressState,
  today: string = getLocalDateString(),
): VisitorProgressState {
  const mergedCompleted: Record<string, DrillAttemptRecord> = {};

  const localDrills = local.completedDrills || {};
  const cloudDrills = cloud.completedDrills || {};
  const allIds = new Set([...Object.keys(localDrills), ...Object.keys(cloudDrills)]);

  for (const id of allIds) {
    const localAttempt = localDrills[id];
    const cloudAttempt = cloudDrills[id];

    if (localAttempt && !cloudAttempt) {
      mergedCompleted[id] = localAttempt;
    } else if (!localAttempt && cloudAttempt) {
      mergedCompleted[id] = cloudAttempt;
    } else if (localAttempt && cloudAttempt) {
      const localTime = new Date(localAttempt.completedAt).getTime() || 0;
      const cloudTime = new Date(cloudAttempt.completedAt).getTime() || 0;
      const base = localTime >= cloudTime ? localAttempt : cloudAttempt;

      mergedCompleted[id] = {
        ...base,
        score: Math.max(localAttempt.score, cloudAttempt.score),
        accuracy: Math.max(localAttempt.accuracy, cloudAttempt.accuracy),
        attemptsCount: Math.max(localAttempt.attemptsCount, cloudAttempt.attemptsCount),
      };
    }
  }

  // Derive latest active date
  const candidateDates = [local.lastActiveDate, cloud.lastActiveDate].filter(
    (d): d is string => typeof d === 'string' && d.length >= 10,
  );

  for (const attempt of Object.values(mergedCompleted)) {
    if (attempt.completedAt && attempt.completedAt.length >= 10) {
      candidateDates.push(attempt.completedAt.slice(0, 10));
    }
  }

  candidateDates.sort();
  const latestActive = candidateDates.length > 0 ? candidateDates[candidateDates.length - 1] : '';

  // Determine active streaks
  const localActive = calculateActiveStreak(
    local.streakDays,
    local.lastActiveDate,
    Object.keys(localDrills).length,
    today,
  );
  const cloudActive = calculateActiveStreak(
    cloud.streakDays,
    cloud.lastActiveDate,
    Object.keys(cloudDrills).length,
    today,
  );

  const mergedStreak = Math.max(localActive, cloudActive);
  const deferredRetest = mergeDeferredRetestSlots(
    local.deferredRetest,
    cloud.deferredRetest,
    today,
    mergedCompleted,
  );

  return {
    version: 1,
    streakDays: mergedStreak,
    lastActiveDate: latestActive,
    completedDrills: mergedCompleted,
    ...(deferredRetest ? { deferredRetest } : {}),
  };
}
