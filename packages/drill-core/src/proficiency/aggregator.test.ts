import { describe, it, expect } from 'vitest';
import { calculateProficiencyReport, getDrillQuestionCount } from './aggregator.js';
import {
  DrillDefinitionDTO,
  DrillAttemptRecord,
  RapidFireDrillDefinition,
  LessonDrillDefinition,
  DiagramDrillDefinition,
} from '../types/drill.js';

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
        { id: 'o2', label: 'Option 2', isCorrect: false, rationale: 'r2', distractorAntipattern: 'a2' },
      ],
    },
    {
      id: 's2',
      prompt: 'Step 2',
      options: [
        { id: 'o3', label: 'Option 3', isCorrect: true, rationale: 'r3' },
      ],
    },
    {
      id: 's3',
      prompt: 'Step 3',
      options: [
        { id: 'o4', label: 'Option 4', isCorrect: true, rationale: 'r4' },
      ],
    },
  ],
};

const mockLessonDrill: LessonDrillDefinition = {
  id: 'DR-002',
  title: 'Platform Event Architecture',
  format: 'Lesson',
  domain: 'Integration_Apis',
  domainLabel: 'Integration',
  difficulty: 'Lead_CTA',
  pillars: ['Reliability', 'Trust'],
  version: 1,
  status: 'published',
  stages: [
    {
      stageNumber: 1,
      stageName: 'Stage 1',
      scenario: 'Scen 1',
      options: [{ id: 'opt1', text: 'Text 1', isCorrect: true, coachingFeedback: 'fb1' }],
    },
    {
      stageNumber: 2,
      stageName: 'Stage 2',
      scenario: 'Scen 2',
      options: [{ id: 'opt2', text: 'Text 2', isCorrect: false, coachingFeedback: 'fb2' }],
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
      sourceDiagramUrl: 'https://architect.salesforce.com/docs/architect/fundamentals/guide/data-360-architecture.html',
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
  mockLessonDrill,
  mockDiagramDrill,
];

describe('getDrillQuestionCount', () => {
  it('correctly counts steps/stages and diagram dual commits', () => {
    expect(getDrillQuestionCount(mockRapidFireDrill)).toBe(3);
    expect(getDrillQuestionCount(mockLessonDrill)).toBe(2);
    expect(getDrillQuestionCount(mockDiagramDrill)).toBe(2);
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
    const dataArch = report.items.find((i) => i.id === 'Data_Architecture')!;
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
        format: 'Lesson',
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

  it('aggregates across Well-Architected pillars', () => {
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
        format: 'Lesson',
        completedAt: '2026-09-27T00:00:00Z',
        score: 50,
        accuracy: 0.5, // 1/2 right
        attemptsCount: 1,
      },
    };

    const report = calculateProficiencyReport(attempts, allMockDrills, 'pillars', 4);
    expect(report.totalCount).toBe(5);

    // Reliability is in both DR-001 (3 questions, 3 correct) and DR-002 (2 questions, 1 correct)
    // Total for Reliability = 3 + 2 = 5 questions, 3 + 1 = 4 correct (80%) -> measured!
    const rel = report.items.find((p) => p.id === 'Reliability')!;
    expect(rel.totalQuestions).toBe(5);
    expect(rel.correctQuestions).toBe(4);
    expect(rel.accuracy).toBe(80);
    expect(rel.isMeasured).toBe(true);
    expect(report.strengths).toContainEqual(rel);
  });
});
