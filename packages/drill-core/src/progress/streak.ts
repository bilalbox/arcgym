import type { DrillAttemptRecord } from '../types/drill.js';

/**
 * Returns a YYYY-MM-DD string representation of a date in local calendar time.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayString(): string {
  return getLocalDateString(new Date());
}

export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

/**
 * Default number of architectural decision reps per Rapid Fire drill.
 */
export const RAPID_FIRE_REPS_PER_DRILL = 5;

/**
 * Determines whether the user has completed all required reps in a Rapid Fire drill
 * to achieve or maintain that day's practice streak.
 */
export function isRapidFireStreakRequirementMet(
  completedRepsCount: number,
  requiredReps: number = RAPID_FIRE_REPS_PER_DRILL,
): boolean {
  return completedRepsCount >= requiredReps;
}

/**
 * Computes the new streak value after a drill is completed.
 * - If this is the user's first drill: streak becomes 1.
 * - If the user already completed a drill today: streak remains unchanged.
 * - If the user last completed a drill yesterday: streak increments by 1.
 * - If more than one day has elapsed since the last drill: streak resets to 1.
 */
export function computeNewStreak(
  currentStreak: number,
  lastActiveDate: string | undefined,
  today: string = getTodayString(),
  yesterday: string = getYesterdayString(),
): number {
  if (!lastActiveDate) {
    return 1;
  }
  if (lastActiveDate === today) {
    return Math.max(1, currentStreak);
  }
  if (lastActiveDate === yesterday) {
    return Math.max(1, currentStreak) + 1;
  }
  // Missed more than 1 day
  return 1;
}

/**
 * Determines whether a previously achieved streak is currently active.
 * - If no drills have been completed or streakDays <= 0: returns 0.
 * - If last active date is today or yesterday: returns the active streak count.
 * - If more than one day has elapsed without activity: streak has broken (returns 0).
 */
export function calculateActiveStreak(
  streakDays: number,
  lastActiveDate: string | undefined,
  completedCount: number,
  today: string = getTodayString(),
  yesterday: string = getYesterdayString(),
): number {
  if (completedCount === 0 || !lastActiveDate || streakDays <= 0) {
    return 0;
  }
  if (lastActiveDate === today || lastActiveDate === yesterday) {
    return streakDays;
  }
  return 0;
}

/**
 * Calculates total points achieved across all completed drills.
 */
export function calculateTotalPoints(
  completedDrills: Record<string, Pick<DrillAttemptRecord, 'score'>>,
): number {
  return Object.values(completedDrills).reduce((total, attempt) => {
    return total + (attempt.score || 0);
  }, 0);
}
