import { describe, expect, it } from "vitest";
import {
	calculateActiveStreak,
	calculateTotalPoints,
	computeNewStreak,
} from "./streak.js";

describe("Streak calculation engine", () => {
	const TODAY = "2026-09-28";
	const YESTERDAY = "2026-09-27";
	const TWO_DAYS_AGO = "2026-09-26";

	describe("computeNewStreak", () => {
		it("sets streak to 1 after first drill completed", () => {
			// First drill ever
			expect(computeNewStreak(0, undefined, TODAY, YESTERDAY)).toBe(1);
			expect(computeNewStreak(0, "", TODAY, YESTERDAY)).toBe(1);
		});

		it("keeps streak unchanged when multiple drills are completed on the same day", () => {
			// User did 1 drill today, and now does a 2nd drill today
			expect(computeNewStreak(1, TODAY, TODAY, YESTERDAY)).toBe(1);
			// User with 5-day streak does another drill today
			expect(computeNewStreak(5, TODAY, TODAY, YESTERDAY)).toBe(5);
		});

		it("increments streak if drill is completed on consecutive day (yesterday)", () => {
			// User did drill yesterday, does one today -> streak goes 1 -> 2
			expect(computeNewStreak(1, YESTERDAY, TODAY, YESTERDAY)).toBe(2);
			// Streak goes 10 -> 11
			expect(computeNewStreak(10, YESTERDAY, TODAY, YESTERDAY)).toBe(11);
		});

		it("resets streak to 1 if more than one day has elapsed since last drill", () => {
			// Missed yesterday
			expect(computeNewStreak(7, TWO_DAYS_AGO, TODAY, YESTERDAY)).toBe(1);
			expect(computeNewStreak(15, "2026-09-01", TODAY, YESTERDAY)).toBe(1);
		});
	});

	describe("calculateActiveStreak (on load / display)", () => {
		it("returns 0 when 0 drills have been completed", () => {
			expect(calculateActiveStreak(1, TODAY, 0, TODAY, YESTERDAY)).toBe(0);
			expect(calculateActiveStreak(0, "", 0, TODAY, YESTERDAY)).toBe(0);
		});

		it("returns 0 if last active date is missing or streakDays is 0", () => {
			expect(calculateActiveStreak(0, TODAY, 1, TODAY, YESTERDAY)).toBe(0);
			expect(calculateActiveStreak(1, "", 1, TODAY, YESTERDAY)).toBe(0);
			expect(calculateActiveStreak(1, undefined, 1, TODAY, YESTERDAY)).toBe(0);
		});

		it("returns streak count if user practiced today", () => {
			expect(calculateActiveStreak(3, TODAY, 5, TODAY, YESTERDAY)).toBe(3);
		});

		it("returns streak count if user practiced yesterday (streak alive for today)", () => {
			expect(calculateActiveStreak(4, YESTERDAY, 6, TODAY, YESTERDAY)).toBe(4);
		});

		it("returns 0 if user missed yesterday (streak expired)", () => {
			expect(calculateActiveStreak(5, TWO_DAYS_AGO, 10, TODAY, YESTERDAY)).toBe(
				0,
			);
			expect(calculateActiveStreak(2, "2026-01-01", 5, TODAY, YESTERDAY)).toBe(
				0,
			);
		});
	});

	describe("calculateTotalPoints", () => {
		it("returns 0 for empty completed drills", () => {
			expect(calculateTotalPoints({})).toBe(0);
		});

		it("correctly sums scores across completed drills", () => {
			const records = {
				"drill-1": { score: 95 },
				"drill-2": { score: 75 },
				"drill-3": { score: -20 },
				"drill-4": { score: 100 },
			};
			expect(calculateTotalPoints(records)).toBe(250);
		});
	});
});
