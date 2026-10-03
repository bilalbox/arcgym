import { CAUSE_GRADE_MODEL, CAUSE_OTHER_ID, causeGradeCriteria } from '../gradeCause.js';
import { assembleGradeCauseResult } from './assembleResult.js';
import type { CauseGrader, CauseGraderInput, GradeCauseResult } from './types.js';

export interface ClefAiClient {
  run(model: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface NormalizedClefChoice {
  choice: string | null;
  probabilities: Record<string, number>;
  confidence?: number;
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!/network connection lost|timed out|timeout|503|502/i.test(msg) || i === attempts - 1) {
        throw err;
      }
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export function normalizeClefChoice(raw: unknown): NormalizedClefChoice {
  if (!raw || typeof raw !== 'object') {
    return { choice: null, probabilities: {} };
  }

  let target = raw as Record<string, unknown>;
  if (target.result && typeof target.result === 'object' && !Array.isArray(target.result)) {
    target = target.result as Record<string, unknown>;
  }
  if (target.answers && typeof target.answers === 'object' && !Array.isArray(target.answers)) {
    const answers = target.answers as Record<string, unknown>;
    target = (
      answers.match && typeof answers.match === 'object' && !Array.isArray(answers.match)
        ? answers.match
        : answers
    ) as Record<string, unknown>;
  } else if (target.match && typeof target.match === 'object' && !Array.isArray(target.match)) {
    target = target.match as Record<string, unknown>;
  }

  const choice =
    typeof target.choice === 'string'
      ? target.choice
      : typeof target.value === 'string'
        ? target.value
        : typeof target.answer === 'string'
          ? target.answer
          : null;

  const probabilities: Record<string, number> = {};
  const probsRaw = target.probabilities ?? target.probs ?? target.scores;
  if (probsRaw && typeof probsRaw === 'object' && !Array.isArray(probsRaw)) {
    for (const [k, v] of Object.entries(probsRaw as Record<string, unknown>)) {
      if (typeof v === 'number') {
        probabilities[k] = Number(v.toFixed(4));
      }
    }
  }

  const confidence = typeof target.confidence === 'number' ? target.confidence : undefined;

  return { choice, probabilities, confidence };
}

export class ClefCauseGrader implements CauseGrader {
  constructor(private readonly ai: ClefAiClient) {}

  async grade(input: CauseGraderInput): Promise<GradeCauseResult> {
    const { drill, causeText } = input;
    const criteria = causeGradeCriteria(drill);

    const raw = await withRetry(() =>
      this.ai.run(CAUSE_GRADE_MODEL, {
        model: 'clef',
        state: {
          issue: drill.issue,
          learnerRootCause: causeText,
        },
        questions: {
          match: {
            type: 'choice',
            instructions:
              "Which authored diagnosis best matches the learner's root-cause statement? Choose 'other' if the statement is vague, mixed, or matches none of the authored diagnoses well.",
            criteria,
          },
        },
      }),
    );

    const normalized = normalizeClefChoice(raw);
    const scoresMap: Record<string, number> = { ...normalized.probabilities };

    for (const id of Object.keys(criteria)) {
      if (scoresMap[id] == null) scoresMap[id] = 0;
    }
    if (scoresMap[CAUSE_OTHER_ID] == null) scoresMap[CAUSE_OTHER_ID] = 0;

    if (normalized.choice && criteria[normalized.choice] !== undefined) {
      if (scoresMap[normalized.choice] === 0 && Object.values(scoresMap).every((v) => v === 0)) {
        scoresMap[normalized.choice] = 1.0;
      }
    }

    return assembleGradeCauseResult(drill, scoresMap, normalized.choice);
  }
}
