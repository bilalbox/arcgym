import { describe, expect, it, vi } from "vitest";
import type { TroubleshootingDrillDefinition } from "../../types/drill.js";
import {
	type ClefAiClient,
	ClefCauseGrader,
	normalizeClefChoice,
	withRetry,
} from "./clefGrader.js";

const FIXTURE_DRILL: TroubleshootingDrillDefinition = {
	id: "AGD-01001",
	title: "Fixture Incident",
	format: "Troubleshooting",
	domain: "Data_Architecture",
	domainLabel: "Data Architecture",
	difficulty: "Lead_CTA",
	pillars: ["Reliability"],
	version: 1,
	status: "draft",
	architecture: {
		synopsis:
			"CRM feeds Data Cloud. Zero Copy reads Snowflake. Segments refresh hourly.",
		diagramUrl: "/diagrams/fixture.svg",
	},
	issue: "Segment refreshes intermittently time out near the top of the hour.",
	probeBudget: 3,
	probes: [
		{
			id: "p1",
			label: "What changed?",
			tier: "pivotal",
			answer: "Formula fields added",
		},
	],
	goldCause: {
		text: "Formula fields force expensive Zero Copy evaluation overlapping segment refresh.",
		rationale:
			"Concurrent heavy evaluation plus schedule collision, not warehouse size.",
		citationUrl: "https://architect.salesforce.com/docs/fixture",
	},
	hiddenDistractors: [
		{
			id: "d1",
			text: "The Snowflake warehouse is still undersized for peak concurrent segment refresh load.",
			antipattern: "Scale First Warehouse",
			rationale: "Warehouse was already enlarged with no relief.",
		},
		{
			id: "d2",
			text: "Zero Copy connector rate limiting is throttling the segment refresh queries.",
			antipattern: "Blame Connector Ceiling",
			rationale: "No rate-limit evidence.",
		},
		{
			id: "d3",
			text: "Cross-region network latency between Data Cloud and Snowflake is causing the timeouts.",
			antipattern: "Network Ghost Hunt",
			rationale: "No latency incident.",
		},
	],
	fix: {
		prompt: "How should the concurrency collision be remediated?",
		options: [
			{
				id: "fix_gold",
				label: "Stagger transform schedules away from segment publish",
				isCorrect: true,
				rationale: "Staggering eliminates query collision.",
			},
			{
				id: "fix_d1",
				label: "Upsize Snowflake warehouse",
				isCorrect: false,
				distractorAntipattern: "Scale First Warehouse",
				rationale: "Upsizing does not resolve lock contention.",
			},
			{
				id: "fix_d2",
				label: "Relocate multi-region cluster",
				isCorrect: false,
				distractorAntipattern: "Network Ghost Hunt",
				rationale: "Network is not the bottleneck.",
			},
		],
	},
};

describe("normalizeClefChoice", () => {
	it("normalizes standard format: answers.match.choice + probabilities", () => {
		const raw = {
			answers: {
				match: {
					choice: "gold",
					probabilities: {
						gold: 0.88,
						d1: 0.05,
						d2: 0.03,
						d3: 0.02,
						other: 0.02,
					},
				},
			},
		};
		const res = normalizeClefChoice(raw);
		expect(res.choice).toBe("gold");
		expect(res.probabilities.gold).toBe(0.88);
	});

	it("normalizes nested result.answers.match format", () => {
		const raw = {
			result: {
				answers: {
					match: {
						choice: "d1",
						probabilities: { d1: 0.75, gold: 0.1 },
					},
				},
			},
		};
		const res = normalizeClefChoice(raw);
		expect(res.choice).toBe("d1");
		expect(res.probabilities.d1).toBe(0.75);
	});

	it("normalizes alternative keys: value and probs", () => {
		const raw = {
			answers: {
				match: {
					value: "d2",
					probs: { d2: 0.65, gold: 0.2 },
				},
			},
		};
		const res = normalizeClefChoice(raw);
		expect(res.choice).toBe("d2");
		expect(res.probabilities.d2).toBe(0.65);
	});

	it("normalizes alternative keys: answer and scores", () => {
		const raw = {
			answer: "other",
			scores: { other: 0.9, gold: 0.1 },
		};
		const res = normalizeClefChoice(raw);
		expect(res.choice).toBe("other");
		expect(res.probabilities.other).toBe(0.9);
	});

	it("handles null, undefined, and non-object inputs safely", () => {
		expect(normalizeClefChoice(null)).toEqual({
			choice: null,
			probabilities: {},
		});
		expect(normalizeClefChoice(undefined)).toEqual({
			choice: null,
			probabilities: {},
		});
		expect(normalizeClefChoice("error")).toEqual({
			choice: null,
			probabilities: {},
		});
	});
});

