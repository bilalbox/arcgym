import { calculateRatingStats, isValidDrillId } from '@arcgym/drill-core';
import { configErrorResponse, type Env, jsonResponse, opaqueError } from '../../../_shared/env';

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
    let stored: {
      upVotes?: number;
      downVotes?: number;
      tagCounts?: Record<string, number>;
      lastUpdated?: string;
    } | null = null;

    if (env.DRILL_KV) {
      stored = (await env.DRILL_KV.get(`drill:rating:${drillId}`, 'json')) as typeof stored;
    }

    const stats = calculateRatingStats(
      drillId,
      stored?.upVotes || 0,
      stored?.downVotes || 0,
      stored?.tagCounts,
      stored?.lastUpdated,
    );

    return jsonResponse(stats, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-ArcGym-Source': env.DRILL_KV ? 'Cloudflare-KV' : 'Memory-Default',
    });
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('rating GET failed', error);
    return opaqueError(500, 'Failed to retrieve rating stats');
  }
}
