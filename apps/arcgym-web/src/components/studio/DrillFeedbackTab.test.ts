import { describe, expect, it } from 'vitest';
import { formatTimeAgo } from './DrillFeedbackTab';

describe('DrillFeedbackTab helpers', () => {
  it('formats recent timestamps as relative time', () => {
    const now = new Date();
    expect(formatTimeAgo(now.toISOString())).toBe('just now');

    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
    expect(formatTimeAgo(tenMinsAgo.toISOString())).toBe('10m ago');

    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(formatTimeAgo(twoHoursAgo.toISOString())).toBe('2h ago');

    const yesterday = new Date(now.getTime() - 26 * 60 * 60 * 1000);
    expect(formatTimeAgo(yesterday.toISOString())).toBe('yesterday');

    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(fourDaysAgo.toISOString())).toBe('4d ago');
  });

  it('handles invalid timestamps gracefully', () => {
    expect(formatTimeAgo('invalid-date')).toBe('invalid-date');
  });
});
