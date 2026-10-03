import { describe, expect, it } from 'vitest';
import {
  type CaseFileDrillDefinition,
  type RapidFireDrillDefinition,
  type TroubleshootingDrillDefinition,
  type ValidationContext,
  validateDrill,
} from '../index.js';

const VALID_CITATION = 'https://architect.salesforce.com/well-architected/principles';

function minimalRapidFire(): RapidFireDrillDefinition {
  return {
    id: 'AGD-00101',
    title: 'Minimal Rapid Fire Title',
    domain: 'Platform_Core',
    domainLabel: 'Platform Core',
    difficulty: 'Lead_CTA',
    pillars: ['Trust'],
    version: 1,
    status: 'draft',
    format: 'Rapid_Fire',
    steps: [
      {
        id: 's1',
        prompt: 'What is the recommended approach?',
        options: [
          {
            id: 'opt_a',
            label: 'Option A description',
            isCorrect: true,
            rationale: 'Correct because of principle X',
            citationUrl: VALID_CITATION,
          },
          {
            id: 'opt_b',
            label: 'Option B description',
            isCorrect: false,
            distractorAntipattern: 'Antipattern Y',
            rationale: 'Fails because of constraint Y',
          },
        ],
      },
    ],
  };
}

function minimalCaseFile(): CaseFileDrillDefinition {
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
      synopsis: 'Evaluation brief synopsis',
    },
    stations: [
      {
        id: 'st1',
        domain: 'Platform_Core',
        boardDomain: 'Integration',
        prompt: 'Station 1 prompt',
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
            distractorAntipattern: 'Distract',
          },
        ],
        options: [
          {
            id: 'opt_1',
            label: 'Station recommendation 1',
            isCorrect: true,
            rationale: 'Rec rationale',
            citationUrl: VALID_CITATION,
          },
          {
            id: 'opt_2',
            label: 'Station recommendation 2',
            isCorrect: false,
            distractorAntipattern: 'Bad approach',
            rationale: 'Why it fails',
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
            distractorAntipattern: 'Distract',
          },
        ],
        options: [
          {
            id: 'opt_1',
            label: 'Station recommendation 1',
            isCorrect: true,
            rationale: 'Rec rationale',
            citationUrl: VALID_CITATION,
          },
          {
            id: 'opt_2',
            label: 'Station recommendation 2',
            isCorrect: false,
            distractorAntipattern: 'Bad approach',
            rationale: 'Why it fails',
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
            distractorAntipattern: 'Distract',
          },
        ],
        options: [
          {
            id: 'opt_1',
            label: 'Station recommendation 1',
            isCorrect: true,
            rationale: 'Rec rationale',
            citationUrl: VALID_CITATION,
          },
          {
            id: 'opt_2',
            label: 'Station recommendation 2',
            isCorrect: false,
            distractorAntipattern: 'Bad approach',
            rationale: 'Why it fails',
          },
        ],
      },
    ],
  };
}

function minimalTroubleshooting(): TroubleshootingDrillDefinition {
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
      synopsis: 'Topology synopsis',
      diagramUrl: '/diagrams/test-topology.svg',
    },
    issue: 'Failure symptom description',
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
        distractorAntipattern: 'Distract',
      },
      { id: 'p5', label: 'Q5?', tier: 'useful', answer: 'A5' },
    ],
    goldCause: {
      text: 'Root cause text',
      rationale: 'Why root cause holds',
      citationUrl: VALID_CITATION,
    },
    hiddenDistractors: [
      { id: 'd1', text: 'Wrong cause 1', antipattern: 'Antipattern 1', rationale: 'Fails 1' },
      { id: 'd2', text: 'Wrong cause 2', antipattern: 'Antipattern 2', rationale: 'Fails 2' },
      { id: 'd3', text: 'Wrong cause 3', antipattern: 'Antipattern 3', rationale: 'Fails 3' },
    ],
  };
}

function asMutable(obj: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
}

