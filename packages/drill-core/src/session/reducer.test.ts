import { describe, expect, it } from 'vitest';
import type { RapidFireDrillDefinition } from '../types/drill.js';
import {
  createPracticeSessionState,
  getCurrentRep,
  getRoundCompletionResult,
  practiceSessionReducer,
} from './reducer.js';

function createMockDrill(id: string): RapidFireDrillDefinition {
  return {
    id,
    title: `Mock Drill ${id}`,
    format: 'Rapid_Fire',
    domain: 'Platform_Core',
    domainLabel: 'Platform Core',
    difficulty: 'Lead_CTA',
    pillars: ['Reliability'],
    version: 1,
    status: 'published',
    steps: [
      {
        id: `${id}_s1`,
        prompt: `Question prompt for ${id}`,
        options: [
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
        ],
      },
    ],
  };
}

describe('PracticeSession Reducer', () => {
  it('initializes session state correctly for a 3-drill round', () => {
    const drills = [createMockDrill('D1'), createMockDrill('D2'), createMockDrill('D3')];
    const state = createPracticeSessionState(drills);

    expect(state.reps.length).toBe(3);
    expect(state.currentRepIndex).toBe(0);
    expect(state.isCompleted).toBe(false);
    expect(state.totalScore).toBe(0);
    expect(state.accuracy).toBe(0);
    expect(state.attempts.length).toBe(0);

    const currentRep = getCurrentRep(state);
    expect(currentRep?.drill.id).toBe('D1');
    expect(currentRep?.isSubmitted).toBe(false);
  });

  it('handles option selection and rejects changes after confidence commitment', () => {
    const drills = [createMockDrill('D1')];
    let state = createPracticeSessionState(drills);

    state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_wrong' });
    expect(getCurrentRep(state)?.selectedOptionId).toBe('opt_wrong');

    // Switch selection before commit
    state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_correct' });
    expect(getCurrentRep(state)?.selectedOptionId).toBe('opt_correct');

    // Commit confidence
    state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.85 });
    expect(getCurrentRep(state)?.isSubmitted).toBe(true);
    expect(getCurrentRep(state)?.isCorrect).toBe(true);
    expect(getCurrentRep(state)?.score).toBeGreaterThan(0);
    expect(getCurrentRep(state)?.quadrant).toBe('Calibrated_Conviction');

    // Attempting to change option after submit does nothing
    state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_wrong' });
    expect(getCurrentRep(state)?.selectedOptionId).toBe('opt_correct');
  });

  it('correctly maps distractor antipattern and overconfidence on incorrect choices', () => {
    const drills = [createMockDrill('D1')];
    let state = createPracticeSessionState(drills);

    state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_wrong' });
    state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.95 });

    const rep = getCurrentRep(state);
    expect(rep?.isCorrect).toBe(false);
    expect(rep?.distractorAntipattern).toBe('Synchronous Antipattern');
    expect(rep?.quadrant).toBe('Hazardous_Assumption');
  });

  it('runs a complete 5-rep practice round through to completion and telemetry synthesis', () => {
    const drills = [
      createMockDrill('D1'),
      createMockDrill('D2'),
      createMockDrill('D3'),
      createMockDrill('D4'),
      createMockDrill('D5'),
    ];
    let state = createPracticeSessionState(drills);

    for (let i = 0; i < 5; i++) {
      state = practiceSessionReducer(state, {
        type: 'SELECT_OPTION',
        optionId: i % 2 === 0 ? 'opt_correct' : 'opt_wrong',
      });
      state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.8 });
      state = practiceSessionReducer(state, { type: 'ADVANCE_REP' });
    }

    // Round should now be completed
    expect(state.isCompleted).toBe(true);
    expect(state.attempts.length).toBe(5);

    const completion = getRoundCompletionResult(state);
    expect(completion).not.toBeNull();
    expect(completion?.isStreakEligible).toBe(true);
    expect(completion?.repsCount).toBe(5);
    expect(completion?.attempts[0].drillId).toBe('D1');
    expect(completion?.attempts[4].drillId).toBe('D5');
  });

  it('supports 1-rep solo drill sessions without awarding streak requirement', () => {
    const drills = [createMockDrill('D1')];
    let state = createPracticeSessionState(drills);

    state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_correct' });
    state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.85 });
    state = practiceSessionReducer(state, { type: 'ADVANCE_REP' });

    expect(state.isCompleted).toBe(true);
    const completion = getRoundCompletionResult(state);
    expect(completion?.repsCount).toBe(1);
    expect(completion?.isStreakEligible).toBe(false); // only 1 rep completed, needs 3 for daily streak
  });

  it('resets session back to clean state on RESET_SESSION', () => {
    const drills = [createMockDrill('D1')];
    let state = createPracticeSessionState(drills);

    state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_correct' });
    state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.85 });
    state = practiceSessionReducer(state, { type: 'ADVANCE_REP' });
    expect(state.isCompleted).toBe(true);

    state = practiceSessionReducer(state, { type: 'RESET_SESSION' });
    expect(state.isCompleted).toBe(false);
    expect(state.currentRepIndex).toBe(0);
    expect(getCurrentRep(state)?.selectedOptionId).toBeNull();
    expect(getCurrentRep(state)?.isSubmitted).toBe(false);

    // RESET_SESSION with new drills
    const newDrills = [createMockDrill('D2'), createMockDrill('D3')];
    state = practiceSessionReducer(state, { type: 'RESET_SESSION', drills: newDrills });
    expect(state.reps.length).toBe(2);
    expect(getCurrentRep(state)?.drill.id).toBe('D2');
  });

  describe('Hypercorrection Intercept', () => {
    it('enters intercept on wrong commit at 85% and blocks advance until resolved', () => {
      const drills = [createMockDrill('D1')];
      let state = createPracticeSessionState(drills);

      state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_wrong' });
      state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.85 });

      const rep = getCurrentRep(state);
      expect(rep?.isSubmitted).toBe(true);
      expect(rep?.hypercorrectionActive).toBe(true);
      expect(rep?.isCorrect).toBe(false);
      expect(rep?.quadrant).toBe('Hazardous_Assumption');
      expect(rep?.distractorAntipattern).toBe('Synchronous Antipattern');
      expect(rep?.hypercorrectionExcludedOptionId).toBe('opt_wrong');

      state = practiceSessionReducer(state, { type: 'ADVANCE_REP' });
      expect(state.currentRepIndex).toBe(0);
      expect(state.isCompleted).toBe(false);
    });

    it('reveals immediately on wrong commit at 50% or 70%', () => {
      for (const confidence of [0.5, 0.7] as const) {
        let state = createPracticeSessionState([createMockDrill('D1')]);
        state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_wrong' });
        state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence });

        const rep = getCurrentRep(state);
        expect(rep?.isSubmitted).toBe(true);
        expect(rep?.hypercorrectionActive).toBe(false);
        expect(rep?.isCorrect).toBe(false);
      }
    });

    it('allows one retry on remaining options only and locks score to first commit', () => {
      let state = createPracticeSessionState([createMockDrill('D1')]);
      state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_wrong' });
      state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.95 });

      const lockedScore = getCurrentRep(state)?.score;
      const lockedQuadrant = getCurrentRep(state)?.quadrant;
      expect(lockedScore).toBe(-126);
      expect(lockedQuadrant).toBe('Hazardous_Assumption');

      // Excluded first wrong option cannot be retried
      state = practiceSessionReducer(state, { type: 'RETRY_OPTION', optionId: 'opt_wrong' });
      expect(getCurrentRep(state)?.hypercorrectionActive).toBe(true);
      expect(getCurrentRep(state)?.retryOptionId).toBeUndefined();

      // Second try on correct option does not change Brier / quadrant / correctness of first commit
      state = practiceSessionReducer(state, { type: 'RETRY_OPTION', optionId: 'opt_correct' });
      const afterRetry = getCurrentRep(state);
      expect(afterRetry?.hypercorrectionActive).toBe(false);
      expect(afterRetry?.retryOptionId).toBe('opt_correct');
      expect(afterRetry?.selectedOptionId).toBe('opt_wrong');
      expect(afterRetry?.isCorrect).toBe(false);
      expect(afterRetry?.score).toBe(lockedScore);
      expect(afterRetry?.quadrant).toBe(lockedQuadrant);

      // No second retry after resolve
      state = practiceSessionReducer(state, { type: 'RETRY_OPTION', optionId: 'opt_wrong_b' });
      expect(getCurrentRep(state)?.retryOptionId).toBe('opt_correct');
    });

    it('skip resolves intercept without changing first-commit scoring', () => {
      let state = createPracticeSessionState([createMockDrill('D1')]);
      state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_wrong' });
      state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.85 });

      const lockedScore = getCurrentRep(state)?.score;
      state = practiceSessionReducer(state, { type: 'SKIP_HYPERCORRECTION' });

      const afterSkip = getCurrentRep(state);
      expect(afterSkip?.hypercorrectionActive).toBe(false);
      expect(afterSkip?.retryOptionId).toBeUndefined();
      expect(afterSkip?.score).toBe(lockedScore);
      expect(afterSkip?.isCorrect).toBe(false);

      state = practiceSessionReducer(state, { type: 'ADVANCE_REP' });
      expect(state.isCompleted).toBe(true);
    });
  });
});
