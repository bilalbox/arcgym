import { describe, it, expect } from 'vitest';
import {
  lintDrillWording,
  type DrillOptionDTO,
  type LessonDrillDefinition,
  type LessonOptionDTO,
  type RapidFireDrillDefinition,
  type WordingRuleId,
} from '../index.js';

const BASE = {
  id: 'AGD-09999',
  title: 'Fixture drill',
  domain: 'Integration_Apis',
  domainLabel: 'Integration APIs',
  difficulty: 'Lead_CTA',
  pillars: ['Reliability'],
  version: 1,
  status: 'draft',
} as const;

function lesson(options: LessonOptionDTO[]): LessonDrillDefinition {
  return {
    ...BASE,
    format: 'Lesson',
    stages: [{ stageNumber: 1, stageName: 'Stage 1: Forensic Diagnosis', scenario: 'Nightly sync fails at 2 AM. What is the root cause?', options }],
  };
}

const LESSON_OPTIONS: LessonOptionDTO[] = [
  { id: 'st1_a', text: 'Row lock contention on the parent account', isCorrect: true, coachingFeedback: 'Parallel batches update children of one parent, so each waits on the same lock.' },
  { id: 'st1_b', text: 'Heap size exhaustion inside the batch job', isCorrect: false, coachingFeedback: 'Heap errors would name the limit; this failure is a lock timeout.' },
  { id: 'st1_c', text: 'Expired session token on the integration user', isCorrect: false, coachingFeedback: 'An expired token fails every call, not only the concurrent ones.' },
];

function rapidFire(options: DrillOptionDTO[], prompt = 'Orders arrive at 40 per second and the ERP accepts 10. Which integration pattern should the architect use?'): RapidFireDrillDefinition {
  return { ...BASE, format: 'Rapid_Fire', steps: [{ id: 's1', prompt, options }] };
}

const RAPID_FIRE_OPTIONS: DrillOptionDTO[] = [
  { id: 's1_a', label: 'Publish platform events and let the ERP subscriber drain them', isCorrect: true, rationale: 'Asynchronous decoupling absorbs a 4x rate mismatch because the event bus buffers bursts the ERP cannot take.' },
  { id: 's1_b', label: 'Call the ERP synchronously from an after-save record trigger', isCorrect: false, distractorAntipattern: 'Synchronous Callout Coupling', rationale: 'At 40 requests per second the ERP rejects three of every four calls.' },
  { id: 's1_c', label: 'Batch the orders hourly into a scheduled Bulk API job', isCorrect: false, distractorAntipattern: 'Batch Latency Masking', rationale: 'Hourly batches meet throughput but leave orders unconfirmed for up to an hour.' },
];

const ruleIds = (findings: { ruleId: WordingRuleId }[]) => findings.map((f) => f.ruleId);

describe('lintDrillWording', () => {
  describe('lesson-min-options', () => {
    it('accepts a stage with three options', () => {
      expect(ruleIds(lintDrillWording(lesson(LESSON_OPTIONS)))).not.toContain('lesson-min-options');
    });

    it('flags a stage with two options', () => {
      const findings = lintDrillWording(lesson(LESSON_OPTIONS.slice(0, 2)));
      expect(findings).toContainEqual(expect.objectContaining({ ruleId: 'lesson-min-options', where: 'stage 1' }));
    });
  });

  describe('length-tell', () => {
    const padded = (text: string) => `${text}, then document the decision in the integration runbook for the team`;

    it('accepts options of comparable length', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain('length-tell');
      expect(ruleIds(lintDrillWording(lesson(LESSON_OPTIONS)))).not.toContain('length-tell');
    });

    it('flags a Rapid Fire correct option far longer than its distractors', () => {
      const [correct, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(rapidFire([{ ...correct, label: padded(correct.label) }, ...rest]));
      expect(findings).toContainEqual(expect.objectContaining({ ruleId: 'length-tell', where: 'step s1' }));
    });

    it('flags a long correct option in a Lesson stage', () => {
      const [lessonCorrect, ...lessonRest] = LESSON_OPTIONS;
      expect(ruleIds(lintDrillWording(lesson([{ ...lessonCorrect, text: padded(lessonCorrect.text) }, ...lessonRest])))).toContain('length-tell');
    });
  });

  describe('verdict-prefix', () => {
    it('accepts feedback that opens with the mechanism', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain('verdict-prefix');
      expect(ruleIds(lintDrillWording(lesson(LESSON_OPTIONS)))).not.toContain('verdict-prefix');
    });

    it('flags verdict prefixes in coachingFeedback and rationale', () => {
      const [lessonCorrect, ...lessonRest] = LESSON_OPTIONS;
      const [rfCorrect, rfWrong, ...rfRest] = RAPID_FIRE_OPTIONS;

      expect(lintDrillWording(lesson([{ ...lessonCorrect, coachingFeedback: 'Correct! Parallel batches contend.' }, ...lessonRest]))).toContainEqual(
        expect.objectContaining({ ruleId: 'verdict-prefix', where: 'stage 1 option st1_a coachingFeedback' }),
      );
      expect(lintDrillWording(rapidFire([rfCorrect, { ...rfWrong, rationale: 'Antipattern: the ERP rejects calls.' }, ...rfRest]))).toContainEqual(
        expect.objectContaining({ ruleId: 'verdict-prefix', where: 'step s1 option s1_b rationale' }),
      );
    });
  });

  describe('antipattern-name', () => {
    it('accepts short antipattern names on Rapid Fire distractors', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain('antipattern-name');
    });

    it('flags sentence-like antipattern names', () => {
      const [correct, wrong, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(
        rapidFire([correct, { ...wrong, distractorAntipattern: 'This couples the trigger to every ERP.' }, ...rest]),
      );
      expect(findings).toContainEqual(expect.objectContaining({ ruleId: 'antipattern-name' }));
    });
  });

  describe('self-refuting-distractor', () => {
    it('flags giveaway words in distractor labels', () => {
      const [correct, wrong, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(
        rapidFire([correct, { ...wrong, label: 'Always call the ERP synchronously from the trigger' }, ...rest]),
      );
      expect(findings).toContainEqual(expect.objectContaining({ ruleId: 'self-refuting-distractor' }));
    });
  });

  describe('label-echo', () => {
    it('flags rationale that mostly repeats the correct option label', () => {
      const [correct, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(
        rapidFire([
          {
            ...correct,
            rationale: 'Publish platform events and let the ERP subscriber drain them because publish platform events help.',
          },
          ...rest,
        ]),
      );
      expect(findings).toContainEqual(expect.objectContaining({ ruleId: 'label-echo' }));
    });
  });

  describe('long-stem', () => {
    it('flags stems over 55 words', () => {
      const long = Array(56).fill('word').join(' ');
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS, long)))).toContain('long-stem');
    });
  });
});
