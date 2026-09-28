import { describe, expect, it } from 'vitest';
import type {
  ArchitecturalDomain,
  DrillAttemptRecord,
  DrillDefinitionDTO,
} from '../types/drill.js';
import {
  getDailyDrillIndex,
  hashDateString,
  selectRecommendedDrill,
  selectRecommendedRapidFireSet,
} from './engine.js';

function mockDrill(
  id: string,
  domain: ArchitecturalDomain,
  domainLabel = domain,
): DrillDefinitionDTO {
  return {
    id,
    title: `Drill ${id}`,
    format: 'Rapid_Fire',
    domain,
    domainLabel,
    difficulty: 'Lead_CTA',
    pillars: ['Reliability'],
    steps: [],
    version: 1,
    status: 'published',
  };
}

const mockDrills: DrillDefinitionDTO[] = [
  mockDrill('D-1', 'Platform_Core'),
  mockDrill('D-2', 'Data_Architecture'),
  mockDrill('D-3', 'Platform_Core'),
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

  it('hard-filters by Architectural Domain when provided', () => {
    const today = '2026-09-27';
    const result = selectRecommendedDrill({
      drills: mockDrills,
      completedDrills: {},
      todayDateStr: today,
      format: 'Rapid_Fire',
      domain: 'Platform_Core',
    });

    expect(result).not.toBeNull();
    expect(result?.totalCount).toBe(2);
    expect(result?.drill.domain).toBe('Platform_Core');
  });

  it('returns null when Format ∩ Domain is empty', () => {
    const result = selectRecommendedDrill({
      drills: mockDrills,
      completedDrills: {},
      todayDateStr: '2026-09-27',
      format: 'Rapid_Fire',
      domain: 'Infrastructure',
    });

    expect(result).toBeNull();
  });

  it('does NOT suggest the same drill if visitor has already completed today drill', () => {
    const today = '2026-09-27';
    const dailyIdx = getDailyDrillIndex(today, mockDrills.length);
    const dailyDrill = mockDrills[dailyIdx];

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
        completedAt: '2026-09-20T10:00:00Z',
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

  describe('selectRecommendedRapidFireSet', () => {
    const sevenDrills: DrillDefinitionDTO[] = [
      mockDrill('RF-1', 'Platform_Core'),
      mockDrill('RF-2', 'Platform_Core'),
      mockDrill('RF-3', 'Platform_Core'),
      mockDrill('RF-4', 'Data_Architecture'),
      mockDrill('RF-5', 'Platform_Core'),
      mockDrill('RF-6', 'Platform_Core'),
      mockDrill('RF-7', 'Data_Architecture'),
    ];

    it('returns exactly 5 drills for Rapid Fire when pool has >= 5 drills', () => {
      const result = selectRecommendedRapidFireSet({
        drills: sevenDrills,
        completedDrills: {},
        todayDateStr: '2026-09-28',
      });

      expect(result).not.toBeNull();
      expect(result?.drills.length).toBe(5);
      const uniqueIds = new Set(result?.drills.map((d) => d.id));
      expect(uniqueIds.size).toBe(5);
    });

    it('includes today featured drill when uncompleted', () => {
      const today = '2026-09-28';
      const dailyIdx = getDailyDrillIndex(today, sevenDrills.length);
      const expectedDaily = sevenDrills[dailyIdx];

      const result = selectRecommendedRapidFireSet({
        drills: sevenDrills,
        completedDrills: {},
        todayDateStr: today,
        sessionSkipCount: 0,
      });

      expect(result).not.toBeNull();
      expect(result?.isDaily).toBe(true);
      expect(result?.drills.map((d) => d.id)).toContain(expectedDaily.id);
    });

    it('cycles candidate drills when pool has fewer than 5 drills', () => {
      const twoDrills = [
        mockDrill('D-A', 'Security_And_Access'),
        mockDrill('D-B', 'Security_And_Access'),
      ];

      const result = selectRecommendedRapidFireSet({
        drills: twoDrills,
        completedDrills: {},
        todayDateStr: '2026-09-28',
      });

      expect(result).not.toBeNull();
      expect(result?.drills.length).toBe(5);
      expect(result?.drills.map((d) => d.id)).toEqual(['D-B', 'D-A', 'D-B', 'D-A', 'D-B']);
    });

    it('fills remaining slots from review mode when uncompleted drills are fewer than 5', () => {
      const completed: Record<string, DrillAttemptRecord> = {
        'RF-1': {
          drillId: 'RF-1',
          format: 'Rapid_Fire',
          completedAt: '2026-09-20',
          score: 100,
          accuracy: 1,
          attemptsCount: 1,
        },
        'RF-2': {
          drillId: 'RF-2',
          format: 'Rapid_Fire',
          completedAt: '2026-09-21',
          score: 80,
          accuracy: 1,
          attemptsCount: 1,
        },
        'RF-3': {
          drillId: 'RF-3',
          format: 'Rapid_Fire',
          completedAt: '2026-09-22',
          score: 90,
          accuracy: 1,
          attemptsCount: 1,
        },
        'RF-4': {
          drillId: 'RF-4',
          format: 'Rapid_Fire',
          completedAt: '2026-09-23',
          score: 70,
          accuracy: 1,
          attemptsCount: 1,
        },
        'RF-5': {
          drillId: 'RF-5',
          format: 'Rapid_Fire',
          completedAt: '2026-09-24',
          score: 95,
          accuracy: 1,
          attemptsCount: 1,
        },
      };
      // RF-6 and RF-7 uncompleted (2 uncompleted)
      const result = selectRecommendedRapidFireSet({
        drills: sevenDrills,
        completedDrills: completed,
        todayDateStr: '2026-09-28',
      });

      expect(result).not.toBeNull();
      expect(result?.drills.length).toBe(5);
      const ids = result?.drills.map((d) => d.id);
      // Contains the 2 uncompleted drills
      expect(ids).toContain('RF-6');
      expect(ids).toContain('RF-7');
      // All 5 in the set are distinct
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('respects domain filtering', () => {
      const result = selectRecommendedRapidFireSet({
        drills: sevenDrills,
        completedDrills: {},
        todayDateStr: '2026-09-28',
        domain: 'Data_Architecture',
      });

      expect(result).not.toBeNull();
      expect(result?.drills.length).toBe(5);
      expect(result?.drills.every((d) => d.domain === 'Data_Architecture')).toBe(true);
    });

    it('advances to next set when sessionSkipCount increments', () => {
      const tenDrills: DrillDefinitionDTO[] = [
        mockDrill('RF-1', 'Platform_Core'),
        mockDrill('RF-2', 'Platform_Core'),
        mockDrill('RF-3', 'Platform_Core'),
        mockDrill('RF-4', 'Platform_Core'),
        mockDrill('RF-5', 'Platform_Core'),
        mockDrill('RF-6', 'Platform_Core'),
        mockDrill('RF-7', 'Platform_Core'),
        mockDrill('RF-8', 'Platform_Core'),
        mockDrill('RF-9', 'Platform_Core'),
        mockDrill('RF-10', 'Platform_Core'),
      ];

      const set0 = selectRecommendedRapidFireSet({
        drills: tenDrills,
        completedDrills: {},
        todayDateStr: '2026-09-28',
        sessionSkipCount: 0,
      });

      const set1 = selectRecommendedRapidFireSet({
        drills: tenDrills,
        completedDrills: {},
        todayDateStr: '2026-09-28',
        sessionSkipCount: 1,
      });

      expect(set0?.drills.length).toBe(5);
      expect(set1?.drills.length).toBe(5);
      const set0Ids = new Set(set0?.drills.map((d) => d.id));
      const set1Ids = new Set(set1?.drills.map((d) => d.id));
      for (const id of set1Ids) {
        expect(set0Ids.has(id)).toBe(false);
      }
    });
  });
});
