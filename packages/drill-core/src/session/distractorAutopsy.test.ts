import { describe, expect, it } from 'vitest';
import type { DrillOptionDTO } from '../types/drill.js';
import { buildDistractorAutopsy } from './distractorAutopsy.js';

const options: DrillOptionDTO[] = [
  {
    id: 'opt_wrong',
    label: 'Wrong Approach',
    isCorrect: false,
    distractorAntipattern: 'Synchronous Antipattern',
    rationale: 'Fails under load',
  },
  {
    id: 'opt_wrong_b',
    label: 'Another Wrong Approach',
    isCorrect: false,
    distractorAntipattern: 'Polling Antipattern',
    rationale: 'Burns API limits',
  },
  {
    id: 'opt_correct',
    label: 'Optimal Pattern',
    isCorrect: true,
    rationale: 'Follows Well-Architected guidance',
  },
];

describe('buildDistractorAutopsy', () => {
  it('builds chips from wrong-option rationales and prefers the picked distractor as focus', () => {
    const autopsy = buildDistractorAutopsy(options, 'opt_wrong_b');

    expect(autopsy).toEqual({
      focusOptionId: 'opt_wrong_b',
      focusAntipattern: 'Polling Antipattern',
      chips: [
        {
          optionId: 'opt_wrong',
          distractorAntipattern: 'Synchronous Antipattern',
          rationale: 'Fails under load',
        },
        {
          optionId: 'opt_wrong_b',
          distractorAntipattern: 'Polling Antipattern',
          rationale: 'Burns API limits',
        },
      ],
    });
  });

  it('falls back to the first wrong option when preference is missing or correct', () => {
    expect(buildDistractorAutopsy(options, 'opt_correct')?.focusOptionId).toBe('opt_wrong');
    expect(buildDistractorAutopsy(options, null)?.focusOptionId).toBe('opt_wrong');
  });

  it('returns null when no wrong-option rationales exist', () => {
    expect(
      buildDistractorAutopsy(
        [{ id: 'c', label: 'Only correct', isCorrect: true, rationale: 'ok' }],
        null,
      ),
    ).toBeNull();
  });
});
