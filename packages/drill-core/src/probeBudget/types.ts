export interface ProbeBudgetState {
	selectedProbeIds: string[];
	probesLocked: boolean;
}

export type ProbeBudgetAction =
	| { type: "TOGGLE_PROBE"; probeId: string }
	| { type: "LOCK_PROBES" }
	| { type: "RESET_PROBES" };
