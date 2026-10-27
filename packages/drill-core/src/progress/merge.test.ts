import { describe, expect, it } from "vitest";
import type { VisitorProgressState } from "../types/drill.js";
import { mergeProgressStates } from "./merge.js";

describe("mergeProgressStates", () => {
	const TODAY = "2026-10-04";
	const YESTERDAY = "2026-10-03";

	it("unions non-overlapping drills from local and cloud", () => {
		const local: VisitorProgressState = {
			version: 1,
			streakDays: 1,
			lastActiveDate: TODAY,
			completedDrills: {
				"drill-1": {
					drillId: "drill-1",
					format: "Case_File",
					completedAt: `${TODAY}T10:00:00Z`,
					score: 80,
					accuracy: 1,
					attemptsCount: 1,
				},
			},
		};

		const cloud: VisitorProgressState = {
			version: 1,
			streakDays: 1,
			lastActiveDate: YESTERDAY,
			completedDrills: {
				"drill-2": {
					drillId: "drill-2",
					format: "Case_File",
					completedAt: `${YESTERDAY}T15:00:00Z`,
					score: 95,
					accuracy: 1,
					attemptsCount: 1,
				},
			},
		};

		const merged = mergeProgressStates(local, cloud, TODAY);
		expect(Object.keys(merged.completedDrills)).toEqual(
			expect.arrayContaining(["drill-1", "drill-2"]),
		);
		expect(merged.completedDrills["drill-1"]!.score).toBe(80);
		expect(merged.completedDrills["drill-2"]!.score).toBe(95);
		expect(merged.lastActiveDate).toBe(TODAY);
		expect(merged.streakDays).toBe(1);
	});

	it("merges overlapping drill keeping maximum score and attemptsCount", () => {
		const local: VisitorProgressState = {
			version: 1,
			streakDays: 2,
			lastActiveDate: TODAY,
			completedDrills: {
				"drill-1": {
					drillId: "drill-1",
					format: "Case_File",
					completedAt: `${TODAY}T12:00:00Z`,
					score: 100,
					accuracy: 1,
					attemptsCount: 2,
				},
			},
		};

		const cloud: VisitorProgressState = {
			version: 1,
			streakDays: 1,
			lastActiveDate: YESTERDAY,
			completedDrills: {
				"drill-1": {
					drillId: "drill-1",
					format: "Case_File",
					completedAt: `${YESTERDAY}T09:00:00Z`,
					score: 60,
					accuracy: 0.67,
					attemptsCount: 1,
				},
			},
		};

		const merged = mergeProgressStates(local, cloud, TODAY);
		expect(merged.completedDrills["drill-1"]!.score).toBe(100);
		expect(merged.completedDrills["drill-1"]!.attemptsCount).toBe(2);
		expect(merged.completedDrills["drill-1"]!.completedAt).toBe(
			`${TODAY}T12:00:00Z`,
		);
	});

	it("reconciles empty cloud or local state gracefully", () => {
		const local: VisitorProgressState = {
			version: 1,
			streakDays: 3,
			lastActiveDate: TODAY,
			completedDrills: {},
		};

		const cloud: VisitorProgressState = {
			version: 1,
			streakDays: 0,
			lastActiveDate: "",
			completedDrills: {},
		};

		const merged = mergeProgressStates(local, cloud, TODAY);
		expect(merged.completedDrills).toEqual({});
		expect(merged.streakDays).toBe(0); // 0 completed drills => active streak 0
	});
});
