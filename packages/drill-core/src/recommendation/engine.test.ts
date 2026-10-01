import { describe, expect, it } from 'vitest';
import type {
  ArchitecturalDomain,
  DrillAttemptRecord,
  DrillDefinitionDTO,
} from '../types/drill.js';
import { getDailyDrillIndex, hashDateString, selectRecommendedRound } from './engine.js';

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

describe('Recommendation Engine (selectRecommendedRound)', () => {
  it('hashDateString is deterministic for the same date', () => {
    const h1 = hashDateString('2026-09-27');
    const h2 = hashDateString('2026-09-27');
    const h3 = hashDateString('2026-09-28');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  const sevenDrills: DrillDefinitionDTO[] = [
    mockDrill('RF-1', 'Platform_Core'),
    mockDrill('RF-2', 'Platform_Core'),
    mockDrill('RF-3', 'Platform_Core'),
    mockDrill('RF-4', 'Data_Architecture'),
    mockDrill('RF-5', 'Platform_Core'),
    mockDrill('RF-6', 'Platform_Core'),
    mockDrill('RF-7', 'Data_Architecture'),
  ];

  it('returns exactly 3 drills for a round when pool has >= 3 drills', () => {
    const result = selectRecommendedRound({
      drills: sevenDrills,
      completedDrills: {},
      todayDateStr: '2026-09-28',
    });

    expect(result).not.toBeNull();
    expect(result?.drills.length).toBe(3);
    const uniqueIds = new Set(result?.drills.map((d) => d.id));
    expect(uniqueIds.size).toBe(3);
    expect(result?.reason).toBe('daily');
    expect(result?.uncompletedCount).toBe(7);
    expect(result?.totalCount).toBe(7);
  });

  it('includes today featured drill when uncompleted', () => {
    const today = '2026-09-28';
    const dailyIdx = getDailyDrillIndex(today, sevenDrills.length);
    const expectedDaily = sevenDrills[dailyIdx];

    const result = selectRecommendedRound({
      drills: sevenDrills,
      completedDrills: {},
      todayDateStr: today,
      sessionSkipCount: 0,
    });

    expect(result).not.toBeNull();
    expect(result?.isDaily).toBe(true);
    expect(result?.drills.map((d) => d.id)).toContain(expectedDaily.id);
  });

  it('hard-filters by Architectural Domain when provided', () => {
    const result = selectRecommendedRound({
      drills: sevenDrills,
      completedDrills: {},
      todayDateStr: '2026-09-28',
      domain: 'Data_Architecture',
    });

    expect(result).not.toBeNull();
    expect(result?.totalCount).toBe(2);
    expect(result?.drills.length).toBe(3);
    expect(result?.drills.every((d) => d.domain === 'Data_Architecture')).toBe(true);
  });

  it('returns null when domain is empty', () => {
    const result = selectRecommendedRound({
      drills: sevenDrills,
      completedDrills: {},
      todayDateStr: '2026-09-28',
      domain: 'Infrastructure',
    });

    expect(result).toBeNull();
  });

  it('cycles candidate drills when domain pool has fewer than 3 drills', () => {
    const twoDrills = [
      mockDrill('D-A', 'Security_And_Access'),
      mockDrill('D-B', 'Security_And_Access'),
    ];

    const result = selectRecommendedRound({
      drills: twoDrills,
      completedDrills: {},
      todayDateStr: '2026-09-28',
    });

    expect(result).not.toBeNull();
    expect(result?.drills.length).toBe(3);
    expect(result?.drills.map((d) => d.id)).toEqual(['D-B', 'D-A', 'D-B']);
  });

  it('fills remaining slots from review mode when uncompleted drills are fewer than 3', () => {
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

    const result = selectRecommendedRound({
      drills: sevenDrills,
      completedDrills: completed,
      todayDateStr: '2026-09-28',
    });

    expect(result).not.toBeNull();
    expect(result?.drills.length).toBe(3);
    const ids = result?.drills.map((d) => d.id);
    expect(ids).toContain('RF-6');
    expect(ids).toContain('RF-7');
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
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

    const set0 = selectRecommendedRound({
      drills: tenDrills,
      completedDrills: {},
      todayDateStr: '2026-09-28',
      sessionSkipCount: 0,
    });

    const set1 = selectRecommendedRound({
      drills: tenDrills,
      completedDrills: {},
      todayDateStr: '2026-09-28',
      sessionSkipCount: 1,
    });

    expect(set0?.drills.length).toBe(3);
    expect(set1?.drills.length).toBe(3);
    const set0Ids = new Set(set0?.drills.map((d) => d.id));
    const set1Ids = new Set(set1?.drills.map((d) => d.id));
    for (const id of set1Ids) {
      expect(set0Ids.has(id)).toBe(false);
    }
  });
});
