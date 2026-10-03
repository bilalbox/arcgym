import { type DrillDefinitionDTO, validateDrill } from '@arcgym/drill-core';

const MAX_STRING = 8_000;
const MAX_TITLE = 300;
const MAX_NESTING = 12;
const MAX_ARRAY = 64;

export type DrillValidationResult =
  | { ok: true; drill: DrillDefinitionDTO & { scheduledDate?: string } }
  | { ok: false; error: string };

function checkPayloadLimits(value: unknown, depth = 0): string | null {
  if (depth > MAX_NESTING) {
    return 'Payload nesting too deep';
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY) {
      return 'Array too large';
    }
    for (const item of value) {
      const err = checkPayloadLimits(item, depth + 1);
      if (err) return err;
    }
    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    if (typeof child === 'string') {
      if (child.length > MAX_STRING) {
        return 'String field too large';
      }
      continue;
    }
    const err = checkPayloadLimits(child, depth + 1);
    if (err) return err;
  }

  return null;
}

/**
 * Validates a webhook drill payload before it is written to KV / featured as today.
 * Uses the drill-core validator (with no manifest and no asset check), plus the webhook's
 * own checks: status must be published, scheduledDate shape, and payload size, nesting and string limits.
 */
export function validatePublishDrillPayload(raw: unknown): DrillValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Drill payload must be a JSON object' };
  }

  const limitError = checkPayloadLimits(raw);
  if (limitError) {
    return { ok: false, error: limitError };
  }

  const drill = raw as Record<string, unknown>;

  if (typeof drill.title === 'string' && drill.title.length > MAX_TITLE) {
    return { ok: false, error: 'Title exceeds maximum length' };
  }

  if (drill.scheduledDate !== undefined) {
    if (
      typeof drill.scheduledDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(drill.scheduledDate)
    ) {
      return { ok: false, error: 'Invalid scheduledDate' };
    }
  }

  // Validate format body and structure without manifest or asset checks
  const validationRes = validateDrill(raw, {});
  if (!validationRes.ok) {
    const errorMsg = validationRes.findings
      .map((f) => `${f.where ? `${f.where}: ` : ''}${f.message}`)
      .join('; ');
    return { ok: false, error: errorMsg };
  }

  if (validationRes.drill.status !== 'published') {
    return {
      ok: false,
      error: 'Refusing to feature a draft drill; set status to published first',
    };
  }

  return {
    ok: true,
    drill: {
      ...validationRes.drill,
      ...(drill.scheduledDate ? { scheduledDate: drill.scheduledDate as string } : {}),
    },
  };
}
