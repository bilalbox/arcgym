import {
  ClefCauseGrader,
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
  requireSecret,
} from '../../_shared/env';
import {
  extractSessionCookie,
  type LearnerSessionPayload,
  verifySessionJwt,
} from '../../_shared/learnerAuth';

const MAX_BODY_BYTES = 16_384;
const MAX_CAUSE_CHARS = 4_000;
const RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 10;

async function authenticateLearner(
  request: Request,
  env: Env,
): Promise<{ ok: true; session: LearnerSessionPayload } | { ok: false; response: Response }> {
  const sessionCookie = extractSessionCookie(request);
  let session: LearnerSessionPayload | null = null;
  if (sessionCookie) {
    const secret = requireSecret(env, 'SESSION_SECRET');
    session = await verifySessionJwt(sessionCookie, secret);
  }
  if (!session?.learnerId) {
    return { ok: false, response: opaqueError(401, 'Authentication required') };
  }
  return { ok: true, session };
}

async function enforceRateLimit(
  kv: ReturnType<typeof requireKv>,
  learnerId: string,
): Promise<Response | null> {
  const windowKey = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000));
  const rateLimitKey = `rate:grade:${learnerId}:${windowKey}`;
  const countVal = await kv.get(rateLimitKey, 'text');
  const count = typeof countVal === 'string' ? Number.parseInt(countVal, 10) || 0 : 0;
  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    return opaqueError(
      429,
      'Rate limit exceeded. Please wait a few minutes before submitting another AI evaluation.',
    );
  }
  await kv.put(rateLimitKey, String(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS * 2,
  });
  return null;
}

async function loadDrill(
  kv: ReturnType<typeof requireKv>,
  drillId: string,
): Promise<TroubleshootingDrillDefinition | null> {
  try {
    const catalogEntry = await kv.get(`drill:id:${drillId}`, 'json');
    if (catalogEntry && isTroubleshootingDrill(catalogEntry as TroubleshootingDrillDefinition)) {
      return catalogEntry as TroubleshootingDrillDefinition;
    }
  } catch {
    // KV read failed — cannot load authored criteria server-side.
  }
  return null;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    if (!env.AI) {
      return opaqueError(503, 'AI grading unavailable');
    }

    const auth = await authenticateLearner(request, env);
    if (!auth.ok) return auth.response;

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

    const kv = requireKv(env);
    const drill = await loadDrill(kv, drillId);
    if (!drill) {
      return opaqueError(404, 'Unknown troubleshooting drill');
    }

    const rateLimitError = await enforceRateLimit(kv, auth.session.learnerId);
    if (rateLimitError) return rateLimitError;

    const grader = new ClefCauseGrader(env.AI);
    const result = await grader.grade({ drill, causeText });

    return jsonResponse(result);
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('troubleshoot grade failed', error);
    return opaqueError(502, 'Grading failed');
  }
}
