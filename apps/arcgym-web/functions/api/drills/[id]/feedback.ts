import {
  calculateRatingStats,
  isValidDrillId,
  sanitizeFeedbackTags,
  type FeedbackRating,
  type DrillFeedbackRecord,
  type DrillRatingStats,
} from '@arcgym/drill-core';
import {
  configErrorResponse,
  Env,
  jsonResponse,
  opaqueError,
  readJsonBody,
  requireKv,
  requireSecret,
} from '../../../_shared/env';
import { computeVoteDedupToken } from '../../../_shared/hmac';

const MAX_FEEDBACK_BODY_BYTES = 2048;

export async function onRequestPost(context: {
  request: Request;
  params: { id: string };
  env: Env;
}) {
  const { request, params, env } = context;
  const drillId = params.id;

  if (!isValidDrillId(drillId)) {
    return opaqueError(400, 'Invalid drill ID');
  }

  try {
    const kv = requireKv(env);
    const voteSecret = requireSecret(env, 'ARCGYM_VOTE_HMAC_SECRET');

    // Only accept feedback for drills that exist in the catalog (seeded into KV).
    const catalogEntry = await kv.get(`drill:id:${drillId}`);
    if (!catalogEntry) {
      return opaqueError(404, 'Unknown drill');
    }

    const parsed = await readJsonBody(request, MAX_FEEDBACK_BODY_BYTES);
    if (!parsed.ok) return parsed.response;

    const body = parsed.json;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return opaqueError(400, 'Invalid JSON body');
    }

    const rating = (body as { rating?: unknown }).rating;
    if (rating !== 'up' && rating !== 'down') {
      return opaqueError(400, 'Invalid rating. Expected "up" or "down".');
    }

    const sanitizedTags = sanitizeFeedbackTags(
      rating as FeedbackRating,
      (body as { tags?: unknown }).tags
    );

    const today = new Date().toISOString().slice(0, 10);
    // CF-Connecting-IP is set by Cloudflare; never trust a client-supplied value.
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) {
      return opaqueError(400, 'Unable to process feedback');
    }

    const dedupToken = await computeVoteDedupToken(voteSecret, today, drillId, ip);
    const dedupKey = `vote_dedup:${dedupToken}`;

    const alreadyVoted = await kv.get(dedupKey);
    if (alreadyVoted) {
      return opaqueError(429, 'Feedback already submitted for this drill today.');
    }

    // Soft aggregate metrics: KV has no CAS. Concurrent votes may undercount.
    // Order: persist stats/record first, then dedup — so a failed write does not
    // burn the day's vote token.
    const existing = (await kv.get(`drill:rating:${drillId}`, 'json')) as
      | Partial<DrillRatingStats>
      | null;

    const prevUp = Number(existing?.upVotes) || 0;
    const prevDown = Number(existing?.downVotes) || 0;
    const nextUp = rating === 'up' ? prevUp + 1 : prevUp;
    const nextDown = rating === 'down' ? prevDown + 1 : prevDown;
    const tagCounts: Record<string, number> = {
      ...((existing?.tagCounts as Record<string, number>) || {}),
    };
    for (const tag of sanitizedTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    const stats = calculateRatingStats(
      drillId,
      nextUp,
      nextDown,
      tagCounts,
      new Date().toISOString()
    );

    const recordId = `fb_${crypto.randomUUID()}`;
    const feedbackRecord: DrillFeedbackRecord = {
      id: recordId,
      drillId,
      rating: rating as FeedbackRating,
      tags: sanitizedTags,
      submittedAt: new Date().toISOString(),
    };

    await kv.put(`drill:rating:${drillId}`, JSON.stringify(stats));
    await kv.put(
      `drill:feedback:${drillId}:${recordId}`,
      JSON.stringify(feedbackRecord)
    );

    let index: string[] =
      ((await kv.get(`drill:feedback_index:${drillId}`, 'json')) as string[]) || [];
    if (!Array.isArray(index)) index = [];
    index.unshift(recordId);
    if (index.length > 100) index = index.slice(0, 100);
    await kv.put(`drill:feedback_index:${drillId}`, JSON.stringify(index));

    // Mark dedup last so retries remain possible if the above puts fail.
    await kv.put(dedupKey, '1', { expirationTtl: 86400 });

    return jsonResponse({
      success: true,
      stats,
      recorded: feedbackRecord,
    });
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('feedback POST failed', error);
    return opaqueError(500, 'Failed to record feedback');
  }
}
