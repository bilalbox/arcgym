import { getDrillFormatDescriptor } from "../formats/index.js";
import {
	ARCHITECTURAL_DOMAINS,
	type ArchitecturalDomain,
	DRILL_DIFFICULTIES,
	DRILL_FORMATS,
	DRILL_STATUSES,
	type DrillDefinitionDTO,
	type DrillDifficulty,
	type DrillFormat,
	type DrillStatus,
	WELL_ARCHITECTED_PILLARS,
	type WellArchitectedPillar,
} from "../types/drill.js";
import { isValidDrillId, isValidFrictionCardId } from "../types/validation.js";

import type {
	ValidationContext,
	ValidationFinding,
	ValidationRuleId,
} from "./types.js";

export type { ValidationContext, ValidationFinding, ValidationRuleId };

export type ValidationResult =
	| { ok: true; drill: DrillDefinitionDTO }
	| { ok: false; findings: ValidationFinding[] };

export function isValidationFindingSurgicallyFixable(
	ruleId: ValidationRuleId,
): boolean {
	return ruleId !== "citation-manifest" && ruleId !== "missing-asset";
}

export function validateDrill(
	raw: unknown,
	ctx: ValidationContext = {},
): ValidationResult {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return {
			ok: false,
			findings: [
				{
					ruleId: "missing-field",
					where: "",
					message: "Drill must be a non-null object",
				},
			],
		};
	}

	const drill = raw as Record<string, unknown>;
	const topFindings: ValidationFinding[] = [];

	if (!drill.id || typeof drill.id !== "string") {
		topFindings.push({
			ruleId: "missing-field",
			where: "id",
			message: "missing required field id",
		});
	} else if (!isValidDrillId(drill.id)) {
		topFindings.push({
			ruleId: "missing-field",
			where: "id",
			message: `id must match AGD-ddddd (got ${drill.id})`,
		});
	}

	if (!drill.title || typeof drill.title !== "string") {
		topFindings.push({
			ruleId: "missing-field",
			where: "title",
			message: "missing required field title",
		});
	}

	if (!drill.domain || typeof drill.domain !== "string") {
		topFindings.push({
			ruleId: "missing-field",
			where: "domain",
			message: "missing required field domain",
		});
	} else if (
		!ARCHITECTURAL_DOMAINS.includes(drill.domain as ArchitecturalDomain)
	) {
		topFindings.push({
			ruleId: "invalid-enum",
			where: "domain",
			message: `invalid Architectural Domain: ${drill.domain}`,
		});
	}

	if (!drill.domainLabel || typeof drill.domainLabel !== "string") {
		topFindings.push({
			ruleId: "missing-field",
			where: "domainLabel",
			message: "missing required field domainLabel",
		});
	}

	if (
		!drill.pillars ||
		!Array.isArray(drill.pillars) ||
		drill.pillars.length === 0
	) {
		topFindings.push({
			ruleId: "missing-field",
			where: "pillars",
			message: "pillars must not be empty",
		});
	} else {
		for (const pillar of drill.pillars) {
			if (!WELL_ARCHITECTED_PILLARS.includes(pillar as WellArchitectedPillar)) {
				topFindings.push({
					ruleId: "invalid-enum",
					where: "pillars",
					message: `invalid Well-Architected pillar: ${pillar}`,
				});
			}
		}
	}

	if (!drill.format || typeof drill.format !== "string") {
		topFindings.push({
			ruleId: "missing-field",
			where: "format",
			message: "missing required field format",
		});
	} else if (!DRILL_FORMATS.includes(drill.format as DrillFormat)) {
		topFindings.push({
			ruleId: "invalid-enum",
			where: "format",
			message: `invalid Drill Format: ${drill.format}`,
		});
	}

	if (!drill.status || typeof drill.status !== "string") {
		topFindings.push({
			ruleId: "missing-field",
			where: "status",
			message: "missing required field status",
		});
	} else if (!DRILL_STATUSES.includes(drill.status as DrillStatus)) {
		topFindings.push({
			ruleId: "invalid-enum",
			where: "status",
			message: `invalid status: ${drill.status} (expected draft|published)`,
		});
	}

	if (topFindings.length > 0) {
		return { ok: false, findings: topFindings };
	}

	const findings: ValidationFinding[] = [];

	if (!drill.difficulty || typeof drill.difficulty !== "string") {
		findings.push({
			ruleId: "missing-field",
			where: "difficulty",
			message: "missing required field difficulty",
		});
	} else if (
		!DRILL_DIFFICULTIES.includes(drill.difficulty as DrillDifficulty)
	) {
		findings.push({
			ruleId: "invalid-enum",
			where: "difficulty",
			message: `invalid difficulty: ${drill.difficulty}`,
		});
	}

	if (drill.sourceCardIds !== undefined) {
		if (
			!Array.isArray(drill.sourceCardIds) ||
			!drill.sourceCardIds.every(isValidFrictionCardId)
		) {
			findings.push({
				ruleId: "missing-field",
				where: "sourceCardIds",
				message:
					"sourceCardIds must be an array of Friction Card ids (FC-<discussion_id>)",
			});
		}
	}

	const format = drill.format as DrillFormat;

	getDrillFormatDescriptor(format).validate(drill, ctx, findings);

	if (findings.length > 0) {
		return { ok: false, findings };
	}

	return { ok: true, drill: drill as unknown as DrillDefinitionDTO };
}
