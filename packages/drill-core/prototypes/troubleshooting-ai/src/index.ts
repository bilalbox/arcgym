/**
 * PROTOTYPE ONLY — Workers AI scoring shim for the troubleshooting grade demo.
 * Serves public/ and POST /api/score (BGE embeddings cosine, or BGE reranker).
 */

export interface Env {
  AI: Ai;
  ASSETS: Fetcher;
}

type ScoreMode = 'embed' | 'rerank';

interface Passage {
  id: string;
  text: string;
}

interface ScoreRequest {
  query: string;
  passages: Passage[];
  mode?: ScoreMode;
}

const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';
const RERANK_MODEL = '@cf/baai/bge-reranker-base';

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

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

async function scoreEmbed(env: Env, query: string, passages: Passage[]) {
  const texts = [query, ...passages.map((p) => p.text)];
  const result = (await env.AI.run(EMBED_MODEL, {
    text: texts,
    pooling: 'cls',
  })) as { data?: number[][]; shape?: number[] };

  const vectors = result.data;
  if (!vectors || vectors.length !== texts.length) {
    throw new Error('Unexpected embedding response shape');
  }

  const queryVec = vectors[0]!;
  const scores: Record<string, number> = {};
  for (let i = 0; i < passages.length; i++) {
    scores[passages[i]!.id] = Number(cosine(queryVec, vectors[i + 1]!).toFixed(4));
  }
  return { scores, model: EMBED_MODEL, mode: 'embed' as const };
}

async function scoreRerank(env: Env, query: string, passages: Passage[]) {
  const result = (await env.AI.run(RERANK_MODEL, {
    query,
    contexts: passages.map((p) => ({ text: p.text })),
  })) as
    | { response?: Array<{ id?: number; score?: number }> }
    | Array<{ id?: number; score?: number }>;

  const rows = Array.isArray(result) ? result : (result.response ?? []);
  const scores: Record<string, number> = {};
  for (const row of rows) {
    const idx = typeof row.id === 'number' ? row.id : -1;
    const passage = passages[idx];
    if (!passage) continue;
    const raw = typeof row.score === 'number' ? row.score : 0;
    // Docs: map reranker score to [0,1] via sigmoid when needed.
    const mapped = raw >= 0 && raw <= 1 ? raw : sigmoid(raw);
    scores[passage.id] = Number(mapped.toFixed(4));
  }
  // Fill any missing ids with 0 so the client always has a complete map.
  for (const p of passages) {
    if (scores[p.id] == null) scores[p.id] = 0;
  }
  return { scores, model: RERANK_MODEL, mode: 'rerank' as const };
}

async function handleScore(request: Request, env: Env): Promise<Response> {
  let body: ScoreRequest;
  try {
    body = (await request.json()) as ScoreRequest;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const query = String(body.query ?? '').trim();
  const passages = Array.isArray(body.passages) ? body.passages : [];
  const mode: ScoreMode = body.mode === 'embed' ? 'embed' : 'rerank';

  if (!query) return json({ error: 'query is required' }, 400);
  if (passages.length === 0) return json({ error: 'passages are required' }, 400);
  if (passages.some((p) => !p?.id || !p?.text)) {
    return json({ error: 'each passage needs id and text' }, 400);
  }

  try {
    const scored = await withRetry(() =>
      mode === 'rerank' ? scoreRerank(env, query, passages) : scoreEmbed(env, query, passages),
    );
    return json(scored);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 502);
  }
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

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname === '/api/score') {
      return json({ ok: true });
    }

    if (url.pathname === '/api/score' && request.method === 'POST') {
      return handleScore(request, env);
    }

    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        prototype: true,
        embedModel: EMBED_MODEL,
        rerankModel: RERANK_MODEL,
      });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
