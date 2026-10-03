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
} from '../../_shared/env';

const MAX_BODY_BYTES = 16_384;
const MAX_CAUSE_CHARS = 4_000;

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
