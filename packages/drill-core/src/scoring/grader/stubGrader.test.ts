import { describe, expect, it } from "vitest";
import type { TroubleshootingDrillDefinition } from "../../types/drill.js";
import { StubCauseGrader } from "./stubGrader.js";

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

describe("StubCauseGrader", () => {
	const grader = new StubCauseGrader();

	it("grades exact or near-exact gold phrasing as correct", async () => {
		const result = await grader.grade({
			drill: FIXTURE_DRILL,
			causeText:
				"Formula fields force expensive Zero Copy evaluation overlapping segment refresh",
		});

		expect(result.verdict).toBe("correct");
		expect(result.isCorrect).toBe(true);
		expect(result.chosenId).toBe("gold");
		expect(result.goldText).toBe(FIXTURE_DRILL.goldCause.text);
		expect(result.goldRationale).toBe(FIXTURE_DRILL.goldCause.rationale);
		expect(result.goldCitationUrl).toBe(FIXTURE_DRILL.goldCause.citationUrl);
		expect(result.matchedDistractor).toBeNull();
	});

	it("grades distractor phrasing as incorrect_distractor with matched antipattern", async () => {
		const result = await grader.grade({
			drill: FIXTURE_DRILL,
			causeText: "The Snowflake warehouse is still undersized for peak load",
		});

		expect(result.verdict).toBe("incorrect_distractor");
		expect(result.isCorrect).toBe(false);
		expect(result.chosenId).toBe("d1");
		expect(result.matchedDistractor).not.toBeNull();
		expect(result.matchedDistractor?.id).toBe("d1");
		expect(result.matchedDistractor?.antipattern).toBe("Scale First Warehouse");
		expect(result.goldText).toBe(FIXTURE_DRILL.goldCause.text);
	});

	it("grades vague or off-target phrasing as incorrect_miss (other)", async () => {
		const result = await grader.grade({
			drill: FIXTURE_DRILL,
			causeText: "Maybe something with DNS or random server rebooting",
		});

		expect(result.verdict).toBe("incorrect_miss");
		expect(result.isCorrect).toBe(false);
		expect(result.chosenId).toBe("other");
		expect(result.matchedDistractor).toBeNull();
		expect(result.goldText).toBe(FIXTURE_DRILL.goldCause.text);
	});
});
