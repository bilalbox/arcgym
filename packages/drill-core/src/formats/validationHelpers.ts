import { isEligibleCorrectOptionCitation } from "../types/citationManifest.js";
import { PROBE_TIERS, type ProbeTier } from "../types/drill.js";
import { isAllowedCitationUrl } from "../types/validation.js";
import type {
	ValidationContext,
	ValidationFinding,
} from "../validator/types.js";

export function isCitationValid(url: unknown, ctx: ValidationContext): boolean {
	if (ctx.citationManifest) {
		return isEligibleCorrectOptionCitation(url, ctx.citationManifest);
	}
	return isAllowedCitationUrl(url);
}

export function validateDiagramUrl(
	diagramUrl: unknown,
	where: string,
	ctx: ValidationContext,
	findings: ValidationFinding[],
): void {
	if (diagramUrl === undefined) return;
	if (typeof diagramUrl !== "string" || !diagramUrl.startsWith("/")) {
		findings.push({
			ruleId: "missing-asset",
			where,
			message: `${where} diagramUrl must be an absolute path (e.g. /diagrams/...)`,
		});
		return;
	}
	if (ctx.assetExists && !ctx.assetExists(diagramUrl)) {
		findings.push({
			ruleId: "missing-asset",
			where,
			message: `${where} diagramUrl references missing asset: ${diagramUrl}`,
		});
	}
}

export function validateDiagramSource(
	diagramSource: unknown,
	where: string,
	ctx: ValidationContext,
	findings: ValidationFinding[],
): void {
	if (diagramSource === undefined) return;
	if (typeof diagramSource !== "string" || !diagramSource.trim()) {
		findings.push({
			ruleId: "missing-field",
			where,
			message: `${where} must be a non-empty Mermaid diagram string`,
		});
		return;
	}
	if (ctx.validateMermaid) {
		const res = ctx.validateMermaid(diagramSource);
		if (!res.valid) {
			findings.push({
				ruleId: "invalid-diagram",
				where,
				message: `${where} invalid Mermaid syntax: ${res.error ?? "render failed"}`,
			});
		}
	}
}

export function validateMcqOptions(
	options: unknown,
	wherePrefix: string,
	ctx: ValidationContext,
	findings: ValidationFinding[],
): void {
	if (!Array.isArray(options) || options.length < 2) {
		findings.push({
			ruleId: "option-set",
			where: `${wherePrefix} options`,
			message: `${wherePrefix} requires at least 2 options`,
		});
		return;
	}

	const ids = options.map((o) =>
		o && typeof o === "object" ? (o as { id?: unknown }).id : undefined,
	);
	if (new Set(ids).size !== ids.length) {
		findings.push({
			ruleId: "option-set",
			where: `${wherePrefix} options`,
			message: `${wherePrefix} has duplicate option ids`,
		});
	}

	if (
		!options.some(
			(o) =>
				o &&
				typeof o === "object" &&
				(o as { isCorrect?: unknown }).isCorrect === true,
		)
	) {
		findings.push({
			ruleId: "option-set",
			where: `${wherePrefix} options`,
			message: `${wherePrefix} has NO correct option marked`,
		});
	}

	for (const opt of options) {
		if (!opt || typeof opt !== "object") {
			findings.push({
				ruleId: "missing-field",
				where: `${wherePrefix} options`,
				message: `${wherePrefix} contains invalid option`,
			});
			continue;
		}
		const option = opt as Record<string, unknown>;
		const optId = String(option.id ?? "unknown");
		const whereOption = `${wherePrefix} option ${optId}`;

		if (!option.rationale || typeof option.rationale !== "string") {
			findings.push({
				ruleId: "missing-rationale",
				where: `${whereOption} rationale`,
				message: `option ${optId} is missing rationale`,
			});
		}

		if (
			!option.isCorrect &&
			(!option.distractorAntipattern ||
				typeof option.distractorAntipattern !== "string")
		) {
			findings.push({
				ruleId: "missing-distractor-antipattern",
				where: `${whereOption} distractorAntipattern`,
				message: `incorrect option ${optId} is missing distractorAntipattern`,
			});
		}

		if (option.isCorrect) {
			if (!isCitationValid(option.citationUrl, ctx)) {
				findings.push({
					ruleId: "citation-manifest",
					where: `${whereOption} citationUrl`,
					message: `correct option ${optId} must cite an exact Citation Manifest URL (got ${option.citationUrl ?? "none"})`,
				});
			}
		}

		if (option.diagramUrl !== undefined) {
			validateDiagramUrl(
				option.diagramUrl,
				`${whereOption} diagramUrl`,
				ctx,
				findings,
			);
		}
	}
}

