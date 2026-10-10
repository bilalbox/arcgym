import {
  calculateTotalPoints,
  mergeProgressStates,
  parseProgressDocument,
  progressStateFromDocument,
  serializeProgressDocument,
  type VisitorProgressState,
} from '@arcgym/drill-core';
import {
  configErrorResponse,
  type Env,
  opaqueError,
  readJsonBody,
  requireDb,
} from '../../_shared/env';
import {
  createClearClientAuthCookieHeader,
  createClientAuthCookieHeader,
  getAuthenticatedLearnerId,
} from '../../_shared/learnerAuth';

interface D1LearnerProgressRow {
  learner_id: string;
  streak_days: number;
  last_active_date: string | null;
  total_points: number;
  completed_drills_json: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    const learnerId = await getAuthenticatedLearnerId(request, env);
    if (!learnerId) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      headers.append('Set-Cookie', createClearClientAuthCookieHeader());
      return new Response(JSON.stringify({ authenticated: false, progress: null }), {
        status: 200,
        headers,
      });
    }

    const db = requireDb(env);
    const row = await db
      .prepare('SELECT * FROM learner_progress WHERE learner_id = ?')
      .bind(learnerId)
      .first<D1LearnerProgressRow>();

    let progress: VisitorProgressState | null = null;
    if (row) {
      const doc = parseProgressDocument(row.completed_drills_json || '{}');
      progress = progressStateFromDocument(doc, {
        streakDays: row.streak_days || 0,
        lastActiveDate: row.last_active_date || '',
      });
    }

    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', createClientAuthCookieHeader());
    return new Response(
      JSON.stringify({
        authenticated: true,
        learnerId,
        progress,
      }),
      { status: 200, headers },
    );
  } catch (error: unknown) {
    console.error('learner sync GET failed', error);
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    return opaqueError(500, 'Failed to fetch learner progress');
  }
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    const learnerId = await getAuthenticatedLearnerId(request, env);
    if (!learnerId) {
      return opaqueError(401, 'Unauthorized');
    }

    const bodyResult = await readJsonBody(request, 512 * 1024); // max 512KB
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const localState = bodyResult.json as VisitorProgressState;
    if (!localState || typeof localState !== 'object') {
      return opaqueError(400, 'Invalid progress state payload');
    }

    const db = requireDb(env);

    // Fetch existing cloud state
    const existingRow = await db
      .prepare('SELECT * FROM learner_progress WHERE learner_id = ?')
      .bind(learnerId)
      .first<D1LearnerProgressRow>();

    let cloudState: VisitorProgressState;
    if (existingRow) {
      const doc = parseProgressDocument(existingRow.completed_drills_json || '{}');
      cloudState = progressStateFromDocument(doc, {
        streakDays: existingRow.streak_days || 0,
        lastActiveDate: existingRow.last_active_date || '',
      });
    } else {
      cloudState = {
        version: 1,
        streakDays: 0,
        lastActiveDate: '',
        completedDrills: {},
      };
    }

    // Perform two-way monotonic merge
    const mergedState = mergeProgressStates(localState, cloudState);
    const totalPoints = calculateTotalPoints(mergedState.completedDrills);
    const drillsJson = serializeProgressDocument(mergedState);

    // Upsert into D1 using SQLite ON CONFLICT
    await db
      .prepare(
        `INSERT INTO learner_progress (
          learner_id, streak_days, last_active_date, total_points, completed_drills_json, version, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(learner_id) DO UPDATE SET
          streak_days = excluded.streak_days,
          last_active_date = excluded.last_active_date,
          total_points = excluded.total_points,
          completed_drills_json = excluded.completed_drills_json,
          version = excluded.version,
          updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        learnerId,
        mergedState.streakDays,
        mergedState.lastActiveDate,
        totalPoints,
        drillsJson,
        1,
      )
      .run();

    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', createClientAuthCookieHeader());
    return new Response(
      JSON.stringify({
        authenticated: true,
        progress: mergedState,
        totalPoints,
      }),
      { status: 200, headers },
    );
  } catch (error: unknown) {
    console.error('learner sync POST failed', error);
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    return opaqueError(500, 'Failed to sync learner progress');
  }
}
