import { describe, expect, it } from 'vitest';
import {
  type CaseFileDrillDefinition,
  DRILL_FORMATS,
  type TroubleshootingDrillDefinition,
} from '../types/drill.js';
import type { ValidationFinding } from '../validator/validator.js';
import {
  DRILL_FORMAT_DESCRIPTORS,
  DRILL_FORMAT_LABELS,
  getAllDrillFormatDescriptors,
  getDrillFormatDescriptor,
} from './index.js';

const VALID_CITATION = 'https://architect.salesforce.com/well-architected/principles';

function createValidCaseFile(): CaseFileDrillDefinition {
  return {
    id: 'AGD-00201',
    title: 'Minimal Case File Title',
    domain: 'Platform_Core',
    domainLabel: 'Platform Core',
    difficulty: 'Lead_CTA',
    pillars: ['Reliability'],
    version: 1,
    status: 'draft',
    format: 'Case_File',
    brief: {
      title: 'Enterprise Brief',
      synopsis: 'Evaluation brief synopsis narrative.',
    },
    stations: [
      {
        id: 'st1',
        domain: 'Platform_Core',
        boardDomain: 'Integration',
        prompt: 'Station 1 prompt',
        probeBudget: 2,
        exhibits: [
          {
            label: 'System Topology',
            diagramUrl: '/diagrams/test-topology.svg',
          },
        ],
        probes: [
          { id: 'p1', label: 'Q1?', tier: 'pivotal', answer: 'A1' },
          { id: 'p2', label: 'Q2?', tier: 'pivotal', answer: 'A2' },
          { id: 'p3', label: 'Q3?', tier: 'useful', answer: 'A3' },
          { id: 'p4', label: 'Q4?', tier: 'useful', answer: 'A4' },
          {
            id: 'p5',
            label: 'Q5?',
            tier: 'distractor',
            answer: 'A5',
            distractorAntipattern: 'Distractor Name',
          },
        ],
        options: [
          {
            id: 'opt_1',
            label: 'Station recommendation 1 option label',
            isCorrect: true,
            rationale: 'Rec rationale grounds this architecture choice',
            citationUrl: VALID_CITATION,
          },
          {
            id: 'opt_2',
            label: 'Station recommendation 2 option label',
            isCorrect: false,
            distractorAntipattern: 'Bad Approach Pattern',
            rationale: 'Why it fails according to platform constraints',
          },
        ],
      },
      {
        id: 'st2',
        domain: 'Data_Architecture',
        boardDomain: 'Data',
        prompt: 'Station 2 prompt',
        probeBudget: 2,
        probes: [
          { id: 'p1', label: 'Q1?', tier: 'pivotal', answer: 'A1' },
          { id: 'p2', label: 'Q2?', tier: 'pivotal', answer: 'A2' },
          { id: 'p3', label: 'Q3?', tier: 'useful', answer: 'A3' },
          { id: 'p4', label: 'Q4?', tier: 'useful', answer: 'A4' },
          {
            id: 'p5',
            label: 'Q5?',
            tier: 'distractor',
            answer: 'A5',
            distractorAntipattern: 'Distractor Name',
          },
        ],
        options: [
          {
            id: 'opt_1',
            label: 'Station recommendation 2 option label',
            isCorrect: true,
            rationale: 'Rec rationale grounds this architecture choice',
            citationUrl: VALID_CITATION,
          },
          {
            id: 'opt_2',
            label: 'Station recommendation 2 bad option',
            isCorrect: false,
            distractorAntipattern: 'Bad Approach Pattern',
            rationale: 'Why it fails according to platform constraints',
          },
        ],
      },
      {
        id: 'st3',
        domain: 'Security_And_Access',
        boardDomain: 'Security',
        prompt: 'Station 3 prompt',
        probeBudget: 2,
        probes: [
          { id: 'p1', label: 'Q1?', tier: 'pivotal', answer: 'A1' },
          { id: 'p2', label: 'Q2?', tier: 'pivotal', answer: 'A2' },
          { id: 'p3', label: 'Q3?', tier: 'useful', answer: 'A3' },
          { id: 'p4', label: 'Q4?', tier: 'useful', answer: 'A4' },
          {
            id: 'p5',
            label: 'Q5?',
            tier: 'distractor',
            answer: 'A5',
            distractorAntipattern: 'Distractor Name',
          },
        ],
        options: [
          {
            id: 'opt_1',
            label: 'Station recommendation 3 option label',
            isCorrect: true,
            rationale: 'Rec rationale grounds this architecture choice',
            citationUrl: VALID_CITATION,
          },
          {
            id: 'opt_2',
            label: 'Station recommendation 3 bad option',
            isCorrect: false,
            distractorAntipattern: 'Bad Approach Pattern',
            rationale: 'Why it fails according to platform constraints',
          },
        ],
      },
    ],
  };
}

