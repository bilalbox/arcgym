import type { DrillRatingStats } from '@arcgym/drill-core';
import { describe, expect, it } from 'vitest';
import type { D1Database, D1PreparedStatement, Env } from '../../_shared/env';
import { onRequestGet as onAdminFeedbackGet } from './feedback';

interface AdminFeedbackSummaryResponse {
  success: boolean;
  totalDrillsTracked: number;
  drills: DrillRatingStats[];
}

interface AdminFeedbackDetailResponse {
  success: boolean;
  drillId: string;
  stats: DrillRatingStats;
  recordCount: number;
  totalRecords: number;
  records: Array<{
    id: string;
    drillId: string;
    rating: string;
    tags: string[];
    learnerId: string | null;
    submittedAt: string;
  }>;
}

function createMockAdminDb() {
  const statsRows = [
    {
      drill_id: 'AGD-00101',
      up_votes: 10,
      down_votes: 2,
      total_votes: 12,
      like_percentage: 83,
      tag_counts_json: JSON.stringify({ hit_at_work: 5 }),
      updated_at: '2026-10-01T00:00:00.000Z',
    },
    {
      drill_id: 'AGD-00201',
      up_votes: 1,
      down_votes: 4,
      total_votes: 5,
      like_percentage: 20,
      tag_counts_json: JSON.stringify({ ambiguous_question: 3 }),
      updated_at: '2026-10-02T00:00:00.000Z',
    },
  ];

  const feedbackRows = [
    {
      id: 'fb_1',
      drill_id: 'AGD-00201',
      rating: 'down',
      tags_json: JSON.stringify(['ambiguous_question']),
      learner_id: 'learner_1',
      created_at: '2026-10-02T10:00:00.000Z',
    },
    {
      id: 'fb_2',
      drill_id: 'AGD-00201',
      rating: 'up',
      tags_json: JSON.stringify(['good_challenge']),
      learner_id: null,
      created_at: '2026-10-02T11:00:00.000Z',
    },
  ];

  const db: D1Database = {
    prepare(sql: string) {
      let boundValues: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          boundValues = values;
          return stmt;
        },
        async first<T = unknown>() {
          if (sql.includes('SELECT * FROM drill_rating_stats WHERE drill_id = ?')) {
            const [drillId] = boundValues as [string];
            const found = statsRows.find((s) => s.drill_id === drillId);
            return (found || null) as T;
          }
          if (sql.includes('SELECT COUNT(*) as count FROM drill_feedback')) {
            const drillId = boundValues[0] as string;
            const rating = boundValues.length > 1 ? (boundValues[1] as string) : undefined;
            const matches = feedbackRows.filter(
              (f) => f.drill_id === drillId && (!rating || f.rating === rating),
            );
            return { count: matches.length } as T;
          }
          return null;
        },
        async all<T = unknown>() {
          if (sql.includes('FROM drill_rating_stats')) {
            return { results: statsRows as T[], success: true };
          }
          if (sql.includes('FROM drill_feedback')) {
            const drillId = boundValues[0] as string;
            const rating = boundValues.length > 3 ? (boundValues[1] as string) : undefined;
            const matches = feedbackRows.filter(
              (f) => f.drill_id === drillId && (!rating || f.rating === rating),
            );
            return { results: matches as T[], success: true };
          }
          return { results: [] as T[], success: true };
        },
        async run() {
          return { success: true, meta: {} };
        },
      };
      return stmt;
    },
    async batch() {
      return [];
    },
    async exec() {
      return { count: 0, duration: 0 };
    },
  };

  return db;
}

describe('Admin Feedback D1 route', () => {
  const ADMIN_KEY = 'secret_admin_key_test_value';

  it('rejects unauthenticated admin calls with 401', async () => {
    const env: Env = {
      DB: createMockAdminDb(),
      ARCGYM_ADMIN_KEY: ADMIN_KEY,
    };
    const req = new Request('https://arcgym.23p.tech/api/admin/feedback');
    const res = await onAdminFeedbackGet({ request: req, env });
    expect(res.status).toBe(401);
  });

  it('returns all drill summaries from D1 when authenticated', async () => {
    const env: Env = {
      DB: createMockAdminDb(),
      ARCGYM_ADMIN_KEY: ADMIN_KEY,
    };
    const req = new Request('https://arcgym.23p.tech/api/admin/feedback', {
      headers: { 'x-arcgym-admin-key': ADMIN_KEY },
    });
    const res = await onAdminFeedbackGet({ request: req, env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as AdminFeedbackSummaryResponse;
    expect(body.success).toBe(true);
    expect(body.totalDrillsTracked).toBe(2);
    expect(body.drills.length).toBe(2);
  });

  it('returns detailed drill feedback records when drillId filter is provided', async () => {
    const env: Env = {
      DB: createMockAdminDb(),
      ARCGYM_ADMIN_KEY: ADMIN_KEY,
    };
    const req = new Request('https://arcgym.23p.tech/api/admin/feedback?drillId=AGD-00201', {
      headers: { 'x-arcgym-admin-key': ADMIN_KEY },
    });
    const res = await onAdminFeedbackGet({ request: req, env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as AdminFeedbackDetailResponse;
    expect(body.success).toBe(true);
    expect(body.drillId).toBe('AGD-00201');
    expect(body.stats.likePercentage).toBe(20);
    expect(body.totalRecords).toBe(2);
    expect(body.records.length).toBe(2);
    expect(body.records[0].tags).toEqual(['ambiguous_question']);
  });
});
