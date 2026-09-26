/**
 * Result of checking whether to yield to the main thread
 */

// Track the time of last yield for scheduler batching
let timeOfLastYield = 0;

/**
 * Reset the internal yield tracking state. Used primarily for testing.
 * @internal
 */
export function resetYieldTracking() {
  timeOfLastYield = 0;
}

/**
 * Yields control to the main thread if enough time has elapsed since the last yield.
 * This automatically tracks yield timing internally to break up long-running tasks
 * into batches, improving responsiveness without requiring manual state management.
 *
 * @returns Promise that resolves after yielding (if necessary) to the main thread
 */
export async function yieldIfNecessary() {
  const result = checkShouldYield(timeOfLastYield);
  if (result.shouldYield) {
    timeOfLastYield = result.timeOfLastYield;
    await yieldToMainThread();
  }
}

/**
 * Checks if the current execution should yield to the main thread based on elapsed time.
 * Break up long-running tasks into timed batches to improve responsiveness.
 * Borrowed from https://tinyurl.com/5b4fw7eb
 *
 * @param timeOfLastYield - Timestamp of the last yield (from performance.now())
 * @returns Object containing whether to yield and the updated timestamp
 */
function checkShouldYield(timeOfLastYield) {
  // eslint-disable-next-line lwr/no-unguarded-apis
  if (!globalThis.performance || !getSSREnabled()) {
    return {
      shouldYield: false,
      timeOfLastYield
    };
  }
  const TASK_BATCH_DURATION = 50;
  // eslint-disable-next-line lwr/no-unguarded-apis
  const now = globalThis.performance.now();
  if (now - timeOfLastYield > TASK_BATCH_DURATION) {
    return {
      shouldYield: true,
      timeOfLastYield: now
    };
  }
  return {
    shouldYield: false,
    timeOfLastYield
  };
}

/**
 * Yields control to the main thread during long-running tasks to improve responsiveness.
 * Uses the scheduler.yield() API if available, otherwise falls back to setTimeout.
 *
 * @returns Promise that resolves after yielding to the main thread
 */
async function yieldToMainThread() {
  const scheduler = globalThis.scheduler;
  // eslint-disable-next-line lwr/no-unguarded-apis
  return scheduler?.yield ? scheduler.yield() : new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Gets the SSREnabled flag from the global LWR environment
 *
 * @returns Whether SSR is enabled
 */
function getSSREnabled() {
  const globalThisLWR = globalThis;
  const {
    SSREnabled
  } = globalThisLWR.LWR && globalThisLWR.LWR.env || {};
  return !!SSREnabled;
}