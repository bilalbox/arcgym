interface Env {
  DRILL_KV?: any;
  ARCGYM_HMAC_SECRET?: string;
}

const ALLOWED_LIKED_TAGS = new Set(['realistic', 'useful', 'good_challenge']);
const ALLOWED_DISLIKED_TAGS = new Set(['unrealistic', 'unclear', 'too_easy', 'too_hard']);
const MIN_RATING_THRESHOLD = 3;

/**
 * Computes an ephemeral, non-reversible HMAC-SHA256 deduplication token.
 * Raw IP is never stored or logged.
 */
async function computeEphemeralToken(
  secret: string,
  date: string,
  drillId: string,
  ip: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const data = encoder.encode(`${date}:${drillId}:${ip}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context: {
  request: Request;
  params: { id: string };
  env: Env;
}) {
  const { request, params, env } = context;
  const drillId = params.id;

  if (!drillId) {
    return new Response(JSON.stringify({ error: 'Missing drill ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { rating, tags } = body || {};

  if (rating !== 'up' && rating !== 'down') {
    return new Response(
      JSON.stringify({ error: 'Invalid rating. Expected "up" or "down".' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate tags strictly against approved enums
  const allowedSet = rating === 'up' ? ALLOWED_LIKED_TAGS : ALLOWED_DISLIKED_TAGS;
  const sanitizedTags: string[] = [];

  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag === 'string' && allowedSet.has(tag)) {
        sanitizedTags.push(tag);
      }
    }
  }

  const secret = env.ARCGYM_HMAC_SECRET || 'arcgym_hmac_secret_2026_super_secure';
  const today = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

  try {
    // 1. Ephemeral Anti-Sybil Deduplication
    const dedupToken = await computeEphemeralToken(secret, today, drillId, ip);

    if (env.DRILL_KV) {
      const alreadyVoted = await env.DRILL_KV.get(`vote_dedup:${dedupToken}`);
      if (alreadyVoted) {
        return new Response(
          JSON.stringify({ error: 'Feedback already submitted for this drill today.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Store deduplication marker with 24-hour expiration TTL
      await env.DRILL_KV.put(`vote_dedup:${dedupToken}`, '1', {
        expirationTtl: 86400,
      });
    }

    // 2. Fetch and update aggregate rating statistics
    let stats = env.DRILL_KV
      ? await env.DRILL_KV.get(`drill:rating:${drillId}`, 'json')
      : null;

    if (!stats) {
      stats = {
        drillId,
        upVotes: 0,
        downVotes: 0,
        totalVotes: 0,
        likePercentage: null,
        tagCounts: {},
      };
    }

    if (rating === 'up') {
      stats.upVotes = (stats.upVotes || 0) + 1;
    } else {
      stats.downVotes = (stats.downVotes || 0) + 1;
    }

    stats.totalVotes = stats.upVotes + stats.downVotes;
    stats.likePercentage =
      stats.totalVotes >= MIN_RATING_THRESHOLD
        ? Math.round((stats.upVotes / stats.totalVotes) * 100)
        : null;

    stats.tagCounts = stats.tagCounts || {};
    for (const tag of sanitizedTags) {
      stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
    }
    stats.lastUpdated = new Date().toISOString();

    const recordId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const feedbackRecord = {
      id: recordId,
      drillId,
      rating,
      tags: sanitizedTags,
      submittedAt: new Date().toISOString(),
    };

    if (env.DRILL_KV) {
      // Save aggregate stats
      await env.DRILL_KV.put(`drill:rating:${drillId}`, JSON.stringify(stats));

      // Save individual anonymous record
      await env.DRILL_KV.put(
        `drill:feedback:${drillId}:${recordId}`,
        JSON.stringify(feedbackRecord)
      );

      // Update feedback index array (capped at last 100 entries)
      let index: string[] =
        (await env.DRILL_KV.get(`drill:feedback_index:${drillId}`, 'json')) || [];
      if (!Array.isArray(index)) index = [];
      index.unshift(recordId);
      if (index.length > 100) index = index.slice(0, 100);
      await env.DRILL_KV.put(`drill:feedback_index:${drillId}`, JSON.stringify(index));
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        recorded: feedbackRecord,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to record feedback', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
