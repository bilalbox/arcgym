import { describe, expect, it } from 'vitest';
import type { VisitorProgressState } from '../types/drill.js';
import { parseProgressDocument, serializeProgressDocument } from './document.js';

describe('progress document (D1 hybrid JSON)', () => {
  it('round-trips Deferred Retest with completed drills', () => {
    const state: VisitorProgressState = {
      version: 1,
      streakDays: 1,
      lastActiveDate: '2026-10-01',
      completedDrills: {
        'AGD-00201': {
          drillId: 'AGD-00201',
          format: 'Rapid_Fire',
          completedAt: '2026-10-01T12:00:00.000Z',
          score: -20,
          accuracy: 0,
          attemptsCount: 1,
        },
      },
      deferredRetest: {
        drillId: 'AGD-00204',
        sourceDrillId: 'AGD-00201',
        contrastSetId: 'CS-zero-copy-vs-copy',
        scheduledOn: '2026-10-01',
        dueFrom: '2026-10-03',
        dueUntil: '2026-10-06',
      },
    };

    const parsed = parseProgressDocument(serializeProgressDocument(state));
    expect(parsed.completedDrills['AGD-00201'].score).toBe(-20);
    expect(parsed.deferredRetest?.drillId).toBe('AGD-00204');
  });

  it('reads legacy bare completedDrills maps', () => {
    const legacy = JSON.stringify({
      'drill-a': {
        drillId: 'drill-a',
        format: 'Rapid_Fire',
        completedAt: '2026-10-01T00:00:00.000Z',
        score: 10,
        accuracy: 1,
        attemptsCount: 1,
      },
    });
    const parsed = parseProgressDocument(legacy);
    expect(parsed.completedDrills['drill-a'].score).toBe(10);
    expect(parsed.deferredRetest).toBeUndefined();
  });
});
