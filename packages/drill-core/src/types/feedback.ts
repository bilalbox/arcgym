export type FeedbackRating = 'up' | 'down';

export type DrillLikedReason =
  | 'hit_at_work'
  | 'clear_explanation'
  | 'good_challenge'
  | 'learned_something';

export type DrillDislikedReason =
  | 'disagree_with_answer'
  | 'ambiguous_question'
  | 'felt_like_trick'
  | 'doesnt_match_experience'
  | 'explanation_didnt_resonate';

export type DrillFeedbackTag = DrillLikedReason | DrillDislikedReason;

export const DRILL_LIKED_TAG_LABELS: Record<DrillLikedReason, string> = {
  hit_at_work: 'Hit this at work',
  clear_explanation: 'Clear explanation',
  good_challenge: 'Good challenge',
  learned_something: 'Learned something new',
};

export const DRILL_DISLIKED_TAG_LABELS: Record<DrillDislikedReason, string> = {
  disagree_with_answer: 'Disagree with answer',
  ambiguous_question: 'Question was ambiguous',
  felt_like_trick: 'Felt like a trick',
  doesnt_match_experience: "Doesn't match my experience",
  explanation_didnt_resonate: "Explanation didn't resonate",
};

export const ALL_LIKED_TAGS: DrillLikedReason[] = [
  'hit_at_work',
  'clear_explanation',
  'good_challenge',
  'learned_something',
];

export const ALL_DISLIKED_TAGS: DrillDislikedReason[] = [
  'disagree_with_answer',
  'ambiguous_question',
  'felt_like_trick',
  'doesnt_match_experience',
  'explanation_didnt_resonate',
];

export const LEGACY_TAG_ALIASES: Record<string, DrillFeedbackTag> = {
  realistic: 'hit_at_work',
  useful: 'clear_explanation',
  unrealistic: 'doesnt_match_experience',
  unclear: 'ambiguous_question',
};

const LIKED_TAG_SET = new Set<string>(ALL_LIKED_TAGS);
const DISLIKED_TAG_SET = new Set<string>(ALL_DISLIKED_TAGS);

/**
 * Filters arbitrary tag input to the allowlist for the given rating.
 * Normalizes legacy tag strings if present.
 * Unknown / wrong-polarity tags are dropped (never accepted).
 */
export function sanitizeFeedbackTags(
  rating: FeedbackRating,
  tags: unknown
): DrillFeedbackTag[] {
  if (!Array.isArray(tags)) return [];
  const allowed = rating === 'up' ? LIKED_TAG_SET : DISLIKED_TAG_SET;
  const out: DrillFeedbackTag[] = [];
  for (const rawTag of tags) {
    if (typeof rawTag !== 'string') continue;
    const normalized = (LEGACY_TAG_ALIASES[rawTag] || rawTag) as DrillFeedbackTag;
    if (allowed.has(normalized) && !out.includes(normalized)) {
      out.push(normalized);
    }
  }
  return out;
}

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
