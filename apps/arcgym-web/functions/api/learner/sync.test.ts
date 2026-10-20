import type { VisitorProgressState } from '@arcgym/drill-core';
import { describe, expect, it } from 'vitest';
import type { D1Database, D1PreparedStatement, Env } from '../../_shared/env';
import { signSessionJwt } from '../../_shared/learnerAuth';
import { onRequestGet, onRequestPost } from './sync';

class MockD1Database implements D1Database {
  rows: Map<string, Record<string, unknown>> = new Map();

  prepare(sql: string): D1PreparedStatement {
    let boundValues: unknown[] = [];
    const db = this;

    const stmt: D1PreparedStatement = {
      bind(...values: unknown[]) {
        boundValues = values;
        return stmt;
      },
      async first<T = unknown>() {
        if (sql.includes('SELECT * FROM learner_progress WHERE learner_id = ?')) {
          const id = boundValues[0] as string;
          return (db.rows.get(id) as T) || null;
        }
        return null;
      },
      async all<T = unknown>() {
        return { results: Array.from(db.rows.values()) as T[], success: true };
      },
      async run() {
        if (sql.includes('INSERT INTO learner_progress')) {
          const [
            learner_id,
            streak_days,
            last_active_date,
            total_points,
            completed_drills_json,
            version,
          ] = boundValues;
          db.rows.set(learner_id as string, {
            learner_id,
            streak_days,
            last_active_date,
            total_points,
            completed_drills_json,
            version,
          });
        } else if (sql.includes('DELETE FROM learner_progress')) {
          const id = boundValues[0] as string;
          db.rows.delete(id);
        }
        return { success: true, meta: {} };
      },
    };
    return stmt;
  }

  async batch() {
    return [];
  }
  async exec() {
    return { count: 0, duration: 0 };
  }
}

describe('Learner sync edge route', () => {
  const TEST_SECRET = 'test_session_secret_32_characters_minimum_length';

  it('rejects unauthenticated sync GET with authenticated: false', async () => {
    const env: Env = {
      SESSION_SECRET: TEST_SECRET,
      DB: new MockD1Database(),
    };
    const req = new Request('https://arcgym.23p.tech/api/learner/sync');
    const res = await onRequestGet({ request: req, env });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authenticated).toBe(false);
  });

  it('performs two-way monotonic sync when authenticated', async () => {
    const mockDb = new MockD1Database();
    const env: Env = {
      SESSION_SECRET: TEST_SECRET,
      DB: mockDb,
    };

    const learnerId = 'learner_xyz';
    const token = await signSessionJwt(learnerId, TEST_SECRET, 3600);

    const localState: VisitorProgressState = {
      version: 1,
      streakDays: 1,
      lastActiveDate: '2026-10-04',
      completedDrills: {
        'drill-a': {
          drillId: 'drill-a',
          format: 'Troubleshooting',
          completedAt: '2026-10-04T10:00:00Z',
          score: 85,
          accuracy: 1,
          attemptsCount: 1,
        },
      },
    };

    const postReq = new Request('https://arcgym.23p.tech/api/learner/sync', {
      method: 'POST',
      headers: {
        Cookie: `arcgym_session=${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(localState),
    });

    const res = await onRequestPost({ request: postReq, env });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { authenticated: boolean; progress: VisitorProgressState };
    expect(data.authenticated).toBe(true);
    expect(data.progress.completedDrills['drill-a'].score).toBe(85);

    // Verify row was created in D1
    expect(mockDb.rows.has(learnerId)).toBe(true);

    // Now test GET returns the saved state
    const getReq = new Request('https://arcgym.23p.tech/api/learner/sync', {
      headers: { Cookie: `arcgym_session=${token}` },
    });
    const getRes = await onRequestGet({ request: getReq, env });
    const getData = (await getRes.json()) as {
      authenticated: boolean;
      progress: VisitorProgressState;
    };
    expect(getData.authenticated).toBe(true);
    expect(getData.progress.completedDrills['drill-a'].score).toBe(85);
  });
});
