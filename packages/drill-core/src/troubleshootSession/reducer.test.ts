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
    citationUrl: 'https://architect.salesforce.com/principles',
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
    prompt: 'Select the architectural remediation for the segment refresh timeouts:',
    options: [
      {
        id: 'fix_gold',
        label:
          'Materialize curated DLO formula fields into physical Snowflake columns prior to Zero Copy ingestion and stagger the BDT schedule.',
        rationale:
          'Eliminates on-the-fly formula recalculation overhead during query execution and separates compute windows.',
        isCorrect: true,
        citationUrl: 'https://architect.salesforce.com/principles',
      },
      {
        id: 'fix_d1',
        label: 'Upsize Snowflake warehouse from 2X-Large to 4X-Large.',
        rationale:
          'Fails because formula evaluation on unmaterialized views does not scale linearly with warehouse resize.',
        isCorrect: false,
        distractorAntipattern: 'Scale First Warehouse',
      },
      {
        id: 'fix_d2',
        label:
          'Configure an AWS Direct Connect dedicated link to reduce network transport latency.',
        rationale:
          'Latency was verified normal; connector throughput is constrained by query processing time, not network hops.',
        isCorrect: false,
        distractorAntipattern: 'Network Ghost Hunt',
      },
    ],
  },
};

describe('troubleshootSessionReducer', () => {
  it('walks brief → first_call → probes → cause → commit_cause → cause_reveal → fix → commit_fix → feedback → complete', () => {
    let state = createTroubleshootSessionState(DRILL);
    expect(state.phase).toBe('brief');

    state = troubleshootSessionReducer(state, { type: 'BEGIN_DRILL' });
    expect(state.phase).toBe('first_call');

    state = troubleshootSessionReducer(state, {
      type: 'SUBMIT_FIRST_CALL',
      hypothesis: 'Warehouse is probably undersized during peak hours',
      confidence: 0.7,
    });
    expect(state.phase).toBe('probes');
    expect(state.firstCall?.hypothesis).toBe('Warehouse is probably undersized during peak hours');

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
    state = troubleshootSessionReducer(state, { type: 'BEGIN_COMMIT_CAUSE' });
    expect(state.phase).toBe('commit_cause');

    const correctGrade: GradeCauseResult = {
      verdict: 'correct',
      isCorrect: true,
      score: 100,
      confidence: 0.85,
      rationale: 'Matches root cause',
      goldText: DRILL.goldCause.text,
      goldRationale: DRILL.goldCause.rationale,
      fix: DRILL.fix,
    };
    state = troubleshootSessionReducer(state, {
      type: 'RECEIVE_CAUSE_GRADE',
      confidence: 0.85,
      grade: correctGrade,
      fix: DRILL.fix,
    });
    expect(state.phase).toBe('cause_reveal');
    expect(state.grade?.verdict).toBe('correct');
    expect(state.isCorrect).toBe(true);
    expect(state.probeScore).toBe(35); // 50 pivotal - 15 distractor
    expect(state.missedAllPivotal).toBe(false);
    expect(state.causeScore).toBe(98);

    state = troubleshootSessionReducer(state, { type: 'PROCEED_TO_FIX' });
    expect(state.phase).toBe('fix');

    state = troubleshootSessionReducer(state, {
      type: 'SELECT_FIX_OPTION',
      optionId: 'fix_gold',
    });
    expect(state.selectedFixOptionId).toBe('fix_gold');

    state = troubleshootSessionReducer(state, { type: 'BEGIN_COMMIT_FIX' });
    expect(state.phase).toBe('commit_fix');

    state = troubleshootSessionReducer(state, {
      type: 'COMMIT_FIX_CONFIDENCE',
      confidence: 0.85,
    });
    expect(state.phase).toBe('feedback');
    expect(state.isFixCorrect).toBe(true);
    expect(state.fixScore).toBe(98);
    expect(state.totalScore).toBe(35 + 98 + 98);

    state = troubleshootSessionReducer(state, { type: 'FINISH' });
    expect(state.isCompleted).toBe(true);
    expect(state.attempt?.format).toBe('Troubleshooting');
    expect(state.attempt?.accuracy).toBe(1);
    expect(state.attempt?.steps?.[0]?.selectedProbeIds).toEqual(['p1', 'p2', 'p4']);
    expect(state.attempt?.steps?.[0]?.causeVerdict).toBe('correct');
    expect(state.attempt?.steps?.[0]?.isCorrect).toBe(true);
    expect(state.attempt?.steps?.[0]?.firstCall?.hypothesis).toBe(
      'Warehouse is probably undersized during peak hours',
    );
    expect(state.attempt?.steps?.[0]?.selectedFixOptionId).toBe('fix_gold');
    expect(state.attempt?.steps?.[0]?.fixScore).toBe(98);
  });

  it('counts a correct cause after poor probes without voiding the cause grade', () => {
    let state = createTroubleshootSessionState(DRILL);
    state = troubleshootSessionReducer(state, { type: 'BEGIN_DRILL' });
    state = troubleshootSessionReducer(state, {
      type: 'SUBMIT_FIRST_CALL',
      hypothesis: 'Initial guess',
    });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p4' });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p5' });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p6' });
    state = troubleshootSessionReducer(state, { type: 'LOCK_PROBES' });
    state = troubleshootSessionReducer(state, {
      type: 'SET_CAUSE_TEXT',
      text: 'Formula fields overlap BDT with segment refresh.',
    });
    state = troubleshootSessionReducer(state, { type: 'BEGIN_COMMIT_CAUSE' });
    const correctGrade: GradeCauseResult = {
      verdict: 'correct',
      isCorrect: true,
      score: 100,
      confidence: 0.7,
      rationale: 'Correct',
      goldText: DRILL.goldCause.text,
      goldRationale: DRILL.goldCause.rationale,
      fix: DRILL.fix,
    };
    state = troubleshootSessionReducer(state, {
      type: 'RECEIVE_CAUSE_GRADE',
      confidence: 0.7,
      grade: correctGrade,
      fix: DRILL.fix,
    });

    expect(state.isCorrect).toBe(true);
    expect(state.missedAllPivotal).toBe(true);
    expect(state.probeScore).toBe(0);
    expect(state.grade?.verdict).toBe('correct');
  });

  it('attaches matched distractor antipattern on incorrect_distractor', () => {
    let state = createTroubleshootSessionState(DRILL);
    state = troubleshootSessionReducer(state, { type: 'BEGIN_DRILL' });
    state = troubleshootSessionReducer(state, {
      type: 'SUBMIT_FIRST_CALL',
      hypothesis: 'Guess',
    });
    state = troubleshootSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p1' });
    state = troubleshootSessionReducer(state, { type: 'LOCK_PROBES' });
    state = troubleshootSessionReducer(state, {
      type: 'SET_CAUSE_TEXT',
      text: 'Warehouse is undersized.',
    });
    state = troubleshootSessionReducer(state, { type: 'BEGIN_COMMIT_CAUSE' });
    const distractorGrade: GradeCauseResult = {
      verdict: 'incorrect_distractor',
      isCorrect: false,
      score: 10,
      confidence: 0.95,
      rationale: 'Matched distractor',
      matchedDistractor: {
        antipattern: 'Scale First Warehouse',
        rationale: 'Warehouse was enlarged.',
      },
      goldText: DRILL.goldCause.text,
      goldRationale: DRILL.goldCause.rationale,
      fix: DRILL.fix,
    };
    state = troubleshootSessionReducer(state, {
      type: 'RECEIVE_CAUSE_GRADE',
      confidence: 0.95,
      grade: distractorGrade,
      fix: DRILL.fix,
    });

    expect(state.isCorrect).toBe(false);
    expect(state.grade?.verdict).toBe('incorrect_distractor');
    expect(state.distractorAntipattern).toBe('Scale First Warehouse');
  });

  it('ignores illegal phase transitions', () => {
    let state = createTroubleshootSessionState(DRILL);
    state = troubleshootSessionReducer(state, { type: 'LOCK_PROBES' });
    expect(state.phase).toBe('brief');
    state = troubleshootSessionReducer(state, { type: 'BEGIN_DRILL' });
    expect(state.phase).toBe('first_call');
    state = troubleshootSessionReducer(state, { type: 'BEGIN_COMMIT_CAUSE' });
    expect(state.phase).toBe('first_call');
  });
});