function createValidTroubleshooting(): TroubleshootingDrillDefinition {
  return {
    id: 'AGD-00301',
    title: 'Minimal Troubleshooting Title',
    domain: 'Platform_Core',
    domainLabel: 'Platform Core',
    difficulty: 'Lead_CTA',
    pillars: ['Operational_Excellence'],
    version: 1,
    status: 'draft',
    format: 'Troubleshooting',
    architecture: {
      synopsis: 'Topology synopsis.',
      diagramUrl: '/diagrams/test-topology.svg',
    },
    issue: 'Failure symptom description.',
    probeBudget: 3,
    probes: [
      { id: 'p1', label: 'Q1?', tier: 'pivotal', answer: 'A1' },
      { id: 'p2', label: 'Q2?', tier: 'pivotal', answer: 'A2' },
      { id: 'p3', label: 'Q3?', tier: 'useful', answer: 'A3' },
      {
        id: 'p4',
        label: 'Q4?',
        tier: 'distractor',
        answer: 'A4',
        distractorAntipattern: 'Distractor Pattern',
      },
      { id: 'p5', label: 'Q5?', tier: 'useful', answer: 'A5' },
    ],
    goldCause: {
      text: 'Root cause text explains failure mechanism accurately.',
      rationale: 'Why root cause holds in this architecture.',
      citationUrl: VALID_CITATION,
    },
    hiddenDistractors: [
      { id: 'd1', text: 'Wrong cause 1', antipattern: 'Antipattern Name 1', rationale: 'Fails 1' },
      { id: 'd2', text: 'Wrong cause 2', antipattern: 'Antipattern Name 2', rationale: 'Fails 2' },
      { id: 'd3', text: 'Wrong cause 3', antipattern: 'Antipattern Name 3', rationale: 'Fails 3' },
    ],
    fix: {
      prompt: 'Select the architectural remediation:',
      options: [
        {
          id: 'fix_gold',
          label: 'Adopt Change Data Capture with replay ID retention',
          rationale: 'Guarantees reliable message delivery without polling locks.',
          isCorrect: true,
          citationUrl: VALID_CITATION,
        },
        {
          id: 'fix_d1',
          label: 'Increase Apex batch size to 2000 records',
          rationale: 'Exceeds governor limits and triggers locking.',
          isCorrect: false,
          distractorAntipattern: 'Governor Limit Exhaustion',
        },
        {
          id: 'fix_d2',
          label: 'Use Future methods for asynchronous processing',
          rationale: 'Future methods cannot be monitored or chained.',
          isCorrect: false,
          distractorAntipattern: 'Unmanaged Asynchrony',
        },
      ],
    },
  };
}

