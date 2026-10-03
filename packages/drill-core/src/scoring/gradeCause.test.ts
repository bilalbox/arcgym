import { describe, expect, it } from 'vitest';
import type { TroubleshootingDrillDefinition } from '../types/drill.js';
import { DEFAULT_CAUSE_GRADING, gradeCause } from './gradeCause.js';

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
};

describe('gradeCause', () => {
  it('exposes the default absolute thresholds and gold margin', () => {
    expect(DEFAULT_CAUSE_GRADING).toEqual({
      correctThreshold: 0.62,
      distractorThreshold: 0.55,
      goldMargin: 0.08,
    });
  });

  it('verdicts correct when gold clears the threshold and beats the best distractor by the margin', () => {
    const result = gradeCause(DRILL, 'any cause text', {
      gold: 0.8,
      d1: 0.5,
      d2: 0.4,
      d3: 0.3,
    });
    expect(result.verdict).toBe('correct');
    expect(result.isCorrect).toBe(true);
    expect(result.matchedDistractor).toBeNull();
    expect(result.goldScore).toBe(0.8);
    expect(result.bestDistractorScore).toBe(0.5);
  });

  it('verdicts incorrect_distractor when a distractor clears its threshold and beats gold by the margin', () => {
    const result = gradeCause(DRILL, 'warehouse guess', {
      gold: 0.4,
      d1: 0.72,
      d2: 0.3,
      d3: 0.2,
    });
    expect(result.verdict).toBe('incorrect_distractor');
    expect(result.isCorrect).toBe(false);
    expect(result.matchedDistractor?.id).toBe('d1');
    expect(result.matchedDistractor?.antipattern).toBe('Scale First Warehouse');
  });

  it('verdicts incorrect_miss when neither gold nor a distractor wins cleanly', () => {
    const result = gradeCause(DRILL, 'vague guess', {
      gold: 0.5,
      d1: 0.48,
      d2: 0.45,
      d3: 0.4,
    });
    expect(result.verdict).toBe('incorrect_miss');
    expect(result.isCorrect).toBe(false);
    expect(result.matchedDistractor).toBeNull();
  });

  it('requires injected score maps (no live Workers AI in unit tests)', () => {
    expect(() => gradeCause(DRILL, 'text without scores')).toThrow(/scoreOverrides/i);
  });

  it('returns gold rationale and thresholds for teach-back', () => {
    const result = gradeCause(DRILL, 'x', { gold: 0.9, d1: 0.1, d2: 0.1, d3: 0.1 });
    expect(result.goldRationale).toBe(DRILL.goldCause.rationale);
    expect(result.thresholds).toEqual(DEFAULT_CAUSE_GRADING);
  });
});
