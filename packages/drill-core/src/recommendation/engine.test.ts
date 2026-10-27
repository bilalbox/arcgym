import { describe, expect, it } from "vitest";
import type {
	CaseFileDrillDefinition,
	DrillAttemptRecord,
	DrillDefinitionDTO,
	TroubleshootingDrillDefinition,
} from "../types/drill.js";
import { hashDateString, hashString, selectDailyWorkout } from "./engine.js";

function mockCaseFile(
	id: string,
	title = `Case ${id}`,
): CaseFileDrillDefinition {
	return {
		id,
		title,
		format: "Case_File",
		domain: "Platform_Core",
		domainLabel: "Platform Core",
		difficulty: "Lead_CTA",
		pillars: ["Reliability"],
		version: 1,
		status: "published",
		brief: {
			title: `${title} Brief`,
			synopsis: "Evaluation brief narrative",
		},
		stations: [],
	};
}

function mockIncident(
	id: string,
	title = `Incident ${id}`,
): TroubleshootingDrillDefinition {
	return {
		id,
		title,
		format: "Troubleshooting",
		domain: "Data_Architecture",
		domainLabel: "Data Architecture",
		difficulty: "Lead_CTA",
		pillars: ["Operational_Excellence"],
		version: 1,
		status: "published",
		architecture: {
			synopsis: "Topology synopsis",
			diagramUrl: "/diagrams/test.svg",
		},
		issue: "Issue description",
		probeBudget: 3,
		probes: [],
		goldCause: {
			text: "Cause",
			rationale: "Rationale",
		},
		hiddenDistractors: [
			{ id: "d1", text: "Wrong 1", antipattern: "AP 1", rationale: "R1" },
			{ id: "d2", text: "Wrong 2", antipattern: "AP 2", rationale: "R2" },
			{ id: "d3", text: "Wrong 3", antipattern: "AP 3", rationale: "R3" },
		],
		fix: {
			prompt: "Fix prompt",
			options: [
				{ id: "f1", label: "Fix 1", rationale: "r1", isCorrect: true },
				{ id: "f2", label: "Fix 2", rationale: "r2", isCorrect: false },
				{ id: "f3", label: "Fix 3", rationale: "r3", isCorrect: false },
			],
		},
	};
}

describe("Recommendation Engine (selectDailyWorkout)", () => {
	it("hashString and hashDateString are deterministic", () => {
		expect(hashString("2026-09-27:user1")).toBe(hashString("2026-09-27:user1"));
		expect(hashString("2026-09-27:user1")).not.toBe(
			hashString("2026-09-28:user1"),
		);
		expect(hashDateString("2026-09-27")).toBe(hashDateString("2026-09-27"));
	});

	it("returns null when allDrills is empty", () => {
		const result = selectDailyWorkout({
			allDrills: [],
			completedDrills: {},
			todayDateStr: "2026-10-20",
			visitorId: "visitor1",
		});
		expect(result).toBeNull();
	});

	it("selects deterministically for a date and visitor", () => {
		const drills: DrillDefinitionDTO[] = [
			mockCaseFile("AGD-00403"),
			mockCaseFile("AGD-00901"),
			mockIncident("AGD-01001"),
			mockIncident("AGD-01002"),
		];

		const res1 = selectDailyWorkout({
			allDrills: drills,
			completedDrills: {},
			todayDateStr: "2026-10-20",
			visitorId: "user-a",
		});
		const res2 = selectDailyWorkout({
			allDrills: drills,
			completedDrills: {},
			todayDateStr: "2026-10-20",
			visitorId: "user-a",
		});
		expect(res1).not.toBeNull();
		expect(res1).toEqual(res2);
		expect(["Case_File", "Troubleshooting"]).toContain(res1?.format);
	});

	it("prioritizes uncompleted drills over completed drills", () => {
		const case1 = mockCaseFile("AGD-00403");
		const case2 = mockCaseFile("AGD-00901");
		const drills: DrillDefinitionDTO[] = [case1, case2];

		const completed: Record<string, DrillAttemptRecord> = {
			"AGD-00403": {
				drillId: "AGD-00403",
				format: "Case_File",
				completedAt: "2026-10-19T10:00:00Z",
				score: 100,
				accuracy: 1,
				attemptsCount: 1,
			},
		};

		const res = selectDailyWorkout({
			allDrills: drills,
			completedDrills: completed,
			todayDateStr: "2026-10-20",
			visitorId: "user-a",
		});

		expect(res).not.toBeNull();
		expect(res?.drillId).toBe("AGD-00901");
		expect(res?.isCompletedToday).toBe(false);
	});

	it("marks isCompletedToday as true when the assigned drill was completed today", () => {
		const case1 = mockCaseFile("AGD-00403");
		const drills: DrillDefinitionDTO[] = [case1];

		const completed: Record<string, DrillAttemptRecord> = {
			"AGD-00403": {
				drillId: "AGD-00403",
				format: "Case_File",
				completedAt: "2026-10-20T14:30:00Z",
				score: 120,
				accuracy: 1,
				attemptsCount: 1,
			},
		};

		const res = selectDailyWorkout({
			allDrills: drills,
			completedDrills: completed,
			todayDateStr: "2026-10-20",
			visitorId: "user-a",
		});

		expect(res).not.toBeNull();
		expect(res?.isCompletedToday).toBe(true);
	});
});
