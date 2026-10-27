import {
	type ClientDrillDefinitionDTO,
	type DailyWorkoutAssignment,
	type DrillAttemptRecord,
	selectDailyWorkout,
} from "@arcgym/drill-core";
import { useMemo } from "react";
import rawCanonicalDrills from "../data/canonicalDrills.json";

const ALL_DRILLS = rawCanonicalDrills as unknown as ClientDrillDefinitionDTO[];

export function useDrillRecommendation(
	completedDrills: Record<string, DrillAttemptRecord>,
	visitorId?: string,
) {
	const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

	const dailyWorkout: DailyWorkoutAssignment | null = useMemo(() => {
		return selectDailyWorkout({
			allDrills: ALL_DRILLS,
			completedDrills,
			todayDateStr,
			visitorId: visitorId || "guest",
		});
	}, [completedDrills, todayDateStr, visitorId]);

	return {
		dailyWorkout,
		allDrills: ALL_DRILLS,
	};
}

export { ALL_DRILLS };