const manifestCtx: ValidationContext = {
  citationManifest: new Set([VALID_CITATION]),
  assetExists: () => true,
};

describe('validateDrill fixtures', () => {
  it('validates minimal Rapid Fire fixture successfully', () => {
    const res = validateDrill(minimalRapidFire(), manifestCtx);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.drill.id).toBe('AGD-00101');
      expect(res.drill.format).toBe('Rapid_Fire');
    }
  });

  it('validates minimal Case File fixture successfully', () => {
    const res = validateDrill(minimalCaseFile(), manifestCtx);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.drill.id).toBe('AGD-00201');
      expect(res.drill.format).toBe('Case_File');
    }
  });

  it('validates minimal Troubleshooting fixture successfully', () => {
    const res = validateDrill(minimalTroubleshooting(), manifestCtx);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.drill.id).toBe('AGD-00301');
      expect(res.drill.format).toBe('Troubleshooting');
    }
  });
});

describe('validateDrill ruleId coverage', () => {
  it('detects missing-field', () => {
    const raw = asMutable(minimalRapidFire());
    delete raw.title;
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({ ruleId: 'missing-field', where: 'title' }),
      );
    }
  });

  it('detects invalid-enum at domain', () => {
    const raw = asMutable(minimalRapidFire());
    raw.domain = 'Invalid_Domain_Name';
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({ ruleId: 'invalid-enum', where: 'domain' }),
      );
    }
  });

  it('detects option-set on fewer than 2 options or missing correct option', () => {
    const raw = asMutable(minimalRapidFire());
    const steps = raw.steps as Array<Record<string, unknown>>;
    steps[0].options = [(steps[0].options as unknown[])[0]]; // only 1 option
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({ ruleId: 'option-set', where: 'step s1 options' }),
      );
    }

    const noCorrect = asMutable(minimalRapidFire());
    const noCorrectSteps = noCorrect.steps as Array<Record<string, unknown>>;
    const opts = noCorrectSteps[0].options as Array<Record<string, unknown>>;
    opts[0].isCorrect = false;
    opts[0].distractorAntipattern = 'Antipattern';
    const res2 = validateDrill(noCorrect, manifestCtx);
    expect(res2.ok).toBe(false);
    if (!res2.ok) {
      expect(res2.findings).toContainEqual(
        expect.objectContaining({ ruleId: 'option-set', where: 'step s1 options' }),
      );
    }
  });

  it('detects missing-rationale', () => {
    const raw = asMutable(minimalRapidFire());
    const steps = raw.steps as Array<Record<string, unknown>>;
    const opts = steps[0].options as Array<Record<string, unknown>>;
    opts[0].rationale = '';
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({
          ruleId: 'missing-rationale',
          where: 'step s1 option opt_a rationale',
        }),
      );
    }
  });

  it('detects missing-distractor-antipattern on incorrect option or distractor probe', () => {
    const raw = asMutable(minimalRapidFire());
    const steps = raw.steps as Array<Record<string, unknown>>;
    const opts = steps[0].options as Array<Record<string, unknown>>;
    delete opts[1].distractorAntipattern;
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({
          ruleId: 'missing-distractor-antipattern',
          where: 'step s1 option opt_b distractorAntipattern',
        }),
      );
    }

    const rawCf = asMutable(minimalCaseFile());
    const stations = rawCf.stations as Array<Record<string, unknown>>;
    const probes = stations[0].probes as Array<Record<string, unknown>>;
    delete probes[4].distractorAntipattern;
    const resCf = validateDrill(rawCf, manifestCtx);
    expect(resCf.ok).toBe(false);
    if (!resCf.ok) {
      expect(resCf.findings).toContainEqual(
        expect.objectContaining({
          ruleId: 'missing-distractor-antipattern',
          where: 'station st1 probe p5 distractorAntipattern',
        }),
      );
    }
  });

  it('detects probe-pool violations', () => {
    const raw = asMutable(minimalCaseFile());
    const stations = raw.stations as Array<Record<string, unknown>>;
    const probes = stations[0].probes as Array<Record<string, unknown>>;
    probes.pop(); // now 4 probes (minimum 5)
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({ ruleId: 'probe-pool', where: 'station st1 probes' }),
      );
    }
  });

  it('detects station-set violations', () => {
    const raw = asMutable(minimalCaseFile());
    const stations = raw.stations as Array<Record<string, unknown>>;
    stations.pop(); // now 2 stations (minimum 3)
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({ ruleId: 'station-set', where: 'stations' }),
      );
    }
  });

  it('detects hidden-distractors violations', () => {
    const raw = asMutable(minimalTroubleshooting());
    const distractors = raw.hiddenDistractors as Array<Record<string, unknown>>;
    distractors.pop(); // now 2 hidden distractors (exactly 3 required)
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({ ruleId: 'hidden-distractors', where: 'hiddenDistractors' }),
      );
    }
  });

  it('detects citation-manifest violations when manifest is provided', () => {
    const raw = asMutable(minimalRapidFire());
    const steps = raw.steps as Array<Record<string, unknown>>;
    const opts = steps[0].options as Array<Record<string, unknown>>;
    opts[0].citationUrl = 'https://architect.salesforce.com/not-in-manifest';
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({
          ruleId: 'citation-manifest',
          where: 'step s1 option opt_a citationUrl',
        }),
      );
    }
  });

  it('detects missing-asset when assetExists returns false or invalid path format', () => {
    const raw = asMutable(minimalTroubleshooting());
    const arch = raw.architecture as Record<string, unknown>;
    arch.diagramUrl = 'relative/path.svg';
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings).toContainEqual(
        expect.objectContaining({
          ruleId: 'missing-asset',
          where: 'architecture.diagramUrl',
        }),
      );
    }

    const rawMissing = asMutable(minimalTroubleshooting());
    const resMissing = validateDrill(rawMissing, {
      citationManifest: new Set([VALID_CITATION]),
      assetExists: () => false,
    });
    expect(resMissing.ok).toBe(false);
    if (!resMissing.ok) {
      expect(resMissing.findings).toContainEqual(
        expect.objectContaining({
          ruleId: 'missing-asset',
          where: 'architecture.diagramUrl',
        }),
      );
    }
  });
});

