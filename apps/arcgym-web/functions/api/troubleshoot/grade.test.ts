import type { TroubleshootingDrillDefinition } from '@arcgym/drill-core';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../_shared/env';
import { signSessionJwt } from '../../_shared/learnerAuth';
import { onRequestPost } from './grade';

const TEST_SECRET = 'test_session_secret_32_characters_minimum_length';
const TEST_LEARNER_ID = 'test_learner_123';

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
  },
  fix: {
    prompt: 'How should the concurrency collision be remediated?',
    options: [
      {
        id: 'fix_stagger',
        label: 'Stagger transform schedules away from segment publish',
        isCorrect: true,
        citationUrl: 'https://architect.salesforce.com/docs/fixture',
        rationale: 'Staggering eliminates query collision.',
      },
      {
        id: 'fix_scale',
        label: 'Upsize Snowflake warehouse',
        isCorrect: false,
        distractorAntipattern: 'Scale First Warehouse',
        rationale: 'Upsizing does not resolve lock contention.',
      },
      {
        id: 'fix_network',
        label: 'Relocate multi-region cluster',
        isCorrect: false,
        distractorAntipattern: 'Network Ghost Hunt',
        rationale: 'Network is not the bottleneck.',
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
    SESSION_SECRET: TEST_SECRET,
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
        return typeof val === 'string' ? val : JSON.stringify(val);
      }),
      put: vi.fn(async (key: string, value: string) => {
        kvMap.set(key, value);
      }),
    } as unknown as Env['DRILL_KV'],
    ...overrides,
  };
}

async function createAuthHeaders(learnerId = TEST_LEARNER_ID, secret = TEST_SECRET) {
  const token = await signSessionJwt(learnerId, secret, 3600);
  return {
    'content-type': 'application/json',
    Cookie: `arcgym_session=${token}`,
  };
}

describe('POST /api/troubleshoot/grade Pages Function', () => {
  it('returns 401 if unauthenticated (missing session cookie)', async () => {
    const env = createMockEnv();
    const request = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drillId: 'AGD-01001', causeText: 'Formula fields collision' }),
    });

    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/Authentication required/i);
  });

  it('returns 503 if env.AI is missing', async () => {
    const env = createMockEnv({ AI: undefined });
    const headers = await createAuthHeaders();
    const request = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers,
      body: JSON.stringify({ drillId: 'AGD-01001', causeText: 'Formula fields collision' }),
    });

    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/AI grading unavailable/i);
  });

  it('returns 400 on malformed input (bad drillId or empty causeText)', async () => {
    const env = createMockEnv();
    const headers = await createAuthHeaders();

    // Bad drill ID
    const reqBadId = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers,
      body: JSON.stringify({ drillId: 'NOT-A-DRILL', causeText: 'Some diagnosis' }),
    });
    const resBadId = await onRequestPost({ request: reqBadId, env });
    expect(resBadId.status).toBe(400);

    // Empty causeText
    const reqEmptyCause = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers,
      body: JSON.stringify({ drillId: 'AGD-01001', causeText: '   ' }),
    });
    const resEmptyCause = await onRequestPost({ request: reqEmptyCause, env });
    expect(resEmptyCause.status).toBe(400);
  });

  it('returns 404 on missing drill in KV', async () => {
    const env = createMockEnv();
    const headers = await createAuthHeaders();
    const request = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers,
      body: JSON.stringify({ drillId: 'AGD-99999', causeText: 'Some diagnosis' }),
    });

    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/Unknown troubleshooting drill/i);
  });

  it('returns 429 when per-learner rate limit is exceeded', async () => {
    const env = createMockEnv();
    const headers = await createAuthHeaders('spammer_learner');

    // Fire 10 allowed requests
    for (let i = 0; i < 10; i++) {
      const req = new Request('http://localhost/api/troubleshoot/grade', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          drillId: 'AGD-01001',
          causeText: 'Formula fields collision',
        }),
      });
      const res = await onRequestPost({ request: req, env });
      expect(res.status).toBe(200);
    }

    // 11th request exceeds limit
    const reqExceeded = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        drillId: 'AGD-01001',
        causeText: 'Formula fields collision',
      }),
    });
    const resExceeded = await onRequestPost({ request: reqExceeded, env });
    expect(resExceeded.status).toBe(429);
    const body = (await resExceeded.json()) as { error: string };
    expect(body.error).toMatch(/Rate limit exceeded/i);
  });

  it('returns 422 when authored drill lacks a valid Fix', async () => {
    const broken = { ...FIXTURE_DRILL, fix: { prompt: 'x', options: [] } };
    const env = createMockEnv();
    if (!env.DRILL_KV) throw new Error('DRILL_KV required');
    (env.DRILL_KV.get as ReturnType<typeof vi.fn>).mockImplementation(
      async (key: string, format?: string) => {
        if (key === 'drill:id:AGD-01001') {
          return format === 'json' ? broken : JSON.stringify(broken);
        }
        return null;
      },
    );
    const headers = await createAuthHeaders();
    const request = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        drillId: 'AGD-01001',
        causeText: 'Formula fields collision with refresh',
      }),
    });
    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/Fix/i);
  });

  it('returns 200 with GradeCauseResult on valid input with mock AI', async () => {
    const env = createMockEnv();
    const headers = await createAuthHeaders();
    const request = new Request('http://localhost/api/troubleshoot/grade', {
      method: 'POST',
      headers,
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
      fix?: { prompt: string; options: unknown[] };
    };
    expect(data.verdict).toBe('correct');
    expect(data.isCorrect).toBe(true);
    expect(data.chosenId).toBe('gold');
    expect(data.goldText).toBe(FIXTURE_DRILL.goldCause.text);
    expect(data.goldRationale).toBe(FIXTURE_DRILL.goldCause.rationale);
    expect(data.goldCitationUrl).toBe(FIXTURE_DRILL.goldCause.citationUrl);
    expect(data.fix).toBeDefined();
    expect(data.fix?.prompt).toBe(FIXTURE_DRILL.fix.prompt);
    expect(data.fix?.options).toHaveLength(3);
  });
});
