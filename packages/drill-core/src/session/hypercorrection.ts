import type { ConfidenceAnchor } from '../types/drill.js';

/**
 * High-confidence wrong commits enter Hypercorrection Intercept (85% / 95%).
 * Shared by the Rapid Fire session reducer and Deferred Retest scheduling.
 */
export function isHypercorrectionEligible(
  confidence: ConfidenceAnchor | number,
  isCorrect: boolean,
): boolean {
  return !isCorrect && confidence >= 0.85;
}
