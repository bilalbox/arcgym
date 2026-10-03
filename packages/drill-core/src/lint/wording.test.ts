import { describe, expect, it } from 'vitest';
import {
  type DrillOptionDTO,
  lintDrillWording,
  type RapidFireDrillDefinition,
  type TroubleshootingDrillDefinition,
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

function rapidFire(
  options: DrillOptionDTO[],
  prompt = 'Orders arrive at 40 per second and the ERP accepts 10. Which integration pattern should the architect use?',
): RapidFireDrillDefinition {
  return { ...BASE, format: 'Rapid_Fire', steps: [{ id: 's1', prompt, options }] };
}

const RAPID_FIRE_OPTIONS: DrillOptionDTO[] = [
  {
    id: 's1_a',
    label: 'Publish platform events and let the ERP subscriber drain them',
    isCorrect: true,
    rationale:
      'Asynchronous decoupling absorbs a 4x rate mismatch because the event bus buffers bursts the ERP cannot take.',
  },
  {
    id: 's1_b',
    label: 'Call the ERP synchronously from an after-save record trigger',
    isCorrect: false,
    distractorAntipattern: 'Synchronous Callout Coupling',
    rationale: 'At 40 requests per second the ERP rejects three of every four calls.',
  },
  {
    id: 's1_c',
    label: 'Batch the orders hourly into a scheduled Bulk API job',
    isCorrect: false,
    distractorAntipattern: 'Batch Latency Masking',
    rationale: 'Hourly batches meet throughput but leave orders unconfirmed for up to an hour.',
  },
];

const ruleIds = (findings: { ruleId: WordingRuleId }[]) => findings.map((f) => f.ruleId);

describe('lintDrillWording', () => {
  describe('length-tell', () => {
    const padded = (text: string) =>
      `${text}, then document the decision in the integration runbook for the team`;

    it('accepts options of comparable length', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain('length-tell');
    });

    it('flags a Rapid Fire correct option far longer than its distractors', () => {
      const [correct, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(
        rapidFire([{ ...correct, label: padded(correct.label) }, ...rest]),
      );
      expect(findings).toContainEqual(
        expect.objectContaining({ ruleId: 'length-tell', where: 'step s1' }),
      );
    });
  });

  describe('verdict-prefix', () => {
    it('accepts feedback that opens with the mechanism', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain(
        'verdict-prefix',
      );
    });

    it('flags verdict prefixes in rationale', () => {
      const [rfCorrect, rfWrong, ...rfRest] = RAPID_FIRE_OPTIONS;

      expect(
        lintDrillWording(
          rapidFire([
            rfCorrect,
            { ...rfWrong, rationale: 'Antipattern: the ERP rejects calls.' },
            ...rfRest,
          ]),
        ),
      ).toContainEqual(
        expect.objectContaining({
          ruleId: 'verdict-prefix',
          where: 'step s1 option s1_b rationale',
        }),
      );
    });
  });

  describe('antipattern-name', () => {
    it('accepts short antipattern names on Rapid Fire distractors', () => {
      expect(ruleIds(lintDrillWording(rapidFire(RAPID_FIRE_OPTIONS)))).not.toContain(
        'antipattern-name',
      );
    });

    it('flags sentence-like antipattern names', () => {
      const [correct, wrong, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(
        rapidFire([
          correct,
          { ...wrong, distractorAntipattern: 'This couples the trigger to every ERP.' },
          ...rest,
        ]),
      );
      expect(findings).toContainEqual(expect.objectContaining({ ruleId: 'antipattern-name' }));
    });
  });

  describe('self-refuting-distractor', () => {
    it('flags giveaway words in distractor labels', () => {
      const [correct, wrong, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(
        rapidFire([
          correct,
          { ...wrong, label: 'Always call the ERP synchronously from the trigger' },
          ...rest,
        ]),
      );
      expect(findings).toContainEqual(
        expect.objectContaining({ ruleId: 'self-refuting-distractor' }),
      );
    });
  });

  describe('label-echo', () => {
    it('flags rationale that mostly repeats the correct option label', () => {
      const [correct, ...rest] = RAPID_FIRE_OPTIONS;
      const findings = lintDrillWording(
        rapidFire([
          {
            ...correct,
            rationale:
              'Publish platform events and let the ERP subscriber drain them because publish platform events help.',
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

  describe('Troubleshooting cause-leak and gold-too-long', () => {
    const incident = (): TroubleshootingDrillDefinition => ({
      ...BASE,
      id: 'AGD-01099',
      format: 'Troubleshooting',
      architecture: {
        synopsis:
          'CRM feeds Data Cloud. Zero Copy reads Snowflake curated tables. Segments refresh hourly.',
        diagramUrl: '/diagrams/fixture.svg',
      },
      issue: 'Segment refreshes intermittently time out near the top of the hour.',
      probeBudget: 3,
      probes: [
        {
          id: 'p1',
          label: 'What changed in the curated DLO?',
          tier: 'pivotal',
          answer: 'Two formula fields were added',
        },
        {
          id: 'p2',
          label: 'Do BDT runs overlap segment refresh?',
          tier: 'pivotal',
          answer: 'Yes after a scheduler change',
        },
        { id: 'p3', label: 'Which segments fail?', tier: 'useful', answer: 'Same curated DLO' },
        {
          id: 'p4',
          label: 'Is the connector rate limited?',
          tier: 'distractor',
          answer: 'No',
          distractorAntipattern: 'Blame Connector Ceiling',
        },
      ],
      goldCause: {
        text: 'Formula fields force expensive Zero Copy evaluation overlapping segment refresh.',
        rationale: 'Concurrent evaluation plus schedule collision, not warehouse size.',
      },
      hiddenDistractors: [
        {
          id: 'd1',
          text: 'Warehouse undersized.',
          antipattern: 'Scale First Warehouse',
          rationale: 'Already enlarged with no relief.',
        },
        {
          id: 'd2',
          text: 'Connector rate limits.',
          antipattern: 'Blame Connector Ceiling',
          rationale: 'No rate-limit evidence.',
        },
        {
          id: 'd3',
          text: 'Network latency.',
          antipattern: 'Network Ghost Hunt',
          rationale: 'No latency incident.',
        },
      ],
    });

    it('accepts a clean Incident brief that withholds the gold cause', () => {
      expect(ruleIds(lintDrillWording(incident()))).not.toContain('cause-leak');
      expect(ruleIds(lintDrillWording(incident()))).not.toContain('gold-too-long');
    });

    it('flags when the brief surface restates the gold cause', () => {
      const leaky = incident();
      leaky.architecture.synopsis =
        'Formula fields force expensive Zero Copy evaluation overlapping segment refresh on the curated path.';
      expect(ruleIds(lintDrillWording(leaky))).toContain('cause-leak');
    });

    it('flags a gold cause longer than about two sentences', () => {
      const long = incident();
      long.goldCause.text =
        'Formula fields force expensive Zero Copy evaluation. The BDT window overlaps segment refresh. Ops already enlarged the warehouse once with no relief.';
      expect(ruleIds(lintDrillWording(long))).toContain('gold-too-long');
    });
  });
});
