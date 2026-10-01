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

  it('runs a complete 3-rep practice round through to completion and telemetry synthesis', () => {
    const drills = [createMockDrill('D1'), createMockDrill('D2'), createMockDrill('D3')];
    let state = createPracticeSessionState(drills);

    // Rep 1: correct with 85%
    state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_correct' });
    state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.85 });
    state = practiceSessionReducer(state, { type: 'ADVANCE_REP' });
    expect(state.currentRepIndex).toBe(1);
    expect(state.isCompleted).toBe(false);

    // Rep 2: wrong with 70%
    state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_wrong' });
    state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.7 });
    state = practiceSessionReducer(state, { type: 'ADVANCE_REP' });
    expect(state.currentRepIndex).toBe(2);
    expect(state.isCompleted).toBe(false);

    // Rep 3: correct with 95%
    state = practiceSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'opt_correct' });
    state = practiceSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.95 });
    state = practiceSessionReducer(state, { type: 'ADVANCE_REP' });

    // Round should now be completed
    expect(state.isCompleted).toBe(true);
    expect(state.accuracy).toBeCloseTo(2 / 3);
    expect(state.totalScore).toBeGreaterThan(0);
    expect(state.attempts.length).toBe(3);

    const completion = getRoundCompletionResult(state);
    expect(completion).not.toBeNull();
    expect(completion?.isStreakEligible).toBe(true);
    expect(completion?.repsCount).toBe(3);
    expect(completion?.attempts[0].drillId).toBe('D1');
    expect(completion?.attempts[1].drillId).toBe('D2');
    expect(completion?.attempts[2].drillId).toBe('D3');
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
  });
});
