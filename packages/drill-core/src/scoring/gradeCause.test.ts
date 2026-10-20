import { describe, expect, it } from 'vitest';
import type { TroubleshootingDrillDefinition } from '../types/drill.js';
import { CAUSE_OTHER_ID, causeGradeCriteria, gradeCause } from './gradeCause.js';

const DRILL: TroubleshootingDrillDefinition = {
  id: 'AGD-01001',
  title: 'Fixture Incident',
  format: 'Troubleshooting',
  domain: 'Data_Architecture',
  domainLabel: 'Data Architecture',
  difficulty: 'Lead_CTA',
  pillars: ['Reliability'],
  version: 1,
  status: 'draft',
  architecture: {
    synopsis: 'CRM feeds Data Cloud. Zero Copy reads Snowflake. Segments refresh hourly.',
    diagramUrl: '/diagrams/fixture.svg',
  },
  issue: 'Segment refreshes intermittently time out near the top of the hour.',
  probeBudget: 3,
  probes: [
    { id: 'p1', label: 'What changed?', tier: 'pivotal', answer: 'Formula fields added' },
    { id: 'p2', label: 'Do jobs overlap?', tier: 'pivotal', answer: 'Yes' },
    { id: 'p3', label: 'Which segments?', tier: 'useful', answer: 'Same DLO' },
    {
      id: 'p4',
      label: 'Rate limits?',
      tier: 'distractor',
      answer: 'No',
      distractorAntipattern: 'Blame Connector Ceiling',
    },
  ],
  goldCause: {
    text: 'Formula fields force expensive Zero Copy evaluation overlapping segment refresh.',
    rationale: 'Concurrent heavy evaluation plus schedule collision, not warehouse size.',
  },
  hiddenDistractors: [
    {
      id: 'd1',
      text: 'The Snowflake warehouse is still undersized for peak concurrent segment refresh load.',
      antipattern: 'Scale First Warehouse',
      rationale: 'Warehouse was already enlarged with no relief.',
    },
    {
      id: 'd2',
      text: 'Zero Copy connector rate limiting is throttling the segment refresh queries.',
      antipattern: 'Blame Connector Ceiling',
      rationale: 'No rate-limit evidence.',
    },
    {
      id: 'd3',
      text: 'Cross-region network latency between Data Cloud and Snowflake is causing the timeouts.',
      antipattern: 'Network Ghost Hunt',
      rationale: 'No latency incident.',
    },
  ],
  fix: {
    prompt: 'How should the concurrency collision be remediated?',
    options: [
      {
        id: 'fix_gold',
        label: 'Stagger transform schedules away from segment publish',
        isCorrect: true,
        rationale: 'Staggering eliminates query collision.',
      },
      {
        id: 'fix_d1',
        label: 'Upsize Snowflake warehouse',
        isCorrect: false,
        distractorAntipattern: 'Scale First Warehouse',
        rationale: 'Upsizing does not resolve lock contention.',
      },
      {
        id: 'fix_d2',
        label: 'Relocate multi-region cluster',
        isCorrect: false,
        distractorAntipattern: 'Network Ghost Hunt',
        rationale: 'Network is not the bottleneck.',
      },
    ],
  },
};

describe('gradeCause (CLEF choice argmax)', () => {
  it('builds CLEF criteria with gold, distractors, and other', () => {
    const criteria = causeGradeCriteria(DRILL);
    expect(Object.keys(criteria).sort()).toEqual(['d1', 'd2', 'd3', 'gold', 'other']);
    expect(criteria.gold).toBe(DRILL.goldCause.text);
    expect(criteria[CAUSE_OTHER_ID]).toMatch(/Something else/i);
  });

  it('verdicts correct when gold is the CLEF argmax', () => {
    const result = gradeCause(DRILL, 'any cause text', {
      gold: 0.9,
      d1: 0.03,
      d2: 0.02,
      d3: 0.01,
      other: 0.04,
    });
    expect(result.verdict).toBe('correct');
    expect(result.isCorrect).toBe(true);
    expect(result.chosenId).toBe('gold');
    expect(result.matchedDistractor).toBeNull();
    expect(result.goldScore).toBe(0.9);
  });

  it('verdicts incorrect_distractor when a distractor is the CLEF argmax', () => {
    const result = gradeCause(DRILL, 'warehouse guess', {
      gold: 0.1,
      d1: 0.72,
      d2: 0.05,
      d3: 0.03,
      other: 0.1,
    });
    expect(result.verdict).toBe('incorrect_distractor');
    expect(result.isCorrect).toBe(false);
    expect(result.chosenId).toBe('d1');
    expect(result.matchedDistractor?.id).toBe('d1');
    expect(result.matchedDistractor?.antipattern).toBe('Scale First Warehouse');
  });

  it('verdicts incorrect_miss when other is the CLEF argmax', () => {
    const result = gradeCause(DRILL, 'vague guess', {
      gold: 0.12,
      d1: 0.1,
      d2: 0.08,
      d3: 0.05,
      other: 0.65,
    });
    expect(result.verdict).toBe('incorrect_miss');
    expect(result.isCorrect).toBe(false);
    expect(result.chosenId).toBe('other');
    expect(result.matchedDistractor).toBeNull();
    expect(result.otherScore).toBe(0.65);
  });

  it('requires injected CLEF probability maps (no live Workers AI in unit tests)', () => {
    expect(() => gradeCause(DRILL, 'text without scores')).toThrow(/scoreOverrides/i);
  });

  it('requires the other catchall score', () => {
    expect(() => gradeCause(DRILL, 'x', { gold: 0.9, d1: 0.1, d2: 0.1, d3: 0.1 })).toThrow(
      /other/i,
    );
  });

  it('returns gold rationale for teach-back', () => {
    const result = gradeCause(DRILL, 'x', {
      gold: 0.9,
      d1: 0.02,
      d2: 0.02,
      d3: 0.02,
      other: 0.04,
    });
    expect(result.goldRationale).toBe(DRILL.goldCause.rationale);
  });
});