describe('Drill Format Descriptors & Registry', () => {
  it('has a descriptor registered for every DrillFormat in DRILL_FORMATS', () => {
    for (const format of DRILL_FORMATS) {
      expect(DRILL_FORMAT_DESCRIPTORS[format]).toBeDefined();
      expect(DRILL_FORMAT_DESCRIPTORS[format].format).toBe(format);
      expect(DRILL_FORMAT_LABELS[format]).toBeDefined();
    }
  });

  it('getDrillFormatDescriptor retrieves matching descriptor', () => {
    for (const format of DRILL_FORMATS) {
      const desc = getDrillFormatDescriptor(format);
      expect(desc).toBe(DRILL_FORMAT_DESCRIPTORS[format]);
    }
  });

  it('getAllDrillFormatDescriptors returns all descriptors', () => {
    const all = getAllDrillFormatDescriptors();
    expect(all).toHaveLength(DRILL_FORMATS.length);
    const formats = all.map((d) => d.format);
    expect(formats).toEqual(expect.arrayContaining(DRILL_FORMATS));
  });

  describe('Case_File descriptor', () => {
    const desc = getDrillFormatDescriptor('Case_File');
    const cf = createValidCaseFile();

    it('has expected metadata', () => {
      expect(desc.format).toBe('Case_File');
      expect(desc.label).toBe('Case File');
      expect(desc.routePrefix).toBe('/cases');
      expect(desc.countsForStreak).toBe(true);
      expect(desc.isDailyEligible).toBe(true);
    });

    it('identifies authored and client drills', () => {
      expect(desc.isAuthored(cf)).toBe(true);
      expect(desc.isClient(cf)).toBe(true);
      expect(desc.isAuthored({ format: 'Troubleshooting' })).toBe(false);
    });

    it('calculates question count from stations', () => {
      expect(desc.getQuestionCount(cf)).toBe(3);
      expect(desc.getQuestionCount({ ...cf, stations: [] })).toBe(1);
    });

    it('sanitizes identity for client', () => {
      const sanitized = desc.sanitizeForClient(cf);
      expect(sanitized).toBe(cf);
    });

    it('validates a valid case file drill with no findings', () => {
      const findings: ValidationFinding[] = [];
      desc.validate(cf as unknown as Record<string, unknown>, {}, findings);
      expect(findings).toEqual([]);
    });

    it('lints wording of case file drill', () => {
      const findings = desc.lintWording(cf);
      expect(findings).toEqual([]);
    });
  });

  describe('Troubleshooting descriptor', () => {
    const desc = getDrillFormatDescriptor('Troubleshooting');
    const ts = createValidTroubleshooting();

    it('has expected metadata', () => {
      expect(desc.format).toBe('Troubleshooting');
      expect(desc.label).toBe('Troubleshooting');
      expect(desc.routePrefix).toBe('/troubleshoot');
      expect(desc.countsForStreak).toBe(true);
      expect(desc.isDailyEligible).toBe(true);
    });

    it('identifies authored and client drills', () => {
      expect(desc.isAuthored(ts)).toBe(true);
      expect(desc.isClient(ts)).toBe(true);
      const clientTs = desc.sanitizeForClient(ts);
      expect(desc.isClient(clientTs)).toBe(true);
      expect(desc.isAuthored(clientTs)).toBe(false);
    });

    it('calculates question count as 1', () => {
      expect(desc.getQuestionCount(ts)).toBe(2);
    });

    it('sanitizes drill by stripping goldCause, hiddenDistractors, and fix', () => {
      const sanitized = desc.sanitizeForClient(ts);
      expect('goldCause' in sanitized).toBe(false);
      expect('hiddenDistractors' in sanitized).toBe(false);
      expect('fix' in sanitized).toBe(false);
      expect(sanitized.id).toBe(ts.id);
      expect(sanitized.architecture).toEqual(ts.architecture);
      expect(sanitized.issue).toBe(ts.issue);
      expect(sanitized.probes).toEqual(ts.probes);
    });

    it('validates a valid troubleshooting drill with no findings', () => {
      const findings: ValidationFinding[] = [];
      desc.validate(ts as unknown as Record<string, unknown>, {}, findings);
      expect(findings).toEqual([]);
    });

    it('lints wording of troubleshooting drill', () => {
      const findings = desc.lintWording(ts);
      expect(findings).toEqual([]);
    });
  });
});
