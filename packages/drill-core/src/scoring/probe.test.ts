import { describe, expect, it } from 'vitest';
import type { ProbeOptionDTO } from '../types/drill.js';
import {
  calculateCaseFileScore,
  calculateProbeDecisionScore,
  calculateProbeQuality,
  calculateStationScore,
} from './probe.js';

const PROBES: ProbeOptionDTO[] = [
  { id: 'p1', label: 'Peak order volume?', tier: 'pivotal', answer: '2M orders/day' },
  { id: 'p2', label: 'External IdP?', tier: 'pivotal', answer: 'Okta OIDC' },
  { id: 'p3', label: 'Preferred UI framework?', tier: 'useful', answer: 'LWC preferred' },
  {
    id: 'p4',
    label: 'Can we buy more licenses?',
    tier: 'distractor',
    answer: 'Budget frozen',
    distractorAntipattern: 'License First Thinking',
  },
  {
    id: 'p5',
    label: 'Which consulting partner?',
    tier: 'distractor',
    answer: 'Undecided',
    distractorAntipattern: 'Partner Fishing',
  },
];

describe('calculateProbeQuality', () => {
  it('scores full pivotal hit with no waste', () => {
    const result = calculateProbeQuality(PROBES, ['p1', 'p2', 'p3']);
    expect(result.pivotalHit).toBe(2);
    expect(result.pivotalTotal).toBe(2);
    expect(result.usefulHit).toBe(1);
    expect(result.distractorCount).toBe(0);
    expect(result.probeScore).toBe(60); // 50 + 10 useful, capped
    expect(result.missedAllPivotal).toBe(false);
  });

  it('penalizes distractor waste and missed pivotal', () => {
    const result = calculateProbeQuality(PROBES, ['p4', 'p5', 'p3']);
    expect(result.pivotalHit).toBe(0);
    expect(result.distractorCount).toBe(2);
    expect(result.missedAllPivotal).toBe(true);
    // raw = 0 - 30 + 10 = -20 → clamped to 0
    expect(result.probeScore).toBe(0);
  });

  it('partial pivotal hit halves the discovery component', () => {
    const result = calculateProbeQuality(PROBES, ['p1']);
    expect(result.pivotalHit).toBe(1);
    expect(result.probeScore).toBe(25); // 50 * 0.5
  });
});

describe('calculateProbeDecisionScore', () => {
  it('combines probe quality with Brier decision points', () => {
    const result = calculateProbeDecisionScore({
      probes: PROBES,
      selectedProbeIds: ['p1', 'p2'],
      confidence: 0.95,
      isCorrect: true,
    });
    expect(result.probe.probeScore).toBe(50);
    expect(result.decisionScore).toBe(100);
    expect(result.totalScore).toBe(150);
    expect(result.quadrant).toBe('Calibrated_Conviction');
    expect(result.overconfidencePenaltyApplied).toBe(false);
  });
});

describe('calculateStationScore', () => {
  it('combines probe quality with Brier recommendation points', () => {
    const result = calculateStationScore({
      probes: PROBES,
      selectedProbeIds: ['p1', 'p2'],
      confidence: 0.95,
      isCorrect: true,
    });
    expect(result.probe.probeScore).toBe(50);
    expect(result.recommendationScore).toBe(100);
    expect(result.stationScore).toBe(150);
    expect(result.quadrant).toBe('Calibrated_Conviction');
  });
});

describe('calculateCaseFileScore', () => {
  it('averages stations and flags discovery failure with legacy probe struct', () => {
    const a = calculateStationScore({
      probes: PROBES,
      selectedProbeIds: ['p1', 'p2'],
      confidence: 0.85,
      isCorrect: true,
    });
    const b = calculateStationScore({
      probes: PROBES,
      selectedProbeIds: ['p4'],
      confidence: 0.5,
      isCorrect: false,
    });
    const pack = calculateCaseFileScore([
      { probe: a.probe, stationScore: a.stationScore },
      { probe: b.probe, stationScore: b.stationScore },
    ]);
    expect(pack.discoveryFailure).toBe(true);
    expect(pack.stationScores).toHaveLength(2);
    expect(pack.meanScore).toBe(Math.round((a.stationScore + b.stationScore) / 2));
  });

  it('averages stations and flags discovery failure with direct entry shape', () => {
    const pack = calculateCaseFileScore([
      { stationScore: 120, missedAllPivotal: false },
      { stationScore: 40, missedAllPivotal: true },
    ]);
    expect(pack.discoveryFailure).toBe(true);
    expect(pack.stationScores).toEqual([120, 40]);
    expect(pack.meanScore).toBe(80);
  });
});
