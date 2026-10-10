import { describe, expect, it } from 'vitest';
import type {
  DrillAttemptRecord,
  RapidFireDrillDefinition,
  VisitorProgressState,
} from '../types/drill.js';
import {
  applyDeferredRetestAfterRound,
  injectDeferredRetestIntoRound,
  isDeferredRetestDue,
} from './deferredRetest.js';
import { mergeProgressStates } from './merge.js';

const PRINCIPLE =
  'The deciding variable was whether live federation meets freshness without copying into CRM storage.';

function emptyProgress(): VisitorProgressState {
  return {
    version: 1,
    streakDays: 0,
    lastActiveDate: '',
    completedDrills: {},
  };
}

function rf(
  id: string,
  contrast?: { contrastSetId: string; contrastPrinciple: string },
): RapidFireDrillDefinition {
  return {
    id,
    title: `Drill ${id}`,
    format: 'Rapid_Fire',
    domain: 'Data_Architecture',
    domainLabel: 'Data Architecture',
    difficulty: 'Lead_CTA',
    pillars: ['Reliability'],
    steps: [],
    version: 1,
    status: 'published',
    ...(contrast
      ? { contrastSetId: contrast.contrastSetId, contrastPrinciple: contrast.contrastPrinciple }
      : {}),
  };
}

function hypercorrectionAttempt(drillId: string): DrillAttemptRecord {
  return {
    drillId,
    format: 'Rapid_Fire',
    completedAt: '2026-10-01T12:00:00.000Z',
    score: -20,
    accuracy: 0,
    attemptsCount: 1,
    steps: [{ stepId: 's1', confidence: 0.85, isCorrect: false, score: -20 }],
  };
}

function correctAttempt(drillId: string): DrillAttemptRecord {
  return {
    drillId,
    format: 'Rapid_Fire',
    completedAt: '2026-10-01T12:00:00.000Z',
    score: 90,
    accuracy: 1,
    attemptsCount: 1,
    steps: [{ stepId: 's1', confidence: 0.85, isCorrect: true, score: 90 }],
  };
}

const catalog = [
  rf('AGD-00201', { contrastSetId: 'CS-zero-copy-vs-copy', contrastPrinciple: PRINCIPLE }),
  rf('AGD-00204', { contrastSetId: 'CS-zero-copy-vs-copy', contrastPrinciple: PRINCIPLE }),
  rf('AGD-00806', { contrastSetId: 'CS-zero-copy-vs-copy', contrastPrinciple: PRINCIPLE }),
  rf('RF-lone'),
];

