import { describe, expect, it } from 'vitest';
import type { CaseFileDrillDefinition } from '../types/drill.js';
import { caseSessionReducer, createCaseSessionState, getCurrentCaseStation } from './reducer.js';

const DRILL: CaseFileDrillDefinition = {
  id: 'AGD-00901',
  title: 'Test Case File',
  format: 'Case_File',
  domain: 'Integration_Apis',
  domainLabel: 'Case File Fixture',
  difficulty: 'Lead_CTA',
  pillars: ['Reliability', 'Trust'],
  version: 1,
  status: 'draft',
  brief: {
    title: 'Northwind Logistics',
    synopsis: 'A logistics firm needs Salesforce for order orchestration across three regions.',
  },
  stations: [
    {
      id: 'st1',
      domain: 'Integration_Apis',
      boardDomain: 'Integration',
      prompt: 'Which integration pattern should carry order status to the warehouse?',
      probeBudget: 3,
      probes: [
        { id: 'p1', label: 'How many warehouse systems?', tier: 'pivotal', answer: 'Three ERPs' },
        {
          id: 'p2',
          label: 'Must the payload include line items?',
          tier: 'pivotal',
          answer: 'Yes, computed payload',
        },
        { id: 'p3', label: 'Preferred middleware brand?', tier: 'useful', answer: 'Open' },
        {
          id: 'p4',
          label: 'Can we buy more Salesforce licenses?',
          tier: 'distractor',
          answer: 'Budget frozen',
          distractorAntipattern: 'License First Thinking',
        },
        {
          id: 'p5',
          label: 'Which SI partner is preferred?',
          tier: 'distractor',
          answer: 'Undecided',
          distractorAntipattern: 'Partner Fishing',
        },
        {
          id: 'p6',
          label: 'Do they use Slack?',
          tier: 'distractor',
          answer: 'Yes',
          distractorAntipattern: 'Collab Distraction',
        },
        {
          id: 'p7',
          label: 'Office locations?',
          tier: 'distractor',
          answer: 'Four cities',
          distractorAntipattern: 'Geo Fishing',
        },
      ],
      options: [
        {
          id: 'o1',
          label: 'Custom platform event with Apex-built payload',
          isCorrect: true,
          rationale: 'Publish/subscribe reaches every warehouse without coupling.',
          citationUrl:
            'https://architect.salesforce.com/docs/architect/decision-guides/guide/event-driven.html#publishsubscribe',
        },
        {
          id: 'o2',
          label: 'Synchronous callout per warehouse from the Order trigger',
          isCorrect: false,
          distractorAntipattern: 'Sync Callout Fan-Out',
          rationale: 'Ties Order saves to every consumer and burns callout limits.',
        },
      ],
    },
  ],
};

describe('caseSessionReducer', () => {
  it('walks brief → probes → commit → feedback → complete', () => {
    let state = createCaseSessionState(DRILL);
    expect(state.phase).toBe('brief');

    state = caseSessionReducer(state, { type: 'BEGIN_STATIONS' });
    expect(state.phase).toBe('probes');

    state = caseSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p1' });
    state = caseSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p2' });
    state = caseSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p4' });
    // Budget exhausted — fourth pick ignored
    state = caseSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'p3' });
    expect(getCurrentCaseStation(state)?.selectedProbeIds).toEqual(['p1', 'p2', 'p4']);

    state = caseSessionReducer(state, { type: 'LOCK_PROBES' });
    expect(state.phase).toBe('commit');

    state = caseSessionReducer(state, { type: 'SELECT_OPTION', optionId: 'o1' });
    state = caseSessionReducer(state, { type: 'COMMIT_CONFIDENCE', confidence: 0.85 });
    expect(state.phase).toBe('feedback');
    const station = getCurrentCaseStation(state);
    expect(station?.isSubmitted).toBe(true);
    expect(station?.isCorrect).toBe(true);
    expect(station?.probeScore).toBe(35); // 50 pivotal - 15 distractor

    state = caseSessionReducer(state, { type: 'ADVANCE_STATION' });
    expect(state.isCompleted).toBe(true);
    expect(state.attempt?.format).toBe('Case_File');
    expect(state.attempt?.steps?.[0]?.selectedProbeIds).toEqual(['p1', 'p2', 'p4']);
  });

  it('rejects unknown probe IDs not present in the station probe pool', () => {
    let state = createCaseSessionState(DRILL);
    state = caseSessionReducer(state, { type: 'BEGIN_STATIONS' });
    state = caseSessionReducer(state, { type: 'TOGGLE_PROBE', probeId: 'non_existent_probe' });
    expect(getCurrentCaseStation(state)?.selectedProbeIds).toEqual([]);
  });
});
