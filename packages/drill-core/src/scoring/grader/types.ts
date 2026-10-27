import type {
	CauseVerdict,
	HiddenDistractorDTO,
	TroubleshootingDrillDefinition,
	TroubleshootingFixDefinition,
} from "../../types/drill.js";

export interface CauseGraderInput {
	drill: TroubleshootingDrillDefinition;
	causeText: string;
}

export interface GradedPassage {
	id: string;
	kind: "gold" | "distractor" | "other";
	text: string;
	rationale: string;
	antipattern?: string;
	score: number;
}

/** CLEF-only cause grade — no Fix payload or First Call envelope fields. */
export interface GradeCauseResult {
	verdict: CauseVerdict;
	isCorrect: boolean;
	/** CLEF choice id with the highest probability (`gold`, a distractor id, or `other`). */
	chosenId: string;
	scores: GradedPassage[];
	goldScore: number;
	bestDistractorScore: number;
	otherScore: number;
	matchedDistractor: (HiddenDistractorDTO & { score: number }) | null;
	goldText: string;
	goldRationale: string;
	goldCitationUrl?: string;
}

/** Silent First Call CLEF summary returned with the grade HTTP envelope. */
export interface FirstCallGradeSummary {
	verdict: CauseVerdict;
	matchedDistractor: (HiddenDistractorDTO & { score: number }) | null;
	chosenId: string;
}

/**
 * `/api/troubleshoot/grade` response: CLEF cause result plus Fix options and optional
 * First Call grade (ADR 0008). Owned by the API/client boundary, not the CLEF grader.
 */
export interface TroubleshootGradeResponse extends GradeCauseResult {
	fix: TroubleshootingFixDefinition;
	firstCallGrade?: FirstCallGradeSummary;
}

export interface CauseGrader {
	grade(input: CauseGraderInput): Promise<GradeCauseResult>;
}
