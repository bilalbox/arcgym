import type { TroubleshootingDrillDefinition } from '@arcgym/drill-core';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../_shared/env';
import { onRequestPost } from './grade';

const FIXTURE_DRILL: TroubleshootingDrillDefinition = {
  id: 'AGD-01001',
  title: 'Fixture Incident',
  format: 'Troubleshooting',
  domain: 'Data_Architecture',
  domainLabel: 'Data Architecture',
  difficulty: 'Lead_CTA',
  pillars: ['Reliability'],
  version: 1,
  status: 'published',
  architecture: {
    synopsis: 'CRM feeds Data Cloud. Zero Copy reads Snowflake.',
    diagramUrl: '/diagrams/fixture.svg',
  },
  issue: 'Segment refreshes intermittently time out near the top of the hour.',
  probeBudget: 3,
  probes: [{ id: 'p1', label: 'What changed?', tier: 'pivotal', answer: 'Formula fields added' }],
  goldCause: {
    text: 'Formula fields force expensive Zero Copy evaluation overlapping segment refresh.',
    rationale: 'Concurrent heavy evaluation plus schedule collision, not warehouse size.',
    citationUrl: 'https://architect.salesforce.com/docs/fixture',
    remediations: [
      {
        title: 'Separate batch transforms from refresh schedules',
        description: 'Ensure transforms do not overlap segment publish windows.',
        citationUrl: 'https://architect.salesforce.com/docs/fixture',
      },
    ],
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

function createMockEnv(overrides: Partial<Env> = {}): Env {
  const kvMap = new Map<string, unknown>([['drill:id:AGD-01001', FIXTURE_DRILL]]);

  return {
    AI: {
      run: vi.fn(async () => ({
        answers: {
          match: {
            choice: 'gold',
            probabilities: { gold: 0.85, d1: 0.05, d2: 0.04, d3: 0.03, other: 0.03 },
          },
        },
      })),
    } as unknown as Env['AI'],
    DRILL_KV: {
      get: vi.fn(async (key: string, format?: string) => {
        if (!kvMap.has(key)) return null;
        const val = kvMap.get(key);
        if (format === 'json') return val;
        return JSON.stringify(val);
      }),
    } as unknown as Env['DRILL_KV'],
    ...overrides,
  };
}

describe('POST /api/troubleshoot/grade Pages Function', () => {
  it('returns 503 if env.AI is missing', async () => {
    const env = createMockEnv({ AI: undefined });
    const request = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drillId: 'AGD-01001', causeText: 'Formula fields collision' }),
    });

    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/AI grading unavailable/i);
  });

  it('returns 400 on malformed input (bad drillId or empty causeText)', async () => {
    const env = createMockEnv();

    // Bad drill ID
    const reqBadId = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drillId: 'NOT-A-DRILL', causeText: 'Some diagnosis' }),
    });
    const resBadId = await onRequestPost({ request: reqBadId, env });
    expect(resBadId.status).toBe(400);

    // Empty causeText
    const reqEmptyCause = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drillId: 'AGD-01001', causeText: '   ' }),
    });
    const resEmptyCause = await onRequestPost({ request: reqEmptyCause, env });
    expect(resEmptyCause.status).toBe(400);
  });

  it('returns 404 on missing drill in KV', async () => {
    const env = createMockEnv();
    const request = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drillId: 'AGD-99999', causeText: 'Some diagnosis' }),
    });

    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/Unknown troubleshooting drill/i);
  });

  it('returns 200 with GradeCauseResult on valid input with mock AI', async () => {
    const env = createMockEnv();
    const request = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        drillId: 'AGD-01001',
        causeText: 'Formula fields collision with refresh',
      }),
    });

    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      verdict: string;
      isCorrect: boolean;
      chosenId: string;
      goldText: string;
      goldRationale: string;
      goldCitationUrl?: string;
      goldRemediations?: Array<{ title: string; description: string; citationUrl?: string }>;
    };
    expect(data.verdict).toBe('correct');
    expect(data.isCorrect).toBe(true);
    expect(data.chosenId).toBe('gold');
    expect(data.goldText).toBe(FIXTURE_DRILL.goldCause.text);
    expect(data.goldRationale).toBe(FIXTURE_DRILL.goldCause.rationale);
    expect(data.goldCitationUrl).toBe(FIXTURE_DRILL.goldCause.citationUrl);
    expect(data.goldRemediations).toHaveLength(1);
    expect(data.goldRemediations?.[0].title).toBe(
      'Separate batch transforms from refresh schedules',
    );
  });
});
