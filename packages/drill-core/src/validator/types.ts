export type ValidationRuleId =
	| "missing-field"
	| "invalid-enum"
	| "option-set"
	| "missing-rationale"
	| "missing-distractor-antipattern"
	| "probe-pool"
	| "station-set"
	| "hidden-distractors"
	| "citation-manifest"
	| "missing-asset"
	| "invalid-diagram"
	| "fix-options";

export interface ValidationFinding {
	ruleId: ValidationRuleId;
	where: string;
	message: string;
}

export interface ValidationContext {
	citationManifest?: ReadonlySet<string>;
	assetExists?: (url: string) => boolean;
	validateMermaid?: (source: string) => { valid: boolean; error?: string };
}
