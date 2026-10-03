import {
  causeGradePassages,
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

const RERANK_MODEL = '@cf/baai/bge-reranker-base';
const MAX_BODY_BYTES = 16_384;
const MAX_CAUSE_CHARS = 4_000;

interface Passage {
  id: string;
  text: string;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

async function scoreRerank(
  ai: NonNullable<Env['AI']>,
  query: string,
  passages: Passage[],
): Promise<Record<string, number>> {
  const result = (await ai.run(RERANK_MODEL, {
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
    const mapped = raw >= 0 && raw <= 1 ? raw : sigmoid(raw);
    scores[passage.id] = Number(mapped.toFixed(4));
  }
  for (const p of passages) {
    if (scores[p.id] == null) scores[p.id] = 0;
  }
  return scores;
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

    let passages: Passage[] | null = null;
    try {
      const kv = requireKv(env);
      const catalogEntry = await kv.get(`drill:id:${drillId}`, 'json');
      if (catalogEntry && isTroubleshootingDrill(catalogEntry as TroubleshootingDrillDefinition)) {
        passages = causeGradePassages(catalogEntry as TroubleshootingDrillDefinition);
      }
    } catch {
      // KV unbound — cannot load authored passages server-side.
    }

    if (!passages || passages.length === 0) {
      return opaqueError(404, 'Unknown troubleshooting drill');
    }

    const ai = env.AI;
    if (!ai) {
      return opaqueError(503, 'AI grading unavailable');
    }
    const gradePassages = passages;
    const scores = await withRetry(() => scoreRerank(ai, causeText, gradePassages));
    return jsonResponse({
      scores,
      model: RERANK_MODEL,
      mode: 'rerank',
      drillId,
    });
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('troubleshoot grade failed', error);
    return opaqueError(502, 'Grading failed');
  }
}
