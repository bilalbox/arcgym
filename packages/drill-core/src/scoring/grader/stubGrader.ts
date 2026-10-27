import { CAUSE_OTHER_ID, DEFAULT_OTHER_CRITERION } from "../gradeCause.js";
import { assembleGradeCauseResult } from "./assembleResult.js";
import type {
	CauseGrader,
	CauseGraderInput,
	GradeCauseResult,
} from "./types.js";

export function scoreJaccardTokenSimilarity(
	causeText: string,
	passage: string,
): number {
	const tok = (s: string) =>
		new Set(
			String(s)
				.toLowerCase()
				.replace(/[^a-z0-9\s]/g, " ")
				.split(/\s+/)
				.filter((w) => w.length > 2),
		);

	const a = tok(causeText);
	const b = tok(passage);
	if (a.size === 0 || b.size === 0) return 0;
	let inter = 0;
	for (const t of a) if (b.has(t)) inter += 1;
	const union = a.size + b.size - inter;
	const coverage = inter / a.size;
	return Number((0.65 * (inter / union) + 0.35 * coverage).toFixed(4));
}

export class StubCauseGrader implements CauseGrader {
	async grade(input: CauseGraderInput): Promise<GradeCauseResult> {
		const { drill, causeText } = input;
		const scoresMap: Record<string, number> = {
			gold: scoreJaccardTokenSimilarity(causeText, drill.goldCause.text),
		};
		for (const d of drill.hiddenDistractors) {
			scoresMap[d.id] = scoreJaccardTokenSimilarity(causeText, d.text);
		}
		// Mild prior so vague answers land on other instead of a weak distractor paraphrase.
		scoresMap[CAUSE_OTHER_ID] = Math.max(
			0.15,
			scoreJaccardTokenSimilarity(causeText, DEFAULT_OTHER_CRITERION),
		);

		return assembleGradeCauseResult(drill, scoresMap);
	}
}
