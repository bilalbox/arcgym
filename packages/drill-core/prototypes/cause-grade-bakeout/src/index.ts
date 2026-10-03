/**
 * PROTOTYPE ONLY — bakeout Worker for cause grading.
 * Compares BGE reranker, CLEF, and CLEF-flash on the same gold / distractors / other set.
 */

export interface Env {
  AI: Ai;
  ASSETS: Fetcher;
}

type BakeModel = 'bge' | 'clef' | 'clef-flash';

interface Passage {
  id: string;
  text: string;
}

interface BakeRequest {
  causeText: string;
  issue?: string;
  models?: BakeModel[];
  gold: Passage;
  distractors: Passage[];
  /** Catchall bucket for unmatched wrong answers. */
  other?: Passage;
}

const BGE_RERANK = '@cf/baai/bge-reranker-base';
const CLEF = '@cf/cloudflare/clef';
const CLEF_FLASH = '@cf/cloudflare/clef-flash';

const DEFAULT_OTHER: Passage = {
  id: 'other',
  text: 'Something else — a vague, mixed, or unrelated root cause that does not match any authored diagnosis.',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
    },
  });
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

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

function argmax(scores: Record<string, number>): { id: string; score: number } {
  let bestId = '';
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const [id, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return { id: bestId, score: bestScore };
}

/** Absolute thresholds + margin — production Troubleshoot policy (gold vs distractors; other = miss). */
function verdictFromBgePolicy(
  scores: Record<string, number>,
  distractorIds: string[],
): {
  verdict: string;
  matchedId: string | null;
  policy: 'bge-threshold-margin';
} {
  const correctThreshold = 0.62;
  const distractorThreshold = 0.55;
  const goldMargin = 0.08;
  const gold = scores.gold ?? 0;
  const other = scores.other ?? 0;
  let bestD = { id: '', score: Number.NEGATIVE_INFINITY };
  for (const id of distractorIds) {
    const s = scores[id] ?? 0;
    if (s > bestD.score) bestD = { id, score: s };
  }

  const beatsDistractor = gold >= bestD.score + goldMargin;
  const distractorBeatsGold = bestD.score >= gold + goldMargin;
  const beatsOther = gold >= other + goldMargin;

  if (gold >= correctThreshold && beatsDistractor && beatsOther) {
    return { verdict: 'gold', matchedId: 'gold', policy: 'bge-threshold-margin' };
  }
  if (bestD.score >= distractorThreshold && distractorBeatsGold && bestD.score >= other) {
    return { verdict: bestD.id, matchedId: bestD.id, policy: 'bge-threshold-margin' };
  }
  if (other >= Math.max(gold, bestD.score) && other >= distractorThreshold) {
    return { verdict: 'other', matchedId: 'other', policy: 'bge-threshold-margin' };
  }
  return { verdict: 'other', matchedId: 'other', policy: 'bge-threshold-margin' };
}

async function scoreBge(env: Env, query: string, passages: Passage[]) {
  const result = (await env.AI.run(BGE_RERANK, {
    query,
    contexts: passages.map((p) => ({ text: p.text })),
  })) as { response?: Array<{ id?: number; score?: number }> } | Array<{ id?: number; score?: number }>;

  const rows = Array.isArray(result) ? result : (result.response ?? []);
  const scores: Record<string, number> = {};
  for (const row of rows) {
    const idx = typeof row.id === 'number' ? row.id : -1;
    const passage = passages[idx];
    if (!passage) continue;
    const raw = typeof row.score === 'number' ? row.score : 0;
    const mapped = raw >= 0 && raw <= 1 ? raw : sigmoid(raw);
    scores[passage.id] = Number(mapped.toFixed(4));
  }
  for (const p of passages) {
    if (scores[p.id] == null) scores[p.id] = 0;
  }

  const distractorIds = passages.filter((p) => p.id !== 'gold' && p.id !== 'other').map((p) => p.id);
  const top = argmax(scores);
  const policy = verdictFromBgePolicy(scores, distractorIds);

  return {
    model: BGE_RERANK,
    mode: 'bge' as const,
    scores,
    /** Fair bakeout pick: highest relevance among gold / distractors / other. */
    argmaxId: top.id,
    argmaxScore: top.score,
    /** Production Troubleshoot policy for comparison. */
    policyVerdict: policy.verdict,
    policyMatchedId: policy.matchedId,
    latencyMs: 0,
  };
}

function normalizeClefChoice(raw: unknown): {
  value: string | null;
  probabilities: Record<string, number>;
} {
  if (!raw || typeof raw !== 'object') {
    return { value: null, probabilities: {} };
  }
  const obj = raw as Record<string, unknown>;

  // Workers AI CLEF shape: { type: 'choice', choice, probabilities, confidence }
  let value =
    typeof obj.choice === 'string'
      ? obj.choice
      : typeof obj.value === 'string'
        ? obj.value
        : typeof obj.answer === 'string'
          ? obj.answer
          : null;

  let probabilities: Record<string, number> = {};
  const probsRaw = obj.probabilities ?? obj.probs ?? obj.scores ?? obj.distribution;
  if (probsRaw && typeof probsRaw === 'object' && !Array.isArray(probsRaw)) {
    for (const [k, v] of Object.entries(probsRaw as Record<string, unknown>)) {
      if (typeof v === 'number') probabilities[k] = Number(v.toFixed(4));
    }
  }

  if (!value && Object.keys(probabilities).length > 0) {
    value = argmax(probabilities).id;
  }

  return { value, probabilities };
}

async function scoreClef(
  env: Env,
  model: 'clef' | 'clef-flash',
  causeText: string,
  issue: string,
  gold: Passage,
  distractors: Passage[],
  other: Passage,
) {
  const modelId = model === 'clef' ? CLEF : CLEF_FLASH;
  const criteria: Record<string, string> = {
    [gold.id]: gold.text,
  };
  for (const d of distractors) criteria[d.id] = d.text;
  criteria[other.id] = other.text;

  const state = {
    issue,
    learnerRootCause: causeText,
  };

  const result = (await env.AI.run(modelId, {
    model,
    state,
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
    model?: string;
    usage?: unknown;
  };

  const answers = result.answers ?? {};
  const matchRaw = answers.match ?? answers;
  const { value, probabilities } = normalizeClefChoice(matchRaw);

  // If the whole answers object is the choice payload
  const fallback =
    Object.keys(probabilities).length === 0 ? normalizeClefChoice(answers) : { value, probabilities };

  const scores =
    Object.keys(fallback.probabilities).length > 0
      ? fallback.probabilities
      : value
        ? { [value]: 1 }
        : {};

  const top = argmax(scores);
  const chosen = fallback.value || top.id || 'other';

  return {
    model: modelId,
    mode: model,
    scores,
    argmaxId: top.id || chosen,
    argmaxScore: top.score || scores[chosen] || 0,
    policyVerdict: chosen,
    policyMatchedId: chosen,
    rawAnswers: answers,
    latencyMs: 0,
  };
}

async function handleBake(request: Request, env: Env): Promise<Response> {
  let body: BakeRequest;
  try {
    body = (await request.json()) as BakeRequest;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const causeText = String(body.causeText ?? '').trim();
  if (!causeText) return json({ error: 'causeText is required' }, 400);
  if (!body.gold?.id || !body.gold?.text) return json({ error: 'gold is required' }, 400);
  if (!Array.isArray(body.distractors) || body.distractors.length === 0) {
    return json({ error: 'distractors are required' }, 400);
  }

  const other = body.other?.id && body.other?.text ? body.other : DEFAULT_OTHER;
  const issue = String(body.issue ?? '').trim() || 'Architecture incident under diagnosis.';
  const models: BakeModel[] =
    Array.isArray(body.models) && body.models.length > 0
      ? body.models
      : ['bge', 'clef', 'clef-flash'];

  const passages: Passage[] = [body.gold, ...body.distractors, other];
  const results: Record<string, unknown> = {};

  for (const mode of models) {
    const started = Date.now();
    try {
      const scored = await withRetry(() => {
        if (mode === 'bge') return scoreBge(env, causeText, passages);
        return scoreClef(env, mode, causeText, issue, body.gold, body.distractors, other);
      });
      scored.latencyMs = Date.now() - started;
      results[mode] = scored;
    } catch (err) {
      results[mode] = {
        mode,
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - started,
      };
    }
  }

  return json({
    causeText,
    issue,
    passages,
    results,
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname === '/api/bake') {
      return json({ ok: true });
    }

    if (url.pathname === '/api/bake' && request.method === 'POST') {
      return handleBake(request, env);
    }

    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        prototype: true,
        bakeout: true,
        models: {
          bge: BGE_RERANK,
          clef: CLEF,
          'clef-flash': CLEF_FLASH,
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