describe('validateDrill context & short-circuit behavior', () => {
  it('stops validation on top-level failure (returns only top-level findings)', () => {
    const raw = asMutable(minimalRapidFire());
    raw.domain = 'Invalid_Domain';
    raw.steps = []; // would produce missing-field on steps if not stopped
    const res = validateDrill(raw, manifestCtx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.findings.length).toBe(1);
      expect(res.findings[0]).toEqual(
        expect.objectContaining({ ruleId: 'invalid-enum', where: 'domain' }),
      );
    }
  });

  it('falls back to host allowlist when citationManifest is absent', () => {
    const raw = asMutable(minimalRapidFire());
    const steps = raw.steps as Array<Record<string, unknown>>;
    const opts = steps[0].options as Array<Record<string, unknown>>;
    // Allowlisted host not in manifest
    opts[0].citationUrl = 'https://help.salesforce.com/some/article';
    const res = validateDrill(raw, {});
    expect(res.ok).toBe(true);

    // Non-allowlisted host rejected
    opts[0].citationUrl = 'https://external-blog.com/post';
    const res2 = validateDrill(raw, {});
    expect(res2.ok).toBe(false);
    if (!res2.ok) {
      expect(res2.findings).toContainEqual(
        expect.objectContaining({
          ruleId: 'citation-manifest',
          where: 'step s1 option opt_a citationUrl',
        }),
      );
    }
  });

  it('produces no missing-asset findings when assetExists is absent', () => {
    const raw = minimalTroubleshooting();
    const res = validateDrill(raw, {
      citationManifest: new Set([VALID_CITATION]),
    });
    expect(res.ok).toBe(true);
  });
});
