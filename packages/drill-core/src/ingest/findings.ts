import * as fs from "node:fs";
import type { WordingFinding } from "../lint/wording.js";
import {
	isValidationFindingSurgicallyFixable,
	type ValidationFinding,
} from "../validator/validator.js";

/** Closed set of Adversarial CTA Red-Team traps for this wave. */
export type RedTeamRuleId =
	| "giveaway-stem"
	| "dual-grounding"
	| "distractor-restates-correct"
	| "correct-too-obvious";

/** One red-team finding; same seam shape as wording findings. */
export type RedTeamFinding = {
	ruleId: RedTeamRuleId;
	where: string;
	message: string;
};

/** Editorial sidecar written beside a draft when ingest or red-team fails. Not learner-facing. */
export type IngestFindings = {
	drillId: string;
	failedAt: string;
	reasons: Array<"validation" | "wording" | "redteam">;
	validationFindings?: ValidationFinding[];
	wordingFindings?: WordingFinding[];
	redteamFindings?: RedTeamFinding[];
};

/**
 * True when findings include a non-surgically fixable validation finding
 * (Citation Manifest mismatch or missing asset) or a dual-grounding red-team finding
 * that cannot be fixed by editing the draft alone — hand off to generating-drills.
 */
export function findingsRequireGroundingHandoff(
	findings: IngestFindings,
): boolean {
	if (findings.redteamFindings?.some((f) => f.ruleId === "dual-grounding")) {
		return true;
	}
	if (
		findings.validationFindings?.some(
			(f) => !isValidationFindingSurgicallyFixable(f.ruleId),
		)
	) {
		return true;
	}
	return false;
}

/** `content/drills/<id>.json` → `content/drills/<id>.findings.json` */
export function findingsSidecarPath(drillJsonPath: string): string {
	if (drillJsonPath.endsWith(".json")) {
		return `${drillJsonPath.slice(0, -".json".length)}.findings.json`;
	}
	return `${drillJsonPath}.findings.json`;
}

/** Persist ingest failure findings next to the draft Drill (draft file left untouched). */
export function writeIngestFindings(
	drillJsonPath: string,
	findings: IngestFindings,
): void {
	fs.writeFileSync(
		findingsSidecarPath(drillJsonPath),
		`${JSON.stringify(findings, null, 2)}\n`,
		"utf-8",
	);
}

/** Remove a stale findings sidecar after a clean successful ingest. */
export function clearIngestFindings(drillJsonPath: string): void {
	const sidecar = findingsSidecarPath(drillJsonPath);
	if (fs.existsSync(sidecar)) {
		fs.unlinkSync(sidecar);
	}
}
