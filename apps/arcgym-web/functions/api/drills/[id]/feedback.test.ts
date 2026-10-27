import type { DrillFeedbackRecord, DrillRatingStats } from "@arcgym/drill-core";
import { describe, expect, it } from "vitest";
import type {
	D1Database,
	D1PreparedStatement,
	Env,
} from "../../../_shared/env";
import {
	createSessionCookieHeader,
	signSessionJwt,
} from "../../../_shared/learnerAuth";
import { onRequestPost as onFeedbackPost } from "./feedback";
import { onRequestGet as onRatingGet } from "./rating";

interface FeedbackPostSuccessResponse {
	success: boolean;
	stats: DrillRatingStats;
	recorded: DrillFeedbackRecord;
}

function createMockDb() {
	const feedbackRows: Array<{
		id: string;
		drill_id: string;
		rating: string;
		tags_json: string;
		learner_id: string | null;
		dedup_token: string;
		created_at: string;
	}> = [];

	const statsMap = new Map<
		string,
		{
			drill_id: string;
			up_votes: number;
			down_votes: number;
			total_votes: number;
			like_percentage: number | null;
			tag_counts_json: string;
			updated_at: string;
		}
	>();

	const db: D1Database = {
		prepare(sql: string) {
			let boundValues: unknown[] = [];
			const stmt: D1PreparedStatement & {
				sql: string;
				boundValues: unknown[];
			} = {
				sql,
				boundValues: [],
				bind(...values: unknown[]) {
					boundValues = values;
					stmt.boundValues = values;
					return stmt;
				},
				async first<T = unknown>() {
					if (
						sql.includes(
							"SELECT id FROM drill_feedback WHERE drill_id = ? AND dedup_token = ?",
						)
					) {
						const [drillId, dedupToken] = boundValues as [string, string];
						const found = feedbackRows.find(
							(r) => r.drill_id === drillId && r.dedup_token === dedupToken,
						);
						return (found ? { id: found.id } : null) as T;
					}
					if (
						sql.includes("SELECT * FROM drill_rating_stats WHERE drill_id = ?")
					) {
						const [drillId] = boundValues as [string];
						return (statsMap.get(drillId) || null) as T;
					}
					return null;
				},
				async all<T = unknown>() {
					return {
						results: Array.from(statsMap.values()) as T[],
						success: true,
					};
				},
				async run() {
					return { success: true, meta: {} };
				},
			};
			return stmt;
		},
		async batch(statements: D1PreparedStatement[]) {
			for (const rawStmt of statements) {
				const stmt = rawStmt as D1PreparedStatement & {
					sql: string;
					boundValues: unknown[];
				};
				if (stmt.sql.includes("INSERT INTO drill_feedback")) {
					const [
						id,
						drill_id,
						rating,
						tags_json,
						learner_id,
						dedup_token,
						created_at,
					] = stmt.boundValues as [
						string,
						string,
						string,
						string,
						string | null,
						string,
						string,
					];
					const duplicate = feedbackRows.some(
						(r) => r.drill_id === drill_id && r.dedup_token === dedup_token,
					);
					if (duplicate) {
						throw new Error(
							"UNIQUE constraint failed: drill_feedback.drill_id, drill_feedback.dedup_token",
						);
					}
					feedbackRows.push({
						id,
						drill_id,
						rating,
						tags_json,
						learner_id,
						dedup_token,
						created_at,
					});
				} else if (stmt.sql.includes("INSERT INTO drill_rating_stats")) {
					const [
						drill_id,
						up_votes,
						down_votes,
						total_votes,
						like_percentage,
						tag_counts_json,
						updated_at,
					] = stmt.boundValues as [
						string,
						number,
						number,
						number,
						number | null,
						string,
						string,
					];
					statsMap.set(drill_id, {
						drill_id,
						up_votes,
						down_votes,
						total_votes,
						like_percentage,
						tag_counts_json,
						updated_at,
					});
				}
			}
			return [];
		},
		async exec() {
			return { count: 0, duration: 0 };
		},
	};

	return { db, feedbackRows, statsMap };
}

