import { describe, expect, it } from 'vitest';
import type {
  DiagramDrillDefinition,
  DrillAttemptRecord,
  DrillDefinitionDTO,
  RapidFireDrillDefinition,
} from '../types/drill.js';
import { calculateProficiencyReport, getDrillQuestionCount } from './aggregator.js';

const mockRapidFireDrill: RapidFireDrillDefinition = {
  id: 'DR-001',
  title: 'Data Cloud Federation',
  format: 'Rapid_Fire',
  domain: 'Data_Architecture',
  domainLabel: 'Data 360',
  difficulty: 'Lead_CTA',
  pillars: ['Reliability', 'Cost_Optimization'],
  version: 1,
  status: 'published',
  steps: [
    {
      id: 's1',
      prompt: 'Step 1',
      options: [
        { id: 'o1', label: 'Option 1', isCorrect: true, rationale: 'r1' },
        {
          id: 'o2',
          label: 'Option 2',
          isCorrect: false,
          rationale: 'r2',
          distractorAntipattern: 'a2',
        },
      ],
    },
    {
      id: 's2',
      prompt: 'Step 2',
      options: [{ id: 'o3', label: 'Option 3', isCorrect: true, rationale: 'r3' }],
    },
    {
      id: 's3',
      prompt: 'Step 3',
      options: [{ id: 'o4', label: 'Option 4', isCorrect: true, rationale: 'r4' }],
    },
  ],
};

const mockDiagramDrill2: DiagramDrillDefinition = {
  id: 'DR-002',
  title: 'Platform Event Architecture',
  format: 'Diagram',
  domain: 'Integration_Apis',
  domainLabel: 'Integration',
  difficulty: 'Lead_CTA',
  pillars: ['Reliability', 'Trust'],
  version: 1,
  status: 'published',
  steps: [
    {
      id: 's1',
      mode: 'compare',
      prompt: 'Which event delivery architecture avoids duplicate triggers?',
      sourceDiagramUrl:
        'https://architect.salesforce.com/docs/architect/fundamentals/guide/data-360-architecture.html',
      options: [
        {
          id: 'o1',
          label: 'Architecture A',
          diagramUrl: '/diagrams/event-bus-a.svg',
          isCorrect: true,
          rationale: 'Pub-sub pattern with replay ID.',
        },
        {
          id: 'o2',
          label: 'Architecture B',
          diagramUrl: '/diagrams/event-bus-b.svg',
          isCorrect: false,
          rationale: 'Lacks idempotency token.',
          distractorAntipattern: 'Missing Idempotency',
        },
      ],
    },
    {
      id: 's2',
      mode: 'compare',
      prompt: 'Step 2',
      sourceDiagramUrl:
        'https://architect.salesforce.com/docs/architect/fundamentals/guide/data-360-architecture.html',
      options: [
        {
          id: 'o3',
          label: 'Architecture C',
          diagramUrl: '/diagrams/event-bus-c.svg',
          isCorrect: true,
          rationale: 'Fine',
        },
      ],
    },
  ],
};

const mockDiagramDrill: DiagramDrillDefinition = {
  id: 'DR-003',
  title: 'Missing Identity Resolution',
  format: 'Diagram',
  domain: 'Data_Architecture',
  domainLabel: 'Data 360',
  difficulty: 'Lead_CTA',
  pillars: ['Trust'],
  version: 1,
  status: 'published',
  steps: [
    {
      id: 's1',
      mode: 'fault',
      prompt: 'Which missing component breaks unified profiles?',
      sourceDiagramUrl:
        'https://architect.salesforce.com/docs/architect/fundamentals/guide/data-360-architecture.html',
      variant: 'missing_node',
      graph: {
        nodes: [
          { id: 'dlo', label: 'DLO', kind: 'component' },
          { id: 'slot_ir', label: '?', kind: 'slot' },
        ],
        edges: [{ id: 'e1', source: 'dlo', target: 'slot_ir' }],
      },
      layout: { nodes: { dlo: { x: 0.2, y: 0.5 }, slot_ir: { x: 0.7, y: 0.5 } } },
      hotspots: [
        { id: 'slot_ir', targetKind: 'slot', isCorrect: true },
        { id: 'dlo', targetKind: 'node', isCorrect: false },
      ],
      options: [
        {
          id: 'o1',
          label: 'Identity Resolution',
          isCorrect: true,
          rationale: 'IR unifies profiles before activation.',
          citationUrl:
            'https://architect.salesforce.com/docs/architect/fundamentals/guide/data-360-architecture.html#identity-resolution',
        },
        {
          id: 'o2',
          label: 'Data Action',
          isCorrect: false,
          rationale: 'Actions fire after profiles exist.',
          distractorAntipattern: 'Activation Before Unification',
        },
      ],
    },
  ],
};

const allMockDrills: DrillDefinitionDTO[] = [
  mockRapidFireDrill,
  mockDiagramDrill2,
  mockDiagramDrill,
];

