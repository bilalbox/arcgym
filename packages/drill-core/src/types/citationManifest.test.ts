import { describe, expect, it } from 'vitest';
import {
  citationManifestUrlsFromExports,
  isAllowedCitationUrl,
  isEligibleCorrectOptionCitation,
} from '../index.js';

const ARCHITECT_URL =
  'https://architect.salesforce.com/docs/architect/decision-guides/guide/async-processing.html';
const DEVELOPER_URL =
  'https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-get-started.html';
const HELP_URL = 'https://help.salesforce.com/s/articleView?id=sf.c360_a_data_cloud.htm';
const TRAILHEAD_URL = 'https://trailhead.salesforce.com/content/learn/modules/data-cloud';
const UNCRAWLED_DEV_URL =
  'https://developer.salesforce.com/docs/data/data-cloud-dev/guide/not-crawled.html';

describe('Citation Manifest eligibility', () => {
  it('rejects Trailhead and accepts architect, developer, and help hosts', () => {
    expect(isAllowedCitationUrl(TRAILHEAD_URL)).toBe(false);
    expect(isAllowedCitationUrl(ARCHITECT_URL)).toBe(true);
    expect(isAllowedCitationUrl(DEVELOPER_URL)).toBe(true);
    expect(isAllowedCitationUrl(HELP_URL)).toBe(true);
  });

  it('unions URLs from all grounding chunk exports into the Citation Manifest', () => {
    const manifest = citationManifestUrlsFromExports([
      [{ metadata: { url: ARCHITECT_URL } }],
      [{ metadata: { url: DEVELOPER_URL } }, { metadata: { url: DEVELOPER_URL } }],
    ]);
    expect(manifest.has(ARCHITECT_URL)).toBe(true);
    expect(manifest.has(DEVELOPER_URL)).toBe(true);
    expect(manifest.size).toBe(2);
  });

  it('allows a correct-option URL present only in developer fixture chunks', () => {
    const manifest = citationManifestUrlsFromExports([
      [{ metadata: { url: ARCHITECT_URL } }],
      [{ metadata: { url: DEVELOPER_URL } }],
    ]);
    expect(isEligibleCorrectOptionCitation(DEVELOPER_URL, manifest)).toBe(true);
  });

  it('allows a correct-option URL present only in help fixture chunks', () => {
    const manifest = citationManifestUrlsFromExports([[{ metadata: { url: HELP_URL } }]]);
    expect(isEligibleCorrectOptionCitation(HELP_URL, manifest)).toBe(true);
  });

  it('rejects an allowlisted but uncrawled help URL', () => {
    const uncrawledHelp =
      'https://help.salesforce.com/s/articleView?id=sf.c360_a_not_crawled.htm&type=5';
    const manifest = citationManifestUrlsFromExports([[{ metadata: { url: HELP_URL } }]]);
    expect(isAllowedCitationUrl(uncrawledHelp)).toBe(true);
    expect(isEligibleCorrectOptionCitation(uncrawledHelp, manifest)).toBe(false);
  });

  it('rejects an allowlisted but uncrawled URL', () => {
    const manifest = citationManifestUrlsFromExports([[{ metadata: { url: DEVELOPER_URL } }]]);
    expect(isAllowedCitationUrl(UNCRAWLED_DEV_URL)).toBe(true);
    expect(isEligibleCorrectOptionCitation(UNCRAWLED_DEV_URL, manifest)).toBe(false);
  });

  it('rejects Trailhead even if somehow present in a chunk export', () => {
    const manifest = citationManifestUrlsFromExports([[{ metadata: { url: TRAILHEAD_URL } }]]);
    expect(isEligibleCorrectOptionCitation(TRAILHEAD_URL, manifest)).toBe(false);
  });
});
