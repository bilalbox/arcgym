export type FeedbackRating = 'up' | 'down';

export type DrillLikedReason = 'realistic' | 'useful' | 'good_challenge';

export type DrillDislikedReason = 'unrealistic' | 'unclear' | 'too_easy' | 'too_hard';

export type DrillFeedbackTag = DrillLikedReason | DrillDislikedReason;

export const DRILL_LIKED_TAG_LABELS: Record<DrillLikedReason, string> = {
  realistic: 'Realistic',
  useful: 'Useful',
  good_challenge: 'Good challenge',
};

export const DRILL_DISLIKED_TAG_LABELS: Record<DrillDislikedReason, string> = {
  unrealistic: 'Unrealistic',
  unclear: 'Unclear',
  too_easy: 'Too easy',
  too_hard: 'Too hard',
};

export const ALL_LIKED_TAGS: DrillLikedReason[] = ['realistic', 'useful', 'good_challenge'];
export const ALL_DISLIKED_TAGS: DrillDislikedReason[] = [
  'unrealistic',
  'unclear',
  'too_easy',
  'too_hard',
];

export interface DrillFeedbackSubmission {
  drillId: string;
  rating: FeedbackRating;
  tags?: DrillFeedbackTag[];
}

export interface DrillFeedbackRecord {
  id: string;
  drillId: string;
  rating: FeedbackRating;
  tags: DrillFeedbackTag[];
  submittedAt: string;
}

export interface DrillRatingStats {
  drillId: string;
  upVotes: number;
  downVotes: number;
  totalVotes: number;
  likePercentage: number | null; // null if below MIN_RATING_THRESHOLD
  tagCounts: Partial<Record<DrillFeedbackTag, number>>;
  lastUpdated?: string;
}

export const MIN_RATING_THRESHOLD = 3;

/**
 * Calculates rating statistics and positive percentage.
 * When totalVotes is below MIN_RATING_THRESHOLD, likePercentage is null to avoid sample bias.
 */
export function calculateRatingStats(
  drillId: string,
  upVotes: number,
  downVotes: number,
  tagCounts?: Partial<Record<DrillFeedbackTag, number>>,
  lastUpdated?: string
): DrillRatingStats {
  const safeUp = Math.max(0, Math.floor(upVotes || 0));
  const safeDown = Math.max(0, Math.floor(downVotes || 0));
  const totalVotes = safeUp + safeDown;

  const likePercentage =
    totalVotes >= MIN_RATING_THRESHOLD
      ? Math.round((safeUp / totalVotes) * 100)
      : null;

  return {
    drillId,
    upVotes: safeUp,
    downVotes: safeDown,
    totalVotes,
    likePercentage,
    tagCounts: tagCounts || {},
    lastUpdated: lastUpdated || new Date().toISOString(),
  };
}
