/** Learner-facing drill IDs are always `AGD-` + 5 digits (e.g. AGD-00101). */
export const DRILL_ID_PATTERN = /^AGD-\d{5}$/;

export function isValidDrillId(id: unknown): id is string {
  return typeof id === 'string' && DRILL_ID_PATTERN.test(id);
}

/** Well-Architected Grounding hosts allowed in drill citation / source links (https only). */
export const ALLOWED_CITATION_HOSTS = [
  'architect.salesforce.com',
  'help.salesforce.com',
  'developer.salesforce.com',
] as const;

/**
 * Returns true only for https URLs on allowlisted Salesforce documentation hosts.
 * Rejects javascript:, data:, and non-allowlisted hosts.
 */
export function isAllowedCitationUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_CITATION_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

/**
 * Returns the URL if allowlisted, otherwise undefined (safe for `href`).
 */
export function safeCitationHref(url: unknown): string | undefined {
  return isAllowedCitationUrl(url) ? (url as string) : undefined;
}
