import {
  type CauseVerdict,
  ClefCauseGrader,
  type HiddenDistractorDTO,
  isTroubleshootingDrill,
  isValidDrillId,
  MAX_CAUSE_CHARS,
  type TroubleshootingDrillDefinition,
  validateDrill,
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
  const authoredKey = `drill:authored:${drillId}`;
  const rawAuthored = await kv.get(authoredKey);
  if (rawAuthored) {
    try {
      const parsed = JSON.parse(rawAuthored);
      const validated = validateDrill(parsed, {});
      if (validated.ok && validated.drill.format === 'Troubleshooting') {
        return validated.drill as TroubleshootingDrillDefinition;
      }
    } catch {
      // malformed JSON in KV
    }
  }

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

function parseGradeRequestBody(
  body: unknown,
):
  | { ok: true; drillId: string; causeText: string; firstCallText: string }
  | { ok: false; response: Response } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, response: opaqueError(400, 'Invalid JSON body') };
  }

  const drillId = (body as { drillId?: unknown }).drillId;
  const causeText = String((body as { causeText?: unknown }).causeText ?? '').trim();
  const firstCallText =
    typeof (body as { firstCallText?: unknown }).firstCallText === 'string'
      ? (body as { firstCallText: string }).firstCallText.trim()
      : '';

  if (!isValidDrillId(drillId)) {
    return { ok: false, response: opaqueError(400, 'Invalid drill ID') };
  }
  if (!causeText || causeText.length > MAX_CAUSE_CHARS) {
    return { ok: false, response: opaqueError(400, 'causeText is required') };
  }
  if (firstCallText.length > MAX_CAUSE_CHARS) {
    return { ok: false, response: opaqueError(400, 'firstCallText is too long') };
  }

  return { ok: true, drillId, causeText, firstCallText };
}

function hasValidFix(drill: TroubleshootingDrillDefinition): boolean {
  const options = drill.fix?.options;
  if (!Array.isArray(options) || options.length !== 3) return false;
  return options.filter((o) => o.isCorrect).length === 1;
}

async function gradeFirstCallSilently(
  grader: ClefCauseGrader,
  drill: TroubleshootingDrillDefinition,
  firstCallText: string,
): Promise<
  | {
      verdict: CauseVerdict;
      matchedDistractor: (HiddenDistractorDTO & { score: number }) | null;
      chosenId: string;
    }
  | undefined
> {
  if (!firstCallText) return undefined;
  try {
    const fcResult = await grader.grade({ drill, causeText: firstCallText });
    return {
      verdict: fcResult.verdict,
      matchedDistractor: fcResult.matchedDistractor,
      chosenId: fcResult.chosenId,
    };
  } catch (err) {
    console.warn('Silent firstCall grading failed', err);
    return undefined;
  }
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

    const bodyValidation = parseGradeRequestBody(parsed.json);
    if (!bodyValidation.ok) return bodyValidation.response;

    const { drillId, causeText, firstCallText } = bodyValidation;

    const kv = requireKv(env);
    const drill = await loadDrill(kv, drillId);
    if (!drill) {
      return opaqueError(404, 'Unknown troubleshooting drill');
    }
    if (!hasValidFix(drill)) {
      return opaqueError(422, 'Incident is missing a valid Fix definition');
    }

    const rateLimitError = await enforceRateLimit(kv, auth.session.learnerId);
    if (rateLimitError) return rateLimitError;

    const grader = new ClefCauseGrader(env.AI);
    const result = await grader.grade({ drill, causeText });
    const firstCallGrade = await gradeFirstCallSilently(grader, drill, firstCallText);

    return jsonResponse({
      ...result,
      fix: drill.fix,
      firstCallGrade,
    });
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('troubleshoot grade failed', error);
    return opaqueError(502, 'Grading failed');
  }
}
