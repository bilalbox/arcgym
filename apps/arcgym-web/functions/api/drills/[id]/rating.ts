import { calculateRatingStats, type DrillRatingStats, isValidDrillId } from '@arcgym/drill-core';
import { configErrorResponse, type Env, jsonResponse, opaqueError } from '../../../_shared/env';

interface D1RatingStatsRow {
  drill_id: string;
  up_votes: number;
  down_votes: number;
  total_votes: number;
  like_percentage: number | null;
  tag_counts_json: string;
  updated_at: string;
}

interface StoredRatingResult {
  upVotes: number;
  downVotes: number;
  tagCounts?: Record<string, number>;
  lastUpdated?: string;
  source: string;
}

async function fetchFromD1(
  db: NonNullable<Env['DB']>,
  drillId: string,
): Promise<StoredRatingResult | null> {
  const row = await db
    .prepare('SELECT * FROM drill_rating_stats WHERE drill_id = ?')
    .bind(drillId)
    .first<D1RatingStatsRow>();

  if (!row) return null;

  let tagCounts: Record<string, number> = {};
  if (row.tag_counts_json) {
    try {
      tagCounts = JSON.parse(row.tag_counts_json);
    } catch {
      tagCounts = {};
    }
  }

  return {
    upVotes: row.up_votes || 0,
    downVotes: row.down_votes || 0,
    tagCounts,
    lastUpdated: row.updated_at,
    source: 'Cloudflare-D1',
  };
}

async function fetchFromKv(
  kv: NonNullable<Env['DRILL_KV']>,
  drillId: string,
): Promise<StoredRatingResult | null> {
  const stored = (await kv.get(`drill:rating:${drillId}`, 'json')) as {
    upVotes?: number;
    downVotes?: number;
    tagCounts?: Record<string, number>;
    lastUpdated?: string;
  } | null;

  if (!stored) return null;

  return {
    upVotes: stored.upVotes || 0,
    downVotes: stored.downVotes || 0,
    tagCounts: stored.tagCounts,
    lastUpdated: stored.lastUpdated,
    source: 'Cloudflare-KV',
  };
}

export async function onRequestGet(context: {
  request: Request;
  params: { id: string };
  env: Env;
}) {
  const { params, env } = context;
  const drillId = params.id;

  if (!isValidDrillId(drillId)) {
    return opaqueError(400, 'Invalid drill ID');
  }

  try {
    let result: StoredRatingResult | null = null;

    if (env.DB) {
      result = await fetchFromD1(env.DB, drillId);
    } else if (env.DRILL_KV) {
      result = await fetchFromKv(env.DRILL_KV, drillId);
    }

    const stats: DrillRatingStats = calculateRatingStats(
      drillId,
      result?.upVotes || 0,
      result?.downVotes || 0,
      result?.tagCounts,
      result?.lastUpdated,
    );

    return jsonResponse(stats, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-ArcGym-Source': result?.source || 'Memory-Default',
    });
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('rating GET failed', error);
    return opaqueError(500, 'Failed to retrieve rating stats');
  }
}
