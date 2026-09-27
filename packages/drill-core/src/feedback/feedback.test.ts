import { describe, it, expect } from 'vitest';
import {
  calculateRatingStats,
  MIN_RATING_THRESHOLD,
  DRILL_LIKED_TAG_LABELS,
  DRILL_DISLIKED_TAG_LABELS,
  ALL_LIKED_TAGS,
  ALL_DISLIKED_TAGS,
} from '../index.js';

describe('Drill Feedback Domain Logic', () => {
  it('correctly maps 3 liked and 4 disliked tags to human labels', () => {
    expect(ALL_LIKED_TAGS).toEqual(['realistic', 'useful', 'good_challenge']);
    expect(ALL_DISLIKED_TAGS).toEqual(['unrealistic', 'unclear', 'too_easy', 'too_hard']);

    expect(DRILL_LIKED_TAG_LABELS.realistic).toBe('Realistic');
    expect(DRILL_LIKED_TAG_LABELS.useful).toBe('Useful');
    expect(DRILL_LIKED_TAG_LABELS.good_challenge).toBe('Good challenge');

    expect(DRILL_DISLIKED_TAG_LABELS.unrealistic).toBe('Unrealistic');
    expect(DRILL_DISLIKED_TAG_LABELS.unclear).toBe('Unclear');
    expect(DRILL_DISLIKED_TAG_LABELS.too_easy).toBe('Too easy');
    expect(DRILL_DISLIKED_TAG_LABELS.too_hard).toBe('Too hard');
  });

  it('returns null percentage when total votes are below minimum threshold', () => {
    const stats0 = calculateRatingStats('AGD-00101', 0, 0);
    expect(stats0.totalVotes).toBe(0);
    expect(stats0.likePercentage).toBeNull();

    const stats2 = calculateRatingStats('AGD-00101', 2, 0);
    expect(stats2.totalVotes).toBe(2);
    expect(stats2.likePercentage).toBeNull();
  });

  it('calculates likePercentage correctly when total votes meet or exceed threshold', () => {
    expect(MIN_RATING_THRESHOLD).toBe(3);

    const stats3 = calculateRatingStats('AGD-00101', 2, 1);
    expect(stats3.totalVotes).toBe(3);
    expect(stats3.likePercentage).toBe(67); // 2/3 = 66.67% rounded to 67

    const stats100 = calculateRatingStats('AGD-00101', 85, 15);
    expect(stats100.totalVotes).toBe(100);
    expect(stats100.likePercentage).toBe(85);
  });

  it('preserves tag counts and safely handles missing or negative values', () => {
    const tags = {
      realistic: 12,
      useful: 8,
      unclear: 3,
    };
    const stats = calculateRatingStats('AGD-00101', -5, 10, tags);
    expect(stats.upVotes).toBe(0);
    expect(stats.downVotes).toBe(10);
    expect(stats.totalVotes).toBe(10);
    expect(stats.likePercentage).toBe(0);
    expect(stats.tagCounts).toEqual(tags);
  });
});
