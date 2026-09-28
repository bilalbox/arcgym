import { describe, expect, it } from 'vitest';
import {
  isAllowedCitationUrl,
  isValidDrillId,
  safeCitationHref,
  sanitizeFeedbackTags,
} from '../index.js';

describe('validation helpers', () => {
  it('accepts canonical AGD drill ids only', () => {
    expect(isValidDrillId('AGD-00101')).toBe(true);
    expect(isValidDrillId('AGD-00705')).toBe(true);
    expect(isValidDrillId('agd-00101')).toBe(false);
    expect(isValidDrillId('AGD-101')).toBe(false);
    expect(isValidDrillId('AGD-00101-extra')).toBe(false);
    expect(isValidDrillId('../etc/passwd')).toBe(false);
    expect(isValidDrillId(null)).toBe(false);
  });

  it('allows https citation urls on Salesforce doc hosts only', () => {
    expect(
      isAllowedCitationUrl('https://architect.salesforce.com/design/decision-guides/event-driven'),
    ).toBe(true);
    expect(isAllowedCitationUrl('https://help.salesforce.com/s/articleView?id=000')).toBe(true);
    expect(isAllowedCitationUrl('https://evil.example/phish')).toBe(false);
    expect(isAllowedCitationUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedCitationUrl('http://architect.salesforce.com/x')).toBe(false);
    expect(isAllowedCitationUrl('https://user:pass@architect.salesforce.com/x')).toBe(false);
    expect(safeCitationHref('javascript:alert(1)')).toBeUndefined();
    expect(safeCitationHref('https://architect.salesforce.com/docs')).toBe(
      'https://architect.salesforce.com/docs',
    );
  });

  it('sanitizes feedback tags by rating polarity', () => {
    expect(sanitizeFeedbackTags('up', ['hit_at_work', 'disagree_with_answer', 'nope'])).toEqual([
      'hit_at_work',
    ]);
    expect(
      sanitizeFeedbackTags('down', ['felt_like_trick', 'clear_explanation', 'felt_like_trick']),
    ).toEqual(['felt_like_trick']);
    expect(sanitizeFeedbackTags('up', 'hit_at_work')).toEqual([]);
  });
});