describe("withRetry", () => {
	it("retries on 502/503/timeout and succeeds on attempt 2", async () => {
		let callCount = 0;
		const fn = vi.fn(async () => {
			callCount++;
			if (callCount === 1) {
				throw new Error("503 Service Unavailable");
			}
			return "success";
		});

		const result = await withRetry(fn, 2);
		expect(result).toBe("success");
		expect(callCount).toBe(2);
	});

	it("bails immediately on non-retryable errors (e.g. 400 Bad Request)", async () => {
		let callCount = 0;
		const fn = vi.fn(async () => {
			callCount++;
			throw new Error("400 Bad Request: invalid model");
		});

		await expect(withRetry(fn, 2)).rejects.toThrow("400 Bad Request");
		expect(callCount).toBe(1);
	});

	it("throws when retry attempts are exhausted on transient errors", async () => {
		const fn = vi.fn(async () => {
			throw new Error("timed out after 5000ms");
		});

		await expect(withRetry(fn, 2)).rejects.toThrow("timed out");
		expect(fn).toHaveBeenCalledTimes(2);
	});
});

describe("ClefCauseGrader", () => {
	it("classifies correct verdict when CLEF selects gold", async () => {
		const mockAi: ClefAiClient = {
			run: vi.fn(async () => ({
				answers: {
					match: {
						choice: "gold",
						probabilities: {
							gold: 0.85,
							d1: 0.05,
							d2: 0.04,
							d3: 0.03,
							other: 0.03,
						},
					},
				},
			})),
		};

		const grader = new ClefCauseGrader(mockAi);
		const result = await grader.grade({
			drill: FIXTURE_DRILL,
			causeText: "Formula fields collision with segment refresh",
		});

		expect(result.verdict).toBe("correct");
		expect(result.isCorrect).toBe(true);
		expect(result.chosenId).toBe("gold");
		expect(result.goldText).toBe(FIXTURE_DRILL.goldCause.text);
		expect(result.goldRationale).toBe(FIXTURE_DRILL.goldCause.rationale);
		expect(result.goldCitationUrl).toBe(FIXTURE_DRILL.goldCause.citationUrl);
		expect(result.matchedDistractor).toBeNull();
	});

	it("classifies incorrect_distractor verdict when CLEF selects a distractor", async () => {
		const mockAi: ClefAiClient = {
			run: vi.fn(async () => ({
				answers: {
					match: {
						choice: "d1",
						probabilities: {
							d1: 0.72,
							gold: 0.1,
							d2: 0.05,
							d3: 0.03,
							other: 0.1,
						},
					},
				},
			})),
		};

		const grader = new ClefCauseGrader(mockAi);
		const result = await grader.grade({
			drill: FIXTURE_DRILL,
			causeText: "Warehouse is undersized",
		});

		expect(result.verdict).toBe("incorrect_distractor");
		expect(result.isCorrect).toBe(false);
		expect(result.chosenId).toBe("d1");
		expect(result.matchedDistractor).not.toBeNull();
		expect(result.matchedDistractor?.id).toBe("d1");
		expect(result.matchedDistractor?.antipattern).toBe("Scale First Warehouse");
		expect(result.matchedDistractor?.rationale).toBe(
			"Warehouse was already enlarged with no relief.",
		);
		expect(result.goldText).toBe(FIXTURE_DRILL.goldCause.text);
	});

	it("classifies incorrect_miss verdict when CLEF selects other", async () => {
		const mockAi: ClefAiClient = {
			run: vi.fn(async () => ({
				answers: {
					match: {
						choice: "other",
						probabilities: {
							other: 0.65,
							gold: 0.1,
							d1: 0.1,
							d2: 0.1,
							d3: 0.05,
						},
					},
				},
			})),
		};

		const grader = new ClefCauseGrader(mockAi);
		const result = await grader.grade({
			drill: FIXTURE_DRILL,
			causeText: "Maybe someone pulled the plug",
		});

		expect(result.verdict).toBe("incorrect_miss");
		expect(result.isCorrect).toBe(false);
		expect(result.chosenId).toBe("other");
		expect(result.matchedDistractor).toBeNull();
		expect(result.goldText).toBe(FIXTURE_DRILL.goldCause.text);
	});
});