describe('Deferred Retest', () => {
  describe('enqueue after hypercorrection', () => {
    it('schedules one Deferred Retest against a Contrast Set sibling (different stem)', () => {
      const next = applyDeferredRetestAfterRound(emptyProgress(), {
        attempts: [hypercorrectionAttempt('AGD-00201')],
        catalog,
        todayDateStr: '2026-10-01',
      });

      expect(next.deferredRetest).toEqual({
        drillId: 'AGD-00204',
        sourceDrillId: 'AGD-00201',
        contrastSetId: 'CS-zero-copy-vs-copy',
        scheduledOn: '2026-10-01',
        dueFrom: '2026-10-03',
        dueUntil: '2026-10-06',
      });
      expect(next.deferredRetest?.drillId).not.toBe('AGD-00201');
    });

    it('does not schedule when no sibling Contrast Set member exists', () => {
      const next = applyDeferredRetestAfterRound(emptyProgress(), {
        attempts: [hypercorrectionAttempt('RF-lone')],
        catalog,
        todayDateStr: '2026-10-01',
      });
      expect(next.deferredRetest).toBeUndefined();
    });

    it('does not schedule a second outstanding Deferred Retest', () => {
      const withOne = applyDeferredRetestAfterRound(emptyProgress(), {
        attempts: [hypercorrectionAttempt('AGD-00201')],
        catalog,
        todayDateStr: '2026-10-01',
      });

      const again = applyDeferredRetestAfterRound(withOne, {
        attempts: [hypercorrectionAttempt('AGD-00806')],
        catalog,
        todayDateStr: '2026-10-02',
      });

      expect(again.deferredRetest?.sourceDrillId).toBe('AGD-00201');
      expect(again.deferredRetest?.drillId).toBe('AGD-00204');
    });

    it('ignores high-confidence correct commits', () => {
      const next = applyDeferredRetestAfterRound(emptyProgress(), {
        attempts: [correctAttempt('AGD-00201')],
        catalog,
        todayDateStr: '2026-10-01',
      });
      expect(next.deferredRetest).toBeUndefined();
    });
  });

  describe('due window and injection', () => {
    it('is due only inside the 2–5 day window', () => {
      const slot = {
        drillId: 'AGD-00204',
        sourceDrillId: 'AGD-00201',
        contrastSetId: 'CS-zero-copy-vs-copy',
        scheduledOn: '2026-10-01',
        dueFrom: '2026-10-03',
        dueUntil: '2026-10-06',
      };
      expect(isDeferredRetestDue(slot, '2026-10-02')).toBe(false);
      expect(isDeferredRetestDue(slot, '2026-10-03')).toBe(true);
      expect(isDeferredRetestDue(slot, '2026-10-06')).toBe(true);
      expect(isDeferredRetestDue(slot, '2026-10-07')).toBe(false);
    });

    it('injects at most one due Deferred Retest slot into a Rapid Fire round', () => {
      const progress = applyDeferredRetestAfterRound(emptyProgress(), {
        attempts: [hypercorrectionAttempt('AGD-00201')],
        catalog,
        todayDateStr: '2026-10-01',
      });

      const baseRound = [rf('RF-1'), rf('RF-2'), rf('RF-3')];

      const injected = injectDeferredRetestIntoRound({
        drills: baseRound,
        deferredRetest: progress.deferredRetest,
        catalog,
        todayDateStr: '2026-10-04',
      });

      expect(injected.filter((d) => d.id === 'AGD-00204')).toHaveLength(1);
      expect(injected).toHaveLength(3);
      expect(injected[0].id).toBe('AGD-00204');
      expect(injected.map((d) => d.id)).toContain('RF-2');
      expect(injected.map((d) => d.id)).toContain('RF-3');
    });

    it('does not inject before the due window', () => {
      const progress = applyDeferredRetestAfterRound(emptyProgress(), {
        attempts: [hypercorrectionAttempt('AGD-00201')],
        catalog,
        todayDateStr: '2026-10-01',
      });

      const injected = injectDeferredRetestIntoRound({
        drills: [rf('RF-1'), rf('RF-2'), rf('RF-3')],
        deferredRetest: progress.deferredRetest,
        catalog,
        todayDateStr: '2026-10-02',
      });

      expect(injected.map((d) => d.id)).toEqual(['RF-1', 'RF-2', 'RF-3']);
    });
  });

  describe('clear on complete or expire', () => {
    it('clears the outstanding slot when the retest drill is completed', () => {
      const scheduled = applyDeferredRetestAfterRound(emptyProgress(), {
        attempts: [hypercorrectionAttempt('AGD-00201')],
        catalog,
        todayDateStr: '2026-10-01',
      });

      const cleared = applyDeferredRetestAfterRound(scheduled, {
        attempts: [correctAttempt('AGD-00204')],
        catalog,
        todayDateStr: '2026-10-04',
      });

      expect(cleared.deferredRetest).toBeUndefined();
    });

    it('expires the outstanding slot after the due window without building a queue', () => {
      const scheduled = applyDeferredRetestAfterRound(emptyProgress(), {
        attempts: [hypercorrectionAttempt('AGD-00201')],
        catalog,
        todayDateStr: '2026-10-01',
      });

      const expired = applyDeferredRetestAfterRound(scheduled, {
        attempts: [correctAttempt('RF-lone')],
        catalog,
        todayDateStr: '2026-10-07',
      });

      expect(expired.deferredRetest).toBeUndefined();
    });
  });

  describe('survives progress merge', () => {
    it('keeps one outstanding Deferred Retest across local/cloud merge', () => {
      const local = applyDeferredRetestAfterRound(emptyProgress(), {
        attempts: [hypercorrectionAttempt('AGD-00201')],
        catalog,
        todayDateStr: '2026-10-01',
      });
      local.streakDays = 1;
      local.lastActiveDate = '2026-10-01';
      local.completedDrills = {
        'AGD-00201': hypercorrectionAttempt('AGD-00201'),
      };

      const cloud: VisitorProgressState = {
        version: 1,
        streakDays: 2,
        lastActiveDate: '2026-10-02',
        completedDrills: {
          'RF-lone': correctAttempt('RF-lone'),
        },
      };

      const merged = mergeProgressStates(local, cloud, '2026-10-02');
      expect(merged.deferredRetest?.drillId).toBe('AGD-00204');
      expect(merged.completedDrills['AGD-00201']).toBeDefined();
      expect(merged.completedDrills['RF-lone']).toBeDefined();
    });
  });
});