describe('getDrillQuestionCount', () => {
  it('correctly counts steps for Rapid Fire and Diagram drills', () => {
    expect(getDrillQuestionCount(mockRapidFireDrill)).toBe(3);
    expect(getDrillQuestionCount(mockDiagramDrill2)).toBe(2);
    expect(getDrillQuestionCount(mockDiagramDrill)).toBe(1);
  });
});

describe('calculateProficiencyReport', () => {
  it('returns empty progress when no drills completed', () => {
    const report = calculateProficiencyReport({}, allMockDrills, 'domains', 4);
    expect(report.totalQuestionsAnswered).toBe(0);
    expect(report.measuredCount).toBe(0);
    expect(report.totalCount).toBe(7);
    expect(report.collectingData.length).toBe(7);
    expect(report.whereToStart.length).toBe(0);
    expect(report.strengths.length).toBe(0);
  });

  it('aggregates domain stats and enforces 4-question threshold', () => {
    // DR-001 has 3 questions. Completed with 67% accuracy (2 of 3 right).
    const attempts: Record<string, DrillAttemptRecord> = {
      'DR-001': {
        drillId: 'DR-001',
        format: 'Rapid_Fire',
        completedAt: '2026-09-27T00:00:00Z',
        score: 150,
        accuracy: 2 / 3,
        attemptsCount: 1,
      },
    };

    const report = calculateProficiencyReport(attempts, allMockDrills, 'domains', 4);
    expect(report.totalQuestionsAnswered).toBe(3);
    // Data_Architecture has 3 questions, threshold is 4 -> still collecting data
    const dataArch = report.items.find((i) => i.id === 'Data_Architecture');
    expect(dataArch).toBeDefined();
    if (!dataArch) return;
    expect(dataArch.totalQuestions).toBe(3);
    expect(dataArch.correctQuestions).toBe(2);
    expect(dataArch.accuracy).toBe(67);
    expect(dataArch.isMeasured).toBe(false);
    expect(report.collectingData).toContainEqual(dataArch);
  });

  it('triages measured domains into strengths (>=80%) and whereToStart (<80%)', () => {
    // Simulate multiple attempts or enriched telemetry surpassing 4 questions
    const attempts: Record<string, DrillAttemptRecord> = {
      'DR-001': {
        drillId: 'DR-001',
        format: 'Rapid_Fire',
        completedAt: '2026-09-27T00:00:00Z',
        score: 150,
        accuracy: 1, // 3/3 right
        attemptsCount: 1,
        steps: [
          { stepId: 's1', confidence: 0.85, isCorrect: true, score: 90 },
          { stepId: 's2', confidence: 0.95, isCorrect: true, score: 98 },
          { stepId: 's3', confidence: 0.7, isCorrect: true, score: 85 },
          { stepId: 's4', confidence: 0.85, isCorrect: true, score: 90 },
        ],
      },
      'DR-002': {
        drillId: 'DR-002',
        format: 'Diagram',
        completedAt: '2026-09-27T00:00:00Z',
        score: 50,
        accuracy: 0.5,
        attemptsCount: 1,
        steps: [
          { stepId: 'st1', confidence: 0.7, isCorrect: true, score: 70 },
          { stepId: 'st2', confidence: 0.85, isCorrect: false, score: -20 },
          { stepId: 'st3', confidence: 0.7, isCorrect: false, score: -10 },
          { stepId: 'st4', confidence: 0.7, isCorrect: false, score: -10 },
        ],
      },
    };

    const report = calculateProficiencyReport(attempts, allMockDrills, 'domains', 4);
    expect(report.totalQuestionsAnswered).toBe(8);
    expect(report.measuredCount).toBe(2);

    // Data_Architecture: 4/4 = 100% -> Strengths
    expect(report.strengths.some((s) => s.id === 'Data_Architecture')).toBe(true);

    // Integration_Apis: 1/4 = 25% -> Where to start
    expect(report.whereToStart.some((w) => w.id === 'Integration_Apis')).toBe(true);
  });

  it('aggregates across the 7 Architectural Domains when threshold is passed directly', () => {
    const attempts: Record<string, DrillAttemptRecord> = {
      'DR-001': {
        drillId: 'DR-001',
        format: 'Rapid_Fire',
        completedAt: '2026-09-27T00:00:00Z',
        score: 150,
        accuracy: 1, // 3/3 right
        attemptsCount: 1,
      },
      'DR-002': {
        drillId: 'DR-002',
        format: 'Diagram',
        completedAt: '2026-09-27T00:00:00Z',
        score: 50,
        accuracy: 0.5, // 1/2 right
        attemptsCount: 1,
      },
    };

    const report = calculateProficiencyReport(attempts, allMockDrills, 2);
    expect(report.totalCount).toBe(7);
    expect(report.dimension).toBe('domains');

    // Data_Architecture has 3 questions, threshold is 2 -> measured
    const dataArch = report.items.find((p) => p.id === 'Data_Architecture');
    expect(dataArch).toBeDefined();
    if (!dataArch) return;
    expect(dataArch.totalQuestions).toBe(3);
    expect(dataArch.correctQuestions).toBe(3);
    expect(dataArch.accuracy).toBe(100);
    expect(dataArch.isMeasured).toBe(true);
    expect(report.strengths).toContainEqual(dataArch);
  });
});
