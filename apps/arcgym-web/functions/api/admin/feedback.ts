import { calculateRatingStats, isValidDrillId } from '@arcgym/drill-core';
import { requireAdminAuth } from '../../_shared/adminAuth';
import { configErrorResponse, type Env, jsonResponse, opaqueError } from '../../_shared/env';

interface D1RatingStatsRow {
  drill_id: string;
  up_votes: number;
  down_votes: number;
  total_votes: number;
  like_percentage: number | null;
  tag_counts_json: string;
  updated_at: string;
}

interface D1FeedbackRow {
  id: string;
  drill_id: string;
  rating: string;
  tags_json: string;
  learner_id: string | null;
  created_at: string;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    const authError = requireAdminAuth(request, env);
    if (authError) return authError;

    const url = new URL(request.url);
    const drillIdFilter = url.searchParams.get('drillId');
    const ratingFilter = url.searchParams.get('rating'); // 'up' | 'down'

    if (env.DB) {
      if (drillIdFilter) {
        if (!isValidDrillId(drillIdFilter)) {
          return opaqueError(400, 'Invalid drillId');
        }
        if (ratingFilter && ratingFilter !== 'up' && ratingFilter !== 'down') {
          return opaqueError(400, 'Invalid rating filter');
        }

        const statsRow = await env.DB.prepare('SELECT * FROM drill_rating_stats WHERE drill_id = ?')
          .bind(drillIdFilter)
          .first<D1RatingStatsRow>();

        const stats = statsRow
          ? calculateRatingStats(
              statsRow.drill_id,
              statsRow.up_votes,
              statsRow.down_votes,
              statsRow.tag_counts_json ? JSON.parse(statsRow.tag_counts_json) : {},
              statsRow.updated_at,
            )
          : null;

        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50));
        const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

        let countQuery = 'SELECT COUNT(*) as count FROM drill_feedback WHERE drill_id = ?';
        let recordsQuery =
          'SELECT id, drill_id, rating, tags_json, learner_id, created_at FROM drill_feedback WHERE drill_id = ?';
        const queryParams: unknown[] = [drillIdFilter];

        if (ratingFilter) {
          countQuery += ' AND rating = ?';
          recordsQuery += ' AND rating = ?';
          queryParams.push(ratingFilter);
        }

        recordsQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

        const totalRow = await env.DB.prepare(countQuery)
          .bind(...queryParams)
          .first<{ count: number }>();

        const feedbackRows = await env.DB.prepare(recordsQuery)
          .bind(...queryParams, limit, offset)
          .all<D1FeedbackRow>();

        const records = (feedbackRows.results || []).map((row) => {
          let tags = [];
          try {
            tags = JSON.parse(row.tags_json || '[]');
          } catch {
            tags = [];
          }
          return {
            id: row.id,
            drillId: row.drill_id,
            rating: row.rating,
            tags,
            learnerId: row.learner_id,
            submittedAt: row.created_at,
          };
        });

        return jsonResponse({
          success: true,
          drillId: drillIdFilter,
          stats,
          recordCount: records.length,
          totalRecords: totalRow?.count || 0,
          records,
        });
      }

      // Query all rating rollups from D1
      const statsRows = await env.DB.prepare(
        `SELECT * FROM drill_rating_stats 
         ORDER BY 
           CASE WHEN like_percentage IS NULL THEN 1 ELSE 0 END, 
           like_percentage ASC, 
           total_votes DESC`,
      ).all<D1RatingStatsRow>();

      const summaries = (statsRows.results || []).map((row) =>
        calculateRatingStats(
          row.drill_id,
          row.up_votes,
          row.down_votes,
          row.tag_counts_json ? JSON.parse(row.tag_counts_json) : {},
          row.updated_at,
        ),
      );

      return jsonResponse({
        success: true,
        totalDrillsTracked: summaries.length,
        drills: summaries,
      });
    }

    // Graceful fallback to KV if DB is unbound
    if (!env.DRILL_KV) {
      return opaqueError(503, 'Service misconfigured: DB and KV unbound');
    }

    const kv = env.DRILL_KV;
    if (drillIdFilter) {
      if (!isValidDrillId(drillIdFilter)) {
        return opaqueError(400, 'Invalid drillId');
      }
      if (ratingFilter && ratingFilter !== 'up' && ratingFilter !== 'down') {
        return opaqueError(400, 'Invalid rating filter');
      }

      const stats = await kv.get(`drill:rating:${drillIdFilter}`, 'json');
      const index: string[] =
        ((await kv.get(`drill:feedback_index:${drillIdFilter}`, 'json')) as string[]) || [];

      const records = [];
      for (const recId of index.slice(0, 50)) {
        if (typeof recId !== 'string' || !/^fb_[\w-]+$/.test(recId)) continue;
        const item = await kv.get(`drill:feedback:${drillIdFilter}:${recId}`, 'json');
        if (item && typeof item === 'object') {
          const rec = item as { rating?: string };
          if (!ratingFilter || rec.rating === ratingFilter) {
            records.push(item);
          }
        }
      }

      return jsonResponse({
        success: true,
        drillId: drillIdFilter,
        stats: stats || null,
        recordCount: records.length,
        records,
      });
    }

    const listResult = await kv.list({ prefix: 'drill:rating:' });
    const summaries: unknown[] = [];

    for (const key of listResult.keys || []) {
      const stats = await kv.get(key.name, 'json');
      if (stats) summaries.push(stats);
    }

    summaries.sort((a, b) => {
      const pctA =
        a && typeof a === 'object' && 'likePercentage' in a
          ? ((a as { likePercentage: number | null }).likePercentage ?? 100)
          : 100;
      const pctB =
        b && typeof b === 'object' && 'likePercentage' in b
          ? ((b as { likePercentage: number | null }).likePercentage ?? 100)
          : 100;
      return pctA - pctB;
    });

    return jsonResponse({
      success: true,
      totalDrillsTracked: summaries.length,
      drills: summaries,
    });
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('admin/feedback failed', error);
    return opaqueError(500, 'Failed to query admin feedback');
  }
}
