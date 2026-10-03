import { describe, expect, it } from 'vitest';
import type { GradeCauseResult } from '../scoring/grader/types.js';
import type { TroubleshootingDrillDefinition } from '../types/drill.js';
import { createTroubleshootSessionState, troubleshootSessionReducer } from './reducer.js';

const DRILL: TroubleshootingDrillDefinition = {
  id: 'AGD-01001',
  title: 'Intermittent Zero-Copy segment refresh timeouts',
  format: 'Troubleshooting',
  domain: 'Data_Architecture',
  domainLabel: 'Data Architecture',
  difficulty: 'Lead_CTA',
  pillars: ['Reliability', 'Operational_Excellence'],
  version: 1,
  status: 'draft',
  architecture: {
    synopsis:
      'CRM Core feeds identity into Data Cloud. A Zero Copy Data Stream reads curated tables in Snowflake. Segment refresh jobs run hourly.',
    diagramUrl: '/diagrams/agd-00807-bdt-materialization-topology.svg',
    diagramLabel: 'Zero Copy + BDT + segments',
  },
  issue:
    'Segment refreshes intermittently fail with query timeout near the top of the hour after a warehouse enlarge.',
  probeBudget: 3,
  probes: [
    {
      id: 'p1',
      label: 'What changed in the curated DLO?',
      tier: 'pivotal',
      answer: 'Two formula fields',
    },
    { id: 'p2', label: 'Do BDT runs overlap segment refresh?', tier: 'pivotal', answer: 'Yes' },
    {
      id: 'p3',
      label: 'Are timeouts correlated with a segment?',
      tier: 'useful',
      answer: 'Same DLO',
    },
    {
      id: 'p4',
      label: 'Is the connector hitting rate limits?',
      tier: 'distractor',
      answer: 'No',
      distractorAntipattern: 'Blame Connector Ceiling',
    },
    {
      id: 'p5',
      label: 'Did identity sync lag increase?',
      tier: 'distractor',
      answer: 'Unchanged',
      distractorAntipattern: 'Identity Sync Distraction',
    },
    {
      id: 'p6',
      label: 'Is cross-region latency elevated?',
      tier: 'distractor',
      answer: 'No',
      distractorAntipattern: 'Network Ghost Hunt',
    },
    {
      id: 'p7',
      label: 'What does the query profile show?',
      tier: 'useful',
      answer: 'Long scan + spill',
    },
  ],
  goldCause: {
    text: 'Formula fields force expensive Zero Copy evaluation overlapping segment refresh.',
    rationale: 'Concurrent evaluation plus schedule collision, not warehouse size.',
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

describe('troubleshootSessionReducer', () => {
  it('walks brief → probes → cause → commit → feedback → complete with dual score', () => {
    let state = createTroubleshootSessionState(DRILL);
    expect(state.phase).toBe('brief');

    state = troubleshootSessionReducer(state, { type: 'BEGIN_PROBES' });
    expect(state.phase).toBe('probes');

    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p1' });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p2' });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p4' });
    // Budget exhausted — fourth pick ignored
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p3' });
    expect(state.selectedProbeIds).toEqual(['p1', 'p2', 'p4']);

    state = troubleshootSessionReducer(state, { type: 'LOCK_PROBES' });
    expect(state.phase).toBe('cause');
    expect(state.probesLocked).toBe(true);

    state = troubleshootSessionReducer(state, {
      type: 'SET_CAUSE_TEXT',
      text: 'Formula fields plus BDT overlap cause timeouts.',
    });
    state = troubleshootSessionReducer(state, { type: 'BEGIN_COMMIT' });
    expect(state.phase).toBe('commit');

    const correctGrade: GradeCauseResult = {
      verdict: 'correct',
      isCorrect: true,
      chosenId: 'gold',
      scores: [],
      goldScore: 0.82,
      bestDistractorScore: 0.08,
      otherScore: 0.02,
      matchedDistractor: null,
      goldText: DRILL.goldCause.text,
      goldRationale: DRILL.goldCause.rationale,
    };
    state = troubleshootSessionReducer(state, {
      type: 'COMMIT_CONFIDENCE',
      confidence: 0.85,
      grade: correctGrade,
    });
    expect(state.phase).toBe('feedback');
    expect(state.grade?.verdict).toBe('correct');
    expect(state.isCorrect).toBe(true);
    expect(state.probeScore).toBe(35); // 50 pivotal - 15 distractor
    expect(state.missedAllPivotal).toBe(false);
    // Dual score: probe + Brier on correct @ 0.85 → 50*(1-0.15)^2 wait: points = round(100*(1-(1-0.85)^2)) = round(100*(1-0.0225)) = 98
    expect(state.causeScore).toBe(98);
    expect(state.totalScore).toBe(35 + 98);

    state = troubleshootSessionReducer(state, { type: 'FINISH' });
    expect(state.isCompleted).toBe(true);
    expect(state.attempt?.format).toBe('Troubleshooting');
    expect(state.attempt?.accuracy).toBe(1);
    expect(state.attempt?.steps?.[0]?.selectedProbeIds).toEqual(['p1', 'p2', 'p4']);
    expect(state.attempt?.steps?.[0]?.causeVerdict).toBe('correct');
    expect(state.attempt?.steps?.[0]?.isCorrect).toBe(true);
  });

  it('counts a correct cause after poor probes without voiding the cause grade', () => {
    let state = createTroubleshootSessionState(DRILL);
    state = troubleshootSessionReducer(state, { type: 'BEGIN_PROBES' });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p4' });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p5' });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p6' });
    state = troubleshootSessionReducer(state, { type: 'LOCK_PROBES' });
    state = troubleshootSessionReducer(state, {
      type: 'SET_CAUSE_TEXT',
      text: 'Formula fields overlap BDT with segment refresh.',
    });
    state = troubleshootSessionReducer(state, { type: 'BEGIN_COMMIT' });
    const correctGrade: GradeCauseResult = {
      verdict: 'correct',
      isCorrect: true,
      chosenId: 'gold',
      scores: [],
      goldScore: 0.9,
      bestDistractorScore: 0.03,
      otherScore: 0.02,
      matchedDistractor: null,
      goldText: DRILL.goldCause.text,
      goldRationale: DRILL.goldCause.rationale,
    };
    state = troubleshootSessionReducer(state, {
      type: 'COMMIT_CONFIDENCE',
      confidence: 0.7,
      grade: correctGrade,
    });

    expect(state.isCorrect).toBe(true);
    expect(state.missedAllPivotal).toBe(true);
    expect(state.probeScore).toBe(0);
    expect(state.grade?.verdict).toBe('correct');
  });

  it('attaches matched distractor antipattern on incorrect_distractor', () => {
    let state = createTroubleshootSessionState(DRILL);
    state = troubleshootSessionReducer(state, { type: 'BEGIN_PROBES' });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p1' });
    state = troubleshootSessionReducer(state, { type: 'LOCK_PROBES' });
    state = troubleshootSessionReducer(state, {
      type: 'SET_CAUSE_TEXT',
      text: 'Warehouse is undersized.',
    });
    state = troubleshootSessionReducer(state, { type: 'BEGIN_COMMIT' });
    const distractorGrade: GradeCauseResult = {
      verdict: 'incorrect_distractor',
      isCorrect: false,
      chosenId: 'd1',
      scores: [],
      goldScore: 0.1,
      bestDistractorScore: 0.7,
      otherScore: 0.1,
      matchedDistractor: { ...DRILL.hiddenDistractors[0], score: 0.7 },
      goldText: DRILL.goldCause.text,
      goldRationale: DRILL.goldCause.rationale,
    };
    state = troubleshootSessionReducer(state, {
      type: 'COMMIT_CONFIDENCE',
      confidence: 0.95,
      grade: distractorGrade,
    });

    expect(state.isCorrect).toBe(false);
    expect(state.grade?.verdict).toBe('incorrect_distractor');
    expect(state.distractorAntipattern).toBe('Scale First Warehouse');
  });

  it('ignores illegal phase transitions', () => {
    let state = createTroubleshootSessionState(DRILL);
    state = troubleshootSessionReducer(state, { type: 'LOCK_PROBES' });
    expect(state.phase).toBe('brief');
    state = troubleshootSessionReducer(state, { type: 'BEGIN_PROBES' });
    state = troubleshootSessionReducer(state, { type: 'BEGIN_COMMIT' });
    expect(state.phase).toBe('probes');
  });
});
