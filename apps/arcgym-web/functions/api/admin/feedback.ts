interface Env {
  DRILL_KV?: any;
  ARCGYM_HMAC_SECRET?: string;
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Authenticate admin request
  const secret = env.ARCGYM_HMAC_SECRET || 'arcgym_hmac_secret_2026_super_secure';
  const providedKey =
    request.headers.get('x-arcgym-admin-key') ||
    url.searchParams.get('admin_key');

  if (!providedKey || providedKey !== secret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or missing X-ArcGym-Admin-Key' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!env.DRILL_KV) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cloudflare KV is not bound in current environment',
        data: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const drillIdFilter = url.searchParams.get('drillId');
  const ratingFilter = url.searchParams.get('rating'); // 'up' | 'down'

  try {
    if (drillIdFilter) {
      // 1. Single Drill Detailed View
      const stats = await env.DRILL_KV.get(`drill:rating:${drillIdFilter}`, 'json');
      const index: string[] =
        (await env.DRILL_KV.get(`drill:feedback_index:${drillIdFilter}`, 'json')) || [];

      const records = [];
      for (const recId of index.slice(0, 50)) {
        const item = await env.DRILL_KV.get(
          `drill:feedback:${drillIdFilter}:${recId}`,
          'json'
        );
        if (item) {
          if (!ratingFilter || item.rating === ratingFilter) {
            records.push(item);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          drillId: drillIdFilter,
          stats: stats || null,
          recordCount: records.length,
          records,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. All Drills Summary Overview
    const listResult = await env.DRILL_KV.list({ prefix: 'drill:rating:' });
    const summaries = [];

    for (const key of listResult.keys || []) {
      const stats = await env.DRILL_KV.get(key.name, 'json');
      if (stats) {
        summaries.push(stats);
      }
    }

    // Sort by lowest approval percentage first (identifying drills that need editorial revision)
    summaries.sort((a, b) => {
      const pctA = a.likePercentage !== null ? a.likePercentage : 100;
      const pctB = b.likePercentage !== null ? b.likePercentage : 100;
      return pctA - pctB;
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalDrillsTracked: summaries.length,
        drills: summaries,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to query admin feedback', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
