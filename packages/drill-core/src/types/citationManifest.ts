import { isAllowedCitationUrl } from './validation.js';

/** Minimal chunk shape needed to derive Citation Manifest membership. */
export type GroundingChunkExport = {
  metadata?: {
    url?: unknown;
  };
};

/**
 * Builds the Citation Manifest URL set by unioning `metadata.url` from every
 * grounding chunk export (architect, developer, …).
 */
export function citationManifestUrlsFromExports(
  exports: ReadonlyArray<ReadonlyArray<GroundingChunkExport>>,
): Set<string> {
  const urls = new Set<string>();
  for (const chunks of exports) {
    for (const chunk of chunks) {
      const url = chunk.metadata?.url;
      if (typeof url === 'string' && url.length > 0) {
        urls.add(url);
      }
    }
  }
  return urls;
}

/**
 * Correct-option citations must be on a Well-Architected Grounding host and an
 * exact member of the Citation Manifest (crawled corpus).
 */
export function isEligibleCorrectOptionCitation(
  url: unknown,
  manifestUrls: ReadonlySet<string>,
): boolean {
  return typeof url === 'string' && isAllowedCitationUrl(url) && manifestUrls.has(url);
}
