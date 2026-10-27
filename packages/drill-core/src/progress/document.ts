import type {
	DrillAttemptRecord,
	VisitorProgressState,
} from "../types/drill.js";

/**
 * On-disk / D1 document shape for the hybrid `completed_drills_json` column.
 * v2 wraps drills; legacy rows are a bare drills map.
 */
export interface ProgressDocumentV2 {
	v: 2;
	drills: Record<string, DrillAttemptRecord>;
}

export function serializeProgressDocument(state: VisitorProgressState): string {
	const doc: ProgressDocumentV2 = {
		v: 2,
		drills: state.completedDrills ?? {},
	};
	return JSON.stringify(doc);
}

export function parseProgressDocument(raw: string): {
	completedDrills: Record<string, DrillAttemptRecord>;
} {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw || "{}");
	} catch {
		return { completedDrills: {} };
	}

	if (!parsed || typeof parsed !== "object") {
		return { completedDrills: {} };
	}

	const obj = parsed as Record<string, unknown>;
	if (obj.v === 2 && obj.drills && typeof obj.drills === "object") {
		return {
			completedDrills: obj.drills as Record<string, DrillAttemptRecord>,
		};
	}

	// Legacy: entire JSON is the completedDrills map.
	return { completedDrills: obj as Record<string, DrillAttemptRecord> };
}

export function progressStateFromDocument(
	doc: ReturnType<typeof parseProgressDocument>,
	meta: { streakDays: number; lastActiveDate: string },
): VisitorProgressState {
	return {
		version: 1,
		streakDays: meta.streakDays,
		lastActiveDate: meta.lastActiveDate,
		completedDrills: doc.completedDrills,
	};
}
