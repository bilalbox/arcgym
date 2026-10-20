import { describe, expect, it } from 'vitest';
import type { VisitorProgressState } from '../types/drill.js';
import { parseProgressDocument, serializeProgressDocument } from './document.js';

describe('progress document (D1 hybrid JSON)', () => {
  it('round-trips state with completed drills', () => {
    const state: VisitorProgressState = {
      version: 1,
      streakDays: 1,
      lastActiveDate: '2026-10-01',
      completedDrills: {
        'AGD-00403': {
          drillId: 'AGD-00403',
          format: 'Case_File',
          completedAt: '2026-10-01T12:00:00.000Z',
          score: 120,
          accuracy: 1,
          attemptsCount: 1,
        },
      },
    };

    const parsed = parseProgressDocument(serializeProgressDocument(state));
    expect(parsed.completedDrills['AGD-00403'].score).toBe(120);
    expect(parsed.completedDrills['AGD-00403'].format).toBe('Case_File');
  });

  it('reads legacy bare completedDrills maps', () => {
    const legacy = JSON.stringify({
      'AGD-01001': {
        drillId: 'AGD-01001',
        format: 'Troubleshooting',
        completedAt: '2026-10-01T00:00:00.000Z',
        score: 10,
        accuracy: 1,
        attemptsCount: 1,
      },
    });
    const parsed = parseProgressDocument(legacy);
    expect(parsed.completedDrills['AGD-01001'].score).toBe(10);
  });
});
