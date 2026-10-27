import { describe, expect, it } from "vitest";
import { orderOptions } from "../index.js";

const OPTIONS = ["a", "b", "c", "d"];

/** Seeds shaped like the runners' `drillId:stepId` for every drill id range. */
const CORPUS_SHAPED_SEEDS = Array.from(
	{ length: 700 },
	(_, i) => `AGD-${String(100 + i).padStart(5, "0")}`,
).flatMap((drillId) =>
	["s1", "s2", "s3", "1", "2", "3", "4"].map(
		(stepId) => `${drillId}:${stepId}`,
	),
);

describe("orderOptions", () => {
	it("returns a permutation of the options", () => {
		const ordered = orderOptions(OPTIONS, "AGD-00201:s1");
		expect([...ordered].sort()).toEqual(OPTIONS);
	});

	it("returns the same order every time for the same seed", () => {
		expect(orderOptions(OPTIONS, "AGD-00201:s1")).toEqual(
			orderOptions(OPTIONS, "AGD-00201:s1"),
		);
	});

	it("orders different steps differently", () => {
		const orders = new Set(
			Array.from({ length: 20 }, (_, i) =>
				orderOptions(OPTIONS, `AGD-00201:s${i}`).join(""),
			),
		);
		expect(orders.size).toBeGreaterThan(5);
	});

	it.each([2, 3, 4])(
		"moves the first authored option to each of %i positions about equally often",
		(count) => {
			const landed = new Array(count).fill(0);
			for (const seed of CORPUS_SHAPED_SEEDS) {
				const authored = Array.from({ length: count }, (_, i) => i);
				landed[orderOptions(authored, seed).indexOf(0)]++;
			}
			for (const hits of landed) {
				expect(hits / CORPUS_SHAPED_SEEDS.length).toBeCloseTo(1 / count, 1);
			}
		},
	);
});
