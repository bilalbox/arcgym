import { describe, it, expect } from 'vitest';
import {
  lintDrillWording,
  type DrillOptionDTO,
  type LessonDrillDefinition,
  type LessonOptionDTO,
  type RapidFireDrillDefinition,
  type ScenarioDrillDefinition,
  type ScenarioOptionDTO,
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

function scenario(options: ScenarioOptionDTO[]): ScenarioDrillDefinition {
  return {
    ...BASE,
    format: 'Scenario',
    initialTrust: 50,
    initialReliability: 50,
    moves: [{ moveNumber: 1, stakeholderPersona: 'CIO', dialogueText: 'Go-live is Friday. Do we load all history now?', options }],
  };
}

const SCENARIO_OPTIONS: ScenarioOptionDTO[] = [
  { id: 'm1_a', text: 'Load the last two years now and archive the rest', trustDelta: -5, reliabilityDelta: 10, techDebtImpact: 'Costs a week of scope now, but keeps list views selective.', isOptimal: true },
  { id: 'm1_b', text: 'Load all fifteen years of history before Friday', trustDelta: 10, reliabilityDelta: -15, techDebtImpact: 'Saves the archive design now, but skews every report query.', isOptimal: false },
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
      expect(ruleIds(lintDrillWording(scenario(SCENARIO_OPTIONS)))).not.toContain('length-tell');
    });

    it('flags a Rapid Fire correct option far longer than its distractors', () => {
      const [correct, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(rapidFire([{ ...correct, label: padded(correct.label) }, ...rest]));
      expect(findings).toContainEqual(expect.objectContaining({ ruleId: 'length-tell', where: 'step s1' }));
    });

    it('flags a long correct option in a Lesson stage and a Scenario move', () => {
      const [lessonCorrect, ...lessonRest] = LESSON_OPTIONS;
      const [scenarioOptimal, ...scenarioRest] = SCENARIO_OPTIONS;
      expect(ruleIds(lintDrillWording(lesson([{ ...lessonCorrect, text: padded(lessonCorrect.text) }, ...lessonRest])))).toContain('length-tell');
      expect(ruleIds(lintDrillWording(scenario([{ ...scenarioOptimal, text: padded(scenarioOptimal.text) }, ...scenarioRest])))).toContain('length-tell');
    });
  });

  describe('verdict-prefix', () => {
    it('accepts feedback that opens with the mechanism', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain('verdict-prefix');
      expect(ruleIds(lintDrillWording(lesson(LESSON_OPTIONS)))).not.toContain('verdict-prefix');
      expect(ruleIds(lintDrillWording(scenario(SCENARIO_OPTIONS)))).not.toContain('verdict-prefix');
    });

    it('flags verdict prefixes in coachingFeedback, rationale, and techDebtImpact', () => {
      const [lessonCorrect, ...lessonRest] = LESSON_OPTIONS;
      const [rfCorrect, rfWrong, ...rfRest] = RAPID_FIRE_OPTIONS;
      const [scenarioOptimal, ...scenarioRest] = SCENARIO_OPTIONS;

      expect(lintDrillWording(lesson([{ ...lessonCorrect, coachingFeedback: 'Correct! Parallel batches contend.' }, ...lessonRest]))).toContainEqual(
        expect.objectContaining({ ruleId: 'verdict-prefix', where: 'stage 1 option st1_a coachingFeedback' }),
      );
      expect(lintDrillWording(rapidFire([rfCorrect, { ...rfWrong, rationale: 'Antipattern: the ERP rejects calls.' }, ...rfRest]))).toContainEqual(
        expect.objectContaining({ ruleId: 'verdict-prefix', where: 'step s1 option s1_b rationale' }),
      );
      expect(lintDrillWording(scenario([{ ...scenarioOptimal, techDebtImpact: 'Zero risk: reports stay fast.' }, ...scenarioRest]))).toContainEqual(
        expect.objectContaining({ ruleId: 'verdict-prefix', where: 'move 1 option m1_a techDebtImpact' }),
      );
    });
  });

  describe('antipattern-name', () => {
    const withAntipattern = (distractorAntipattern: string) => {
      const [correct, wrong, ...rest] = RAPID_FIRE_OPTIONS;
      return rapidFire([correct, { ...wrong, distractorAntipattern }, ...rest]);
    };

    it('accepts a 2–5 word name', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain('antipattern-name');
      expect(ruleIds(lintDrillWording(withAntipattern('Blind Packaged Kit Redeploy')))).not.toContain('antipattern-name');
    });

    it('flags a sentence, a single word, and a missing name', () => {
      const sentence = withAntipattern('Synchronous callouts block the transaction until the ERP responds.');
      expect(lintDrillWording(sentence)).toContainEqual(expect.objectContaining({ ruleId: 'antipattern-name', where: 'step s1 option s1_b' }));
      expect(ruleIds(lintDrillWording(withAntipattern('Coupling')))).toContain('antipattern-name');
      expect(ruleIds(lintDrillWording(withAntipattern('')))).toContain('antipattern-name');
    });
  });

  describe('label-echo', () => {
    it('accepts a rationale that adds the principle and deciding constraint', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain('label-echo');
    });

    it('flags a correct-option rationale that restates the label', () => {
      const [correct, ...rest] = RAPID_FIRE_OPTIONS;
      const echo = { ...correct, rationale: 'Publishing platform events lets the ERP subscriber drain them.' };
      expect(lintDrillWording(rapidFire([echo, ...rest]))).toContainEqual(expect.objectContaining({ ruleId: 'label-echo', where: 'step s1 option s1_a' }));
    });

    it('ignores wrong options, whose rationale may restate their label', () => {
      const [correct, wrong, ...rest] = RAPID_FIRE_OPTIONS;
      const echo = { ...wrong, rationale: 'Calling the ERP synchronously from an after-save record trigger.' };
      expect(ruleIds(lintDrillWording(rapidFire([correct, echo, ...rest])))).not.toContain('label-echo');
    });
  });

  describe('self-refuting-distractor', () => {
    it('accepts plausible distractors', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain('self-refuting-distractor');
      expect(ruleIds(lintDrillWording(lesson(LESSON_OPTIONS)))).not.toContain('self-refuting-distractor');
    });

    it('flags distractors that announce they are wrong, in any case', () => {
      const [correct, wrong, ...rest] = RAPID_FIRE_OPTIONS;
      const [lessonCorrect, lessonWrong, ...lessonRest] = LESSON_OPTIONS;
      expect(lintDrillWording(rapidFire([correct, { ...wrong, label: 'Rely entirely on the ERP retry queue' }, ...rest]))).toContainEqual(
        expect.objectContaining({ ruleId: 'self-refuting-distractor', where: 'step s1 option s1_b' }),
      );
      expect(ruleIds(lintDrillWording(lesson([lessonCorrect, { ...lessonWrong, text: 'Immediately delete the stale records' }, ...lessonRest])))).toContain(
        'self-refuting-distractor',
      );
      expect(ruleIds(lintDrillWording(rapidFire([correct, { ...wrong, label: 'Deploy the fix directly to production' }, ...rest])))).toContain(
        'self-refuting-distractor',
      );
    });

    it('ignores the same words in the correct option', () => {
      const [correct, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(rapidFire([{ ...correct, label: 'Always publish events for the ERP subscriber' }, ...rest]));
      expect(ruleIds(findings)).not.toContain('self-refuting-distractor');
    });
  });

  describe('long-stem', () => {
    it('accepts question text of 55 words', () => {
      const prompt = Array.from({ length: 55 }, () => 'word').join(' ');
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS, prompt)))).not.toContain('long-stem');
    });

    it('flags question text over 55 words', () => {
      const prompt = Array.from({ length: 56 }, () => 'word').join(' ');
      expect(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS, prompt))).toContainEqual(expect.objectContaining({ ruleId: 'long-stem', where: 'step s1' }));
    });
  });
});