describe("Feedback & Rating D1 edge routes", () => {
	const VOTE_SECRET = "test_vote_hmac_secret_key_value_32_chars";
	const SESSION_SECRET = "test_session_secret_32_characters_minimum_length";

	it("rejects invalid drill ID format", async () => {
		const { db } = createMockDb();
		const env: Env = {
			DB: db,
			ARCGYM_VOTE_HMAC_SECRET: VOTE_SECRET,
		};

		const req = new Request(
			"https://arcgym.23p.tech/api/drills/invalid-id/feedback",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"CF-Connecting-IP": "1.2.3.4",
				},
				body: JSON.stringify({ rating: "up" }),
			},
		);

		const res = await onFeedbackPost({
			request: req,
			params: { id: "invalid-id" },
			env,
		});
		expect(res.status).toBe(400);
	});

	it("records valid feedback in D1 and updates rating stats", async () => {
		const { db, feedbackRows, statsMap } = createMockDb();
		const env: Env = {
			DB: db,
			ARCGYM_VOTE_HMAC_SECRET: VOTE_SECRET,
		};

		const drillId = "AGD-00101";
		const req = new Request(
			`https://arcgym.23p.tech/api/drills/${drillId}/feedback`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"CF-Connecting-IP": "1.2.3.4",
				},
				body: JSON.stringify({
					rating: "up",
					tags: ["hit_at_work", "clear_explanation"],
				}),
			},
		);

		const res = await onFeedbackPost({
			request: req,
			params: { id: drillId },
			env,
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as FeedbackPostSuccessResponse;
		expect(body.success).toBe(true);
		expect(body.stats.upVotes).toBe(1);
		expect(body.stats.downVotes).toBe(0);
		expect(body.stats.totalVotes).toBe(1);
		expect(body.recorded.tags).toEqual(["hit_at_work", "clear_explanation"]);

		expect(feedbackRows.length).toBe(1);
		const storedRow = feedbackRows[0];
		expect(storedRow).toBeDefined();
		expect(storedRow?.drill_id).toBe(drillId);
		expect(storedRow?.rating).toBe("up");

		const stats = statsMap.get(drillId);
		expect(stats?.up_votes).toBe(1);
		expect(JSON.parse(stats?.tag_counts_json || "{}")).toEqual({
			hit_at_work: 1,
			clear_explanation: 1,
		});
	});

	it("enforces deduplication for same IP on same day", async () => {
		const { db } = createMockDb();
		const env: Env = {
			DB: db,
			ARCGYM_VOTE_HMAC_SECRET: VOTE_SECRET,
		};

		const drillId = "AGD-00101";
		const submit = () =>
			onFeedbackPost({
				request: new Request(
					`https://arcgym.23p.tech/api/drills/${drillId}/feedback`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"CF-Connecting-IP": "1.2.3.4",
						},
						body: JSON.stringify({ rating: "up" }),
					},
				),
				params: { id: drillId },
				env,
			});

		const res1 = await submit();
		expect(res1.status).toBe(200);

		const res2 = await submit();
		expect(res2.status).toBe(429);
	});

	it("associates authenticated learnerId when session cookie is provided", async () => {
		const { db, feedbackRows } = createMockDb();
		const env: Env = {
			DB: db,
			ARCGYM_VOTE_HMAC_SECRET: VOTE_SECRET,
			SESSION_SECRET,
		};

		const token = await signSessionJwt("learner_abc123", SESSION_SECRET);
		const cookieHeader = createSessionCookieHeader(token);
		const sessionCookie = cookieHeader.split(";")[0];
		expect(sessionCookie).toBeTruthy();

		const drillId = "AGD-00101";
		const req = new Request(
			`https://arcgym.23p.tech/api/drills/${drillId}/feedback`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"CF-Connecting-IP": "5.6.7.8",
					Cookie: sessionCookie ?? "",
				},
				body: JSON.stringify({ rating: "down", tags: ["felt_like_trick"] }),
			},
		);

		const res = await onFeedbackPost({
			request: req,
			params: { id: drillId },
			env,
		});
		expect(res.status).toBe(200);

		expect(feedbackRows.length).toBeGreaterThanOrEqual(1);
		const learnerRow = feedbackRows[0];
		expect(learnerRow).toBeDefined();
		expect(learnerRow?.learner_id).toBe("learner_abc123");
	});

	it("serves ratings from D1 with proper cache headers", async () => {
		const { db, statsMap } = createMockDb();
		const drillId = "AGD-00101";

		statsMap.set(drillId, {
			drill_id: drillId,
			up_votes: 9,
			down_votes: 1,
			total_votes: 10,
			like_percentage: 90,
			tag_counts_json: JSON.stringify({ hit_at_work: 5 }),
			updated_at: new Date().toISOString(),
		});

		const env: Env = { DB: db };
		const req = new Request(
			`https://arcgym.23p.tech/api/drills/${drillId}/rating`,
		);
		const res = await onRatingGet({
			request: req,
			params: { id: drillId },
			env,
		});

		expect(res.status).toBe(200);
		expect(res.headers.get("X-ArcGym-Source")).toBe("Cloudflare-D1");
		expect(res.headers.get("Cache-Control")).toContain("max-age=60");

		const stats = (await res.json()) as DrillRatingStats;
		expect(stats.upVotes).toBe(9);
		expect(stats.downVotes).toBe(1);
		expect(stats.likePercentage).toBe(90);
		expect(stats.tagCounts).toEqual({ hit_at_work: 5 });
	});
});
