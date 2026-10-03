import {
  CAUSE_GRADE_MODEL,
  CAUSE_OTHER_ID,
  causeGradeCriteria,
  isTroubleshootingDrill,
  isValidDrillId,
  type TroubleshootingDrillDefinition,
} from '@arcgym/drill-core';
import {
  configErrorResponse,
  type Env,
  jsonResponse,
  opaqueError,
  readJsonBody,
  requireKv,
} from '../../_shared/env';

const MAX_BODY_BYTES = 16_384;
const MAX_CAUSE_CHARS = 4_000;

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!/network connection lost|timed out|503|502/i.test(msg) || i === attempts - 1) {
        throw err;
      }
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

function normalizeClefChoice(raw: unknown): {
  choice: string | null;
  probabilities: Record<string, number>;
} {
  if (!raw || typeof raw !== 'object') {
    return { choice: null, probabilities: {} };
  }
  const obj = raw as Record<string, unknown>;
  const choice =
    typeof obj.choice === 'string'
      ? obj.choice
      : typeof obj.value === 'string'
        ? obj.value
        : typeof obj.answer === 'string'
          ? obj.answer
          : null;

  const probabilities: Record<string, number> = {};
  const probsRaw = obj.probabilities ?? obj.probs ?? obj.scores;
  if (probsRaw && typeof probsRaw === 'object' && !Array.isArray(probsRaw)) {
    for (const [k, v] of Object.entries(probsRaw as Record<string, unknown>)) {
      if (typeof v === 'number') probabilities[k] = Number(v.toFixed(4));
    }
  }
  return { choice, probabilities };
}

async function scoreClef(
  ai: NonNullable<Env['AI']>,
  causeText: string,
  issue: string,
  criteria: Record<string, string>,
): Promise<{ scores: Record<string, number>; choice: string | null; confidence?: number }> {
  const result = (await ai.run(CAUSE_GRADE_MODEL, {
    model: 'clef',
    state: {
      issue,
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
  })) as {
    answers?: Record<string, unknown>;
  };

  const matchRaw = result.answers?.match ?? result.answers;
  const { choice, probabilities } = normalizeClefChoice(matchRaw);

  const scores: Record<string, number> = { ...probabilities };
  for (const id of Object.keys(criteria)) {
    if (scores[id] == null) scores[id] = 0;
  }
  // Ensure catchall key exists even if CLEF omits it.
  if (scores[CAUSE_OTHER_ID] == null) scores[CAUSE_OTHER_ID] = 0;

  const confidence =
    matchRaw &&
    typeof matchRaw === 'object' &&
    typeof (matchRaw as { confidence?: unknown }).confidence === 'number'
      ? (matchRaw as { confidence: number }).confidence
      : undefined;

  return { scores, choice, confidence };
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    if (!env.AI) {
      return opaqueError(503, 'AI grading unavailable');
    }

    const parsed = await readJsonBody(request, MAX_BODY_BYTES);
    if (!parsed.ok) return parsed.response;

    const body = parsed.json;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return opaqueError(400, 'Invalid JSON body');
    }

    const drillId = (body as { drillId?: unknown }).drillId;
    const causeText = String((body as { causeText?: unknown }).causeText ?? '').trim();
    if (!isValidDrillId(drillId)) {
      return opaqueError(400, 'Invalid drill ID');
    }
    if (!causeText || causeText.length > MAX_CAUSE_CHARS) {
      return opaqueError(400, 'causeText is required');
    }

    let drill: TroubleshootingDrillDefinition | null = null;
    try {
      const kv = requireKv(env);
      const catalogEntry = await kv.get(`drill:id:${drillId}`, 'json');
      if (catalogEntry && isTroubleshootingDrill(catalogEntry as TroubleshootingDrillDefinition)) {
        drill = catalogEntry as TroubleshootingDrillDefinition;
      }
    } catch {
      // KV unbound — cannot load authored criteria server-side.
    }

    if (!drill) {
      return opaqueError(404, 'Unknown troubleshooting drill');
    }

    const ai = env.AI;
    if (!ai) {
      return opaqueError(503, 'AI grading unavailable');
    }
    const criteria = causeGradeCriteria(drill);
    const issue = drill.issue;
    const scored = await withRetry(() => scoreClef(ai, causeText, issue, criteria));

    return jsonResponse({
      scores: scored.scores,
      choice: scored.choice,
      confidence: scored.confidence,
      model: CAUSE_GRADE_MODEL,
      mode: 'clef',
      drillId,
    });
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('troubleshoot grade failed', error);
    return opaqueError(502, 'Grading failed');
  }
}