export interface ProbePoolRules {
	wherePrefix: string;
	minProbes: number;
	expectedPivotal?: { exact?: number; min?: number };
	requireTiers?: { useful?: boolean; distractor?: boolean };
}

export function validateProbePool(
	probes: unknown,
	probeBudget: unknown,
	rules: ProbePoolRules,
	findings: ValidationFinding[],
): void {
	const { wherePrefix, minProbes, expectedPivotal, requireTiers } = rules;
	const targetWhere = wherePrefix ? `${wherePrefix} probes` : "probes";

	if (!Array.isArray(probes) || probes.length < minProbes) {
		findings.push({
			ruleId: "probe-pool",
			where: targetWhere,
			message: `${wherePrefix ? `${wherePrefix} ` : ""}requires at least ${minProbes} probes`,
		});
		return;
	}

	const ids = probes.map((p) =>
		p && typeof p === "object" ? (p as { id?: unknown }).id : undefined,
	);
	if (new Set(ids).size !== ids.length) {
		findings.push({
			ruleId: "probe-pool",
			where: targetWhere,
			message: `${wherePrefix ? `${wherePrefix} ` : ""}has duplicate probe ids`,
		});
	}

	let pivotalCount = 0;
	let hasUseful = false;
	let hasDistractor = false;

	for (const p of probes) {
		if (!p || typeof p !== "object") {
			findings.push({
				ruleId: "missing-field",
				where: targetWhere,
				message: `${wherePrefix ? `${wherePrefix} ` : ""}contains invalid probe`,
			});
			continue;
		}
		const probe = p as Record<string, unknown>;
		const probeId = String(probe.id ?? "unknown");
		const whereProbe = wherePrefix
			? `${wherePrefix} probe ${probeId}`
			: `probe ${probeId}`;

		if (
			!probe.label ||
			!probe.answer ||
			typeof probe.label !== "string" ||
			typeof probe.answer !== "string"
		) {
			findings.push({
				ruleId: "missing-field",
				where: whereProbe,
				message: `${whereProbe} missing label or answer`,
			});
		}

		if (!PROBE_TIERS.includes(probe.tier as ProbeTier)) {
			findings.push({
				ruleId: "invalid-enum",
				where: `${whereProbe} tier`,
				message: `${whereProbe} invalid tier: ${probe.tier}`,
			});
		} else {
			if (probe.tier === "pivotal") pivotalCount++;
			if (probe.tier === "useful") hasUseful = true;
			if (probe.tier === "distractor") {
				hasDistractor = true;
				if (
					!probe.distractorAntipattern ||
					typeof probe.distractorAntipattern !== "string"
				) {
					findings.push({
						ruleId: "missing-distractor-antipattern",
						where: `${whereProbe} distractorAntipattern`,
						message: `${whereProbe} distractor probe missing distractorAntipattern`,
					});
				}
			}
		}
	}

	if (
		expectedPivotal?.exact !== undefined &&
		pivotalCount !== expectedPivotal.exact
	) {
		findings.push({
			ruleId: "probe-pool",
			where: targetWhere,
			message: `${wherePrefix ? `${wherePrefix} ` : ""}must have exactly ${expectedPivotal.exact} pivotal probes (got ${pivotalCount})`,
		});
	}

	if (
		expectedPivotal?.min !== undefined &&
		pivotalCount < expectedPivotal.min
	) {
		findings.push({
			ruleId: "probe-pool",
			where: targetWhere,
			message: `${wherePrefix ? `${wherePrefix} ` : ""}requires at least ${expectedPivotal.min} pivotal probes (got ${pivotalCount})`,
		});
	}

	if (requireTiers?.useful && !hasUseful) {
		findings.push({
			ruleId: "probe-pool",
			where: targetWhere,
			message: `${wherePrefix ? `${wherePrefix} ` : ""}requires at least one useful probe`,
		});
	}

	if (requireTiers?.distractor && !hasDistractor) {
		findings.push({
			ruleId: "probe-pool",
			where: targetWhere,
			message: `${wherePrefix ? `${wherePrefix} ` : ""}requires at least one distractor probe`,
		});
	}

	if (typeof probeBudget === "number" && probeBudget > probes.length) {
		findings.push({
			ruleId: "probe-pool",
			where: wherePrefix ? `${wherePrefix} probeBudget` : "probeBudget",
			message: `${wherePrefix ? `${wherePrefix} ` : ""}probeBudget exceeds probe pool size`,
		});
	}
}
