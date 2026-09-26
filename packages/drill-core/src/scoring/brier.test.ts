import { describe, it, expect } from 'vitest';
import { ArcGymScoringEngine } from './brier.js';

describe('ArcGymScoringEngine', () => {
  it('awards high points for high conviction correct answers', () => {
    const result = ArcGymScoringEngine.calculateDecisionScore(0.95, true);
    expect(result.pointsAwarded).toBe(100); // 100 * (1 - 0.0025) = ~100
    expect(result.quadrant).toBe('Calibrated_Conviction');
    expect(result.overconfidencePenaltyApplied).toBe(false);
  });

  it('severely penalizes high confidence errors with 2.5x multiplier', () => {
    const result = ArcGymScoringEngine.calculateDecisionScore(0.95, false);
    // loss = 2.5 * 0.95^2 = 2.5 * 0.9025 = 2.25625
    // points = 100 * (1 - 2.25625) = -126
    expect(result.pointsAwarded).toBeLessThan(0);
    expect(result.pointsAwarded).toBe(-126);
    expect(result.quadrant).toBe('Hazardous_Assumption');
    expect(result.overconfidencePenaltyApplied).toBe(true);
  });

  it('rewards humble uncertainty even when wrong', () => {
    const result = ArcGymScoringEngine.calculateDecisionScore(0.50, false);
    // loss = 2.5 * 0.25 = 0.625
    // points = 100 * (1 - 0.625) = +38
    expect(result.pointsAwarded).toBe(38);
    expect(result.quadrant).toBe('Calibrated_Humility');
    expect(result.overconfidencePenaltyApplied).toBe(false);
  });

  it('calculates ECE and JCI correctly', () => {
    const predictions = [
      { confidence: 0.85, isCorrect: true },
      { confidence: 0.85, isCorrect: true },
      { confidence: 0.85, isCorrect: false },
      { confidence: 0.50, isCorrect: true }
    ];
    const ece = ArcGymScoringEngine.calculateECE(predictions);
    expect(ece).toBeGreaterThanOrEqual(0);
    const jci = ArcGymScoringEngine.calculateJCI(ece);
    expect(jci).toBeGreaterThan(0);
    expect(jci).toBeLessThanOrEqual(1000);
  });
});
