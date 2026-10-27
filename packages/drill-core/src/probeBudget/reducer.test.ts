import { describe, expect, it } from "vitest";
import type { ProbeOptionDTO } from "../types/drill.js";
import {
	createProbeBudgetState,
	getRemainingProbeBudget,
	getUnlockedProbes,
	probeBudgetReducer,
} from "./reducer.js";

const PROBES: ProbeOptionDTO[] = [
	{ id: "p1", label: "Probe 1", tier: "pivotal", answer: "Answer 1" },
	{ id: "p2", label: "Probe 2", tier: "pivotal", answer: "Answer 2" },
	{ id: "p3", label: "Probe 3", tier: "useful", answer: "Answer 3" },
	{ id: "p4", label: "Probe 4", tier: "distractor", answer: "Answer 4" },
];

describe("probeBudgetReducer", () => {
	const context = { probes: PROBES, probeBudget: 2 };

	it("initializes with default empty state", () => {
		const state = createProbeBudgetState();
		expect(state.selectedProbeIds).toEqual([]);
		expect(state.probesLocked).toBe(false);
	});

	it("toggles probes on and off", () => {
		let state = createProbeBudgetState();
		state = probeBudgetReducer(
			state,
			{ type: "TOGGLE_PROBE", probeId: "p1" },
			context,
		);
		expect(state.selectedProbeIds).toEqual(["p1"]);

		state = probeBudgetReducer(
			state,
			{ type: "TOGGLE_PROBE", probeId: "p2" },
			context,
		);
		expect(state.selectedProbeIds).toEqual(["p1", "p2"]);

		// Toggling existing probe removes it
		state = probeBudgetReducer(
			state,
			{ type: "TOGGLE_PROBE", probeId: "p1" },
			context,
		);
		expect(state.selectedProbeIds).toEqual(["p2"]);
	});

	it("rejects unknown probe IDs that are not in the probe pool", () => {
		let state = createProbeBudgetState();
		state = probeBudgetReducer(
			state,
			{ type: "TOGGLE_PROBE", probeId: "unknown_probe" },
			context,
		);
		expect(state.selectedProbeIds).toEqual([]);
	});

	it("enforces probeBudget ceiling", () => {
		let state = createProbeBudgetState();
		state = probeBudgetReducer(
			state,
			{ type: "TOGGLE_PROBE", probeId: "p1" },
			context,
		);
		state = probeBudgetReducer(
			state,
			{ type: "TOGGLE_PROBE", probeId: "p2" },
			context,
		);
		// Budget is 2, third attempt should be ignored
		state = probeBudgetReducer(
			state,
			{ type: "TOGGLE_PROBE", probeId: "p3" },
			context,
		);
		expect(state.selectedProbeIds).toEqual(["p1", "p2"]);
	});

	it("prevents toggling when probes are locked", () => {
		const lockedState = { selectedProbeIds: ["p1"], probesLocked: true };
		const nextState = probeBudgetReducer(
			lockedState,
			{ type: "TOGGLE_PROBE", probeId: "p2" },
			context,
		);
		expect(nextState).toBe(lockedState);
	});

	it("refuses to lock when zero probes are selected", () => {
		const emptyState = createProbeBudgetState();
		const result = probeBudgetReducer(
			emptyState,
			{ type: "LOCK_PROBES" },
			context,
		);
		expect(result.probesLocked).toBe(false);
	});

	it("locks probes when at least one is selected", () => {
		const state = { selectedProbeIds: ["p1"], probesLocked: false };
		const result = probeBudgetReducer(state, { type: "LOCK_PROBES" }, context);
		expect(result.probesLocked).toBe(true);
		expect(result.selectedProbeIds).toEqual(["p1"]);
	});

	it("resets probe selection and locked status on RESET_PROBES", () => {
		const state = { selectedProbeIds: ["p1", "p2"], probesLocked: true };
		const result = probeBudgetReducer(state, { type: "RESET_PROBES" }, context);
		expect(result.selectedProbeIds).toEqual([]);
		expect(result.probesLocked).toBe(false);
	});
});

describe("probeBudget helpers", () => {
	it("calculates remaining probe budget correctly", () => {
		expect(getRemainingProbeBudget(3, [])).toBe(3);
		expect(getRemainingProbeBudget(3, ["p1"])).toBe(2);
		expect(getRemainingProbeBudget(3, ["p1", "p2", "p3"])).toBe(0);
		// Never negative
		expect(getRemainingProbeBudget(3, ["p1", "p2", "p3", "p4"])).toBe(0);
	});

	it("extracts unlocked probe definitions based on selected IDs", () => {
		const unlocked = getUnlockedProbes(PROBES, ["p1", "p3"]);
		expect(unlocked).toHaveLength(2);
		expect(unlocked.map((p) => p.id)).toEqual(["p1", "p3"]);
	});
});
