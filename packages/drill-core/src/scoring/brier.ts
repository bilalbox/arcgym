import type {
	ConfidenceAnchor,
	MetacognitiveQuadrant,
} from "../types/drill.js";

export interface BrierScoreResult {
	loss: number;
	pointsAwarded: number;
	quadrant: MetacognitiveQuadrant;
	overconfidencePenaltyApplied: boolean;
}

// biome-ignore lint/complexity/noStaticOnlyClass: Canonical scoring engine API namespace
export class ArcGymScoringEngine {
	public static readonly OVERCONFIDENCE_MULTIPLIER = 2.5;

	/**
	 * Calculates the Asymmetric Brier Loss and scaled points.
	 * Loss = (1 - p)^2 if correct; Loss = alpha * p^2 if incorrect.
	 * Points = Math.round(100 * (1 - Loss)).
	 */
	public static calculateDecisionScore(
		confidence: ConfidenceAnchor,
		isCorrect: boolean,
	): BrierScoreResult {
		const p = confidence;
		const y = isCorrect ? 1 : 0;
		let loss: number;
		let overconfidencePenaltyApplied = false;

		if (y === 1) {
			loss = (1 - p) ** 2;
		} else {
			loss = ArcGymScoringEngine.OVERCONFIDENCE_MULTIPLIER * p ** 2;
			if (p >= 0.85) {
				overconfidencePenaltyApplied = true;
			}
		}

		const pointsAwarded = Math.round(100 * (1 - loss));

		let quadrant: MetacognitiveQuadrant;
		if (isCorrect) {
			quadrant = p >= 0.85 ? "Calibrated_Conviction" : "Hesitant_Mastery";
		} else {
			quadrant = p >= 0.85 ? "Hazardous_Assumption" : "Calibrated_Humility";
		}

		return {
			loss,
			pointsAwarded,
			quadrant,
			overconfidencePenaltyApplied,
		};
	}

	/**
	 * Calculates rolling Expected Calibration Error (ECE).
	 */
	public static calculateECE(
		predictions: Array<{ confidence: number; isCorrect: boolean }>,
	): number {
		if (predictions.length === 0) return 0;

		// Group into 4 discrete bins: [0.50, 0.70, 0.85, 0.95]
		const bins = new Map<number, { count: number; correctCount: number }>();
		for (const pred of predictions) {
			const bin = bins.get(pred.confidence) || { count: 0, correctCount: 0 };
			bin.count++;
			if (pred.isCorrect) bin.correctCount++;
			bins.set(pred.confidence, bin);
		}

		let weightedError = 0;
		const N = predictions.length;

		for (const [conf, data] of bins.entries()) {
			if (data.count === 0) continue;
			const accuracy = data.correctCount / data.count;
			weightedError += (data.count / N) * Math.abs(accuracy - conf);
		}

		return weightedError;
	}

	/**
	 * Calculates Judgment Calibration Index (JCI) from 0 to 1000.
	 */
	public static calculateJCI(ece: number): number {
		return Math.max(0, Math.min(1000, Math.round(1000 * (1 - 2.5 * ece))));
	}
}
