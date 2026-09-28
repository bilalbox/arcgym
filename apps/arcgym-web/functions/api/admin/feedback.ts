import { isValidDrillId } from '@arcgym/drill-core';
import { requireAdminAuth } from '../../_shared/adminAuth';
import {
  configErrorResponse,
  type Env,
  jsonResponse,
  opaqueError,
  requireKv,
} from '../../_shared/env';

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    const authError = requireAdminAuth(request, env);
    if (authError) return authError;

    const kv = requireKv(env);
    const url = new URL(request.url);
    const drillIdFilter = url.searchParams.get('drillId');
    const ratingFilter = url.searchParams.get('rating'); // 'up' | 'down'

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
