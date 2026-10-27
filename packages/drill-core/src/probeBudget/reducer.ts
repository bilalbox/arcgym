import type { ProbeOptionDTO } from "../types/drill.js";
import type { ProbeBudgetAction, ProbeBudgetState } from "./types.js";

export function createProbeBudgetState(
	initial?: Partial<ProbeBudgetState>,
): ProbeBudgetState {
	return {
		selectedProbeIds: initial?.selectedProbeIds ?? [],
		probesLocked: initial?.probesLocked ?? false,
	};
}

export function getRemainingProbeBudget(
	probeBudget: number,
	selectedProbeIds: string[],
): number {
	return Math.max(0, probeBudget - selectedProbeIds.length);
}

export function getUnlockedProbes(
	probes: ProbeOptionDTO[],
	selectedProbeIds: string[],
): ProbeOptionDTO[] {
	return probes.filter((p) => selectedProbeIds.includes(p.id));
}

export function probeBudgetReducer(
	state: ProbeBudgetState,
	action: ProbeBudgetAction,
	context: {
		probes: ProbeOptionDTO[];
		probeBudget: number;
	},
): ProbeBudgetState {
	switch (action.type) {
		case "RESET_PROBES":
			return createProbeBudgetState();

		case "TOGGLE_PROBE": {
			if (state.probesLocked) return state;
			if (!context.probes.some((p) => p.id === action.probeId)) return state;

			const already = state.selectedProbeIds.includes(action.probeId);
			if (already) {
				return {
					...state,
					selectedProbeIds: state.selectedProbeIds.filter(
						(id) => id !== action.probeId,
					),
				};
			}

			if (state.selectedProbeIds.length >= context.probeBudget) {
				return state;
			}

			return {
				...state,
				selectedProbeIds: [...state.selectedProbeIds, action.probeId],
			};
		}

		case "LOCK_PROBES": {
			if (state.probesLocked || state.selectedProbeIds.length === 0) {
				return state;
			}
			return {
				...state,
				probesLocked: true,
			};
		}

		default:
			return state;
	}
}
