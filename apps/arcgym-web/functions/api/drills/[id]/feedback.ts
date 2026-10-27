import {
	calculateRatingStats,
	type DrillFeedbackRecord,
	type FeedbackRating,
	isValidDrillId,
	sanitizeFeedbackTags,
} from "@arcgym/drill-core";
import {
	configErrorResponse,
	type Env,
	jsonResponse,
	opaqueError,
	readJsonBody,
	requireDb,
	requireSecret,
} from "../../../_shared/env";
import { computeVoteDedupToken } from "../../../_shared/hmac";
import { getAuthenticatedLearnerId } from "../../../_shared/learnerAuth";

const MAX_FEEDBACK_BODY_BYTES = 2048;

interface D1RatingStatsRow {
	drill_id: string;
	up_votes: number;
	down_votes: number;
	total_votes: number;
	like_percentage: number | null;
	tag_counts_json: string;
	updated_at: string;
}

export async function onRequestPost(context: {
	request: Request;
	params: { id: string };
	env: Env;
}) {
	const { request, params, env } = context;
	const drillId = params.id;

	if (!isValidDrillId(drillId)) {
		return opaqueError(400, "Invalid drill ID");
	}

	try {
		const db = requireDb(env);
		const voteSecret = requireSecret(env, "ARCGYM_VOTE_HMAC_SECRET");

		// Only accept feedback for drills that exist in the catalog if DRILL_KV is bound.
		if (env.DRILL_KV) {
			const catalogEntry = await env.DRILL_KV.get(`drill:id:${drillId}`);
			if (!catalogEntry) {
				return opaqueError(404, "Unknown drill");
			}
		}

		const parsed = await readJsonBody(request, MAX_FEEDBACK_BODY_BYTES);
		if (!parsed.ok) return parsed.response;

		const body = parsed.json;
		if (!body || typeof body !== "object" || Array.isArray(body)) {
			return opaqueError(400, "Invalid JSON body");
		}

		const rating = (body as { rating?: unknown }).rating;
		if (rating !== "up" && rating !== "down") {
			return opaqueError(400, 'Invalid rating. Expected "up" or "down".');
		}

		const sanitizedTags = sanitizeFeedbackTags(
			rating as FeedbackRating,
			(body as { tags?: unknown }).tags,
		);

		const today = new Date().toISOString().slice(0, 10);
		// CF-Connecting-IP is set by Cloudflare; never trust a client-supplied value.
		const ip = request.headers.get("CF-Connecting-IP");
		if (!ip) {
			return opaqueError(400, "Unable to process feedback");
		}

		const dedupToken = await computeVoteDedupToken(
			voteSecret,
			today,
			drillId,
			ip,
		);
		const learnerId = await getAuthenticatedLearnerId(request, env);

		// Fast pre-check before transaction
		const existingVote = await db
			.prepare(
				"SELECT id FROM drill_feedback WHERE drill_id = ? AND dedup_token = ?",
			)
			.bind(drillId, dedupToken)
			.first<{ id: string }>();

		if (existingVote) {
			return opaqueError(
				429,
				"Feedback already submitted for this drill today.",
			);
		}

		// Query existing rating rollups
		const existingStats = await db
			.prepare("SELECT * FROM drill_rating_stats WHERE drill_id = ?")
			.bind(drillId)
			.first<D1RatingStatsRow>();

		const prevUp = Number(existingStats?.up_votes) || 0;
		const prevDown = Number(existingStats?.down_votes) || 0;
		const nextUp = rating === "up" ? prevUp + 1 : prevUp;
		const nextDown = rating === "down" ? prevDown + 1 : prevDown;
		let tagCounts: Record<string, number> = {};
		if (existingStats?.tag_counts_json) {
			try {
				tagCounts = JSON.parse(existingStats.tag_counts_json);
			} catch {
				tagCounts = {};
			}
		}
		for (const tag of sanitizedTags) {
			tagCounts[tag] = (tagCounts[tag] || 0) + 1;
		}

		const nowIso = new Date().toISOString();
		const stats = calculateRatingStats(
			drillId,
			nextUp,
			nextDown,
			tagCounts,
			nowIso,
		);

		const recordId = `fb_${crypto.randomUUID()}`;
		const feedbackRecord: DrillFeedbackRecord = {
			id: recordId,
			drillId,
			rating: rating as FeedbackRating,
			tags: sanitizedTags,
			submittedAt: nowIso,
		};

		const insertFeedbackStmt = db
			.prepare(
				`INSERT INTO drill_feedback (
          id, drill_id, rating, tags_json, learner_id, dedup_token, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				recordId,
				drillId,
				rating,
				JSON.stringify(sanitizedTags),
				learnerId,
				dedupToken,
				nowIso,
			);

		const upsertStatsStmt = db
			.prepare(
				`INSERT INTO drill_rating_stats (
          drill_id, up_votes, down_votes, total_votes, like_percentage, tag_counts_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(drill_id) DO UPDATE SET
          up_votes = excluded.up_votes,
          down_votes = excluded.down_votes,
          total_votes = excluded.total_votes,
          like_percentage = excluded.like_percentage,
          tag_counts_json = excluded.tag_counts_json,
          updated_at = excluded.updated_at`,
			)
			.bind(
				drillId,
				stats.upVotes,
				stats.downVotes,
				stats.totalVotes,
				stats.likePercentage,
				JSON.stringify(stats.tagCounts),
				nowIso,
			);

		try {
			await db.batch([insertFeedbackStmt, upsertStatsStmt]);
		} catch (batchErr: unknown) {
			const errMsg =
				batchErr instanceof Error ? batchErr.message : String(batchErr);
			if (
				errMsg.includes("UNIQUE constraint failed") ||
				errMsg.includes("constraint")
			) {
				return opaqueError(
					429,
					"Feedback already submitted for this drill today.",
				);
			}
			throw batchErr;
		}

		return jsonResponse({
			success: true,
			stats,
			recorded: feedbackRecord,
		});
	} catch (error: unknown) {
		const misconfigured = configErrorResponse(error);
		if (misconfigured) return misconfigured;
		console.error("feedback POST failed", error);
		return opaqueError(500, "Failed to record feedback");
	}
}
