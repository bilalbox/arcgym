import { describe, it, expect } from 'vitest';
import {
  hashDateString,
  getDailyDrillIndex,
  selectRecommendedDrill,
} from './engine.js';
import { DrillDefinitionDTO, DrillAttemptRecord } from '../types/drill.js';

const mockDrills: DrillDefinitionDTO[] = [
  {
    id: 'D-1',
    title: 'Drill 1',
    format: 'Rapid_Fire',
    domain: 'Domain A',
    difficulty: 'Lead_CTA',
    pillars: ['Reliability'],
    steps: [],
    version: 1,
  },
  {
    id: 'D-2',
    title: 'Drill 2',
    format: 'Rapid_Fire',
    domain: 'Domain B',
    difficulty: 'Lead_CTA',
    pillars: ['Trust'],
    steps: [],
    version: 1,
  },
  {
    id: 'D-3',
    title: 'Drill 3',
    format: 'Rapid_Fire',
    domain: 'Domain C',
    difficulty: 'Lead_CTA',
    pillars: ['Operational_Excellence'],
    steps: [],
    version: 1,
  },
];

describe('Recommendation Engine', () => {
  it('hashDateString is deterministic for the same date', () => {
    const h1 = hashDateString('2026-09-27');
    const h2 = hashDateString('2026-09-27');
    const h3 = hashDateString('2026-09-28');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('selects daily drill when today is uncompleted', () => {
    const today = '2026-09-27';
    const dailyIdx = getDailyDrillIndex(today, mockDrills.length);
    const expectedDailyDrill = mockDrills[dailyIdx];

    const result = selectRecommendedDrill({
      drills: mockDrills,
      completedDrills: {},
      todayDateStr: today,
      format: 'Rapid_Fire',
    });

    expect(result).not.toBeNull();
    expect(result?.drill.id).toBe(expectedDailyDrill.id);
    expect(result?.reason).toBe('daily');
    expect(result?.isDaily).toBe(true);
    expect(result?.uncompletedCount).toBe(3);
    expect(result?.completionPercentage).toBe(0);
  });

  it('does NOT suggest the same drill if visitor has already completed today drill', () => {
    const today = '2026-09-27';
    const dailyIdx = getDailyDrillIndex(today, mockDrills.length);
    const dailyDrill = mockDrills[dailyIdx];

    // Mark daily drill as completed
    const completed: Record<string, DrillAttemptRecord> = {
      [dailyDrill.id]: {
        drillId: dailyDrill.id,
        format: 'Rapid_Fire',
        completedAt: '2026-09-27T08:00:00Z',
        score: 90,
        accuracy: 1.0,
        attemptsCount: 1,
      },
    };

    const result = selectRecommendedDrill({
      drills: mockDrills,
      completedDrills: completed,
      todayDateStr: today,
      format: 'Rapid_Fire',
    });

    expect(result).not.toBeNull();
    // Must NOT be the daily drill
    expect(result?.drill.id).not.toBe(dailyDrill.id);
    expect(result?.reason).toBe('next_uncompleted');
    expect(result?.isDaily).toBe(false);
    expect(result?.uncompletedCount).toBe(2);
    expect(result?.completionPercentage).toBe(33);
  });

  it('enters review mode when all drills in the format are completed', () => {
    const today = '2026-09-27';
    const completed: Record<string, DrillAttemptRecord> = {
      'D-1': {
        drillId: 'D-1',
        format: 'Rapid_Fire',
        completedAt: '2026-09-20T10:00:00Z', // oldest
        score: 70,
        accuracy: 0.6,
        attemptsCount: 1,
      },
      'D-2': {
        drillId: 'D-2',
        format: 'Rapid_Fire',
        completedAt: '2026-09-25T10:00:00Z',
        score: 95,
        accuracy: 1.0,
        attemptsCount: 1,
      },
      'D-3': {
        drillId: 'D-3',
        format: 'Rapid_Fire',
        completedAt: '2026-09-26T10:00:00Z',
        score: 85,
        accuracy: 0.8,
        attemptsCount: 1,
      },
    };

    const result = selectRecommendedDrill({
      drills: mockDrills,
      completedDrills: completed,
      todayDateStr: today,
      format: 'Rapid_Fire',
    });

    expect(result).not.toBeNull();
    expect(result?.reason).toBe('review');
    expect(result?.uncompletedCount).toBe(0);
    expect(result?.completionPercentage).toBe(100);
    // Oldest completed is D-1
    expect(result?.drill.id).toBe('D-1');
    expect(result?.previousAttempt?.score).toBe(70);
  });

  it('cycles to the next uncompleted drill when sessionSkipCount is provided', () => {
    const today = '2026-09-27';
    const result0 = selectRecommendedDrill({
      drills: mockDrills,
      completedDrills: {},
      todayDateStr: today,
      format: 'Rapid_Fire',
      sessionSkipCount: 0,
    });
    const result1 = selectRecommendedDrill({
      drills: mockDrills,
      completedDrills: {},
      todayDateStr: today,
      format: 'Rapid_Fire',
      sessionSkipCount: 1,
    });

    expect(result0?.drill.id).not.toBe(result1?.drill.id);
  });
});
