// ../../packages/drill-core/dist/scoring/brier.js
var ArcGymScoringEngine = class {
  static OVERCONFIDENCE_MULTIPLIER = 2.5;
  /**
   * Calculates the Asymmetric Brier Loss and scaled points.
   * Loss = (1 - p)^2 if correct; Loss = alpha * p^2 if incorrect.
   * Points = Math.round(100 * (1 - Loss)).
   */
  static calculateDecisionScore(confidence, isCorrect) {
    const p = confidence;
    const y = isCorrect ? 1 : 0;
    let loss;
    let overconfidencePenaltyApplied = false;
    if (y === 1) {
      loss = Math.pow(1 - p, 2);
    } else {
      loss = this.OVERCONFIDENCE_MULTIPLIER * Math.pow(p, 2);
      if (p >= 0.85) {
        overconfidencePenaltyApplied = true;
      }
    }
    const pointsAwarded = Math.round(100 * (1 - loss));
    let quadrant;
    if (isCorrect) {
      quadrant = p >= 0.85 ? "Calibrated_Conviction" : "Hesitant_Mastery";
    } else {
      quadrant = p >= 0.85 ? "Hazardous_Assumption" : "Calibrated_Humility";
    }
    return {
      loss,
      pointsAwarded,
      quadrant,
      overconfidencePenaltyApplied
    };
  }
  /**
   * Calculates rolling Expected Calibration Error (ECE).
   */
  static calculateECE(predictions) {
    if (predictions.length === 0)
      return 0;
    const bins = /* @__PURE__ */ new Map();
    for (const pred of predictions) {
      const bin = bins.get(pred.confidence) || { count: 0, correctCount: 0 };
      bin.count++;
      if (pred.isCorrect)
        bin.correctCount++;
      bins.set(pred.confidence, bin);
    }
    let weightedError = 0;
    const N = predictions.length;
    for (const [conf, data] of bins.entries()) {
      if (data.count === 0)
        continue;
      const accuracy = data.correctCount / data.count;
      weightedError += data.count / N * Math.abs(accuracy - conf);
    }
    return weightedError;
  }
  /**
   * Calculates Judgment Calibration Index (JCI) from 0 to 1000.
   */
  static calculateJCI(ece) {
    return Math.max(0, Math.min(1e3, Math.round(1e3 * (1 - 2.5 * ece))));
  }
};
export {
  ArcGymScoringEngine
};
