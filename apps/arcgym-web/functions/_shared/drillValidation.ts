import {
  DRILL_STATUSES,
  type DrillFormat,
  isAllowedCitationUrl,
  isValidDrillId,
} from '@arcgym/drill-core';

const ALLOWED_FORMATS = new Set<DrillFormat>(['Rapid_Fire', 'Case_File', 'Troubleshooting']);

const MAX_STRING = 8_000;
const MAX_TITLE = 300;
const MAX_NESTING = 12;
const MAX_ARRAY = 64;

export type DrillValidationResult =
  | { ok: true; drill: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Validates a webhook drill payload before it is written to KV / featured as today.
 * Rejects drafts, unknown formats, invalid ids, and non-allowlisted citation URLs.
 */
export function validatePublishDrillPayload(raw: unknown): DrillValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Drill payload must be a JSON object' };
  }

  const drill = raw as Record<string, unknown>;

  if (!isValidDrillId(drill.id)) {
    return { ok: false, error: 'Invalid or missing drill id' };
  }

  if (
    typeof drill.title !== 'string' ||
    drill.title.length === 0 ||
    drill.title.length > MAX_TITLE
  ) {
    return { ok: false, error: 'Invalid or missing title' };
  }

  if (typeof drill.format !== 'string' || !ALLOWED_FORMATS.has(drill.format as DrillFormat)) {
    return { ok: false, error: 'Invalid or missing format' };
  }

  if (drill.status !== 'published') {
    return {
      ok: false,
      error: 'Refusing to feature a draft drill; set status to published first',
    };
  }

  if (drill.scheduledDate !== undefined) {
    if (
      typeof drill.scheduledDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(drill.scheduledDate)
    ) {
      return { ok: false, error: 'Invalid scheduledDate' };
    }
  }

  // status is validated above; keep DRILL_STATUSES referenced for drift detection
  if (!DRILL_STATUSES.includes(drill.status)) {
    return { ok: false, error: 'Invalid status' };
  }

  const urlError = findUnsafeCitationUrl(drill, 0);
  if (urlError) {
    return { ok: false, error: urlError };
  }

  return { ok: true, drill };
}

function findUnsafeCitationUrl(value: unknown, depth: number): string | null {
  if (depth > MAX_NESTING) {
    return 'Payload nesting too deep';
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY) {
      return 'Array too large';
    }
    for (const item of value) {
      const err = findUnsafeCitationUrl(item, depth + 1);
      if (err) return err;
    }
    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'citationUrl') {
      if (child === undefined || child === null || child === '') continue;
      if (!isAllowedCitationUrl(child)) {
        return 'citationUrl must be an https URL on an allowlisted Salesforce host';
      }
      continue;
    }

    if (typeof child === 'string') {
      if (child.length > MAX_STRING) {
        return 'String field too large';
      }
      continue;
    }

    const err = findUnsafeCitationUrl(child, depth + 1);
    if (err) return err;
  }

  return null;
}
