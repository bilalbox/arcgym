import React, { useState, useEffect } from 'react';
import {
  FeedbackRating,
  DrillLikedReason,
  DrillDislikedReason,
  DrillFeedbackTag,
  DRILL_LIKED_TAG_LABELS,
  DRILL_DISLIKED_TAG_LABELS,
  ALL_LIKED_TAGS,
  ALL_DISLIKED_TAGS,
  DrillRatingStats,
  calculateRatingStats,
} from '@arcgym/drill-core';
import { Check } from 'lucide-react';

interface LocalVoteRecord {
  rating: FeedbackRating;
  tags: DrillFeedbackTag[];
  timestamp: string;
}

const STORAGE_KEY = 'arcgym_drill_ratings';

function getLocalVote(drillId: string): LocalVoteRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[drillId] || null;
  } catch {
    return null;
  }
}

function saveLocalVote(drillId: string, vote: LocalVoteRecord) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[drillId] = vote;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Local storage unavailable
  }
}

function clearLocalVote(drillId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[drillId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Local storage unavailable
  }
}

export interface DrillFeedbackWidgetProps {
  drillId: string;
  className?: string;
  initialStats?: Partial<DrillRatingStats>;
}

export const DrillFeedbackWidget: React.FC<DrillFeedbackWidgetProps> = ({
  drillId,
  className = '',
  initialStats,
}) => {
  const [stats, setStats] = useState<DrillRatingStats>(() =>
    calculateRatingStats(
      drillId,
      initialStats?.upVotes || 0,
      initialStats?.downVotes || 0,
      initialStats?.tagCounts,
      initialStats?.lastUpdated
    )
  );

  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<DrillFeedbackTag>>(new Set());
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const local = getLocalVote(drillId);
    if (local) {
      setSelectedRating(local.rating);
      setSelectedTags(new Set(local.tags));
      setHasVoted(true);
    } else {
      setSelectedRating(null);
      setSelectedTags(new Set());
      setHasVoted(false);
    }
    setSubmitError(null);

    let isMounted = true;
    fetch(`/api/drills/${encodeURIComponent(drillId)}/rating`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DrillRatingStats | null) => {
        if (isMounted && data) {
          setStats(data);
        }
      })
      .catch(() => {
        // Retain fallback/initial stats if offline or unseeded
      });

    return () => {
      isMounted = false;
    };
  }, [drillId]);

  const toggleTag = (tag: DrillFeedbackTag) => {
    if (hasVoted) return;
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const handleRatingSelect = (rating: FeedbackRating) => {
    if (hasVoted) return;
    if (rating !== selectedRating) {
      setSelectedRating(rating);
      setSelectedTags(new Set());
      setSubmitError(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRating || hasVoted || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    const tagsArray = Array.from(selectedTags);
    const previousStats = stats;

    const nextUp = selectedRating === 'up' ? stats.upVotes + 1 : stats.upVotes;
    const nextDown = selectedRating === 'down' ? stats.downVotes + 1 : stats.downVotes;
    const updatedTagCounts = { ...(stats.tagCounts || {}) };
    for (const tag of tagsArray) {
      updatedTagCounts[tag] = (updatedTagCounts[tag] || 0) + 1;
    }

    // Optimistic preview commit
    setStats(calculateRatingStats(drillId, nextUp, nextDown, updatedTagCounts));

    try {
      const res = await fetch(`/api/drills/${encodeURIComponent(drillId)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selectedRating,
          tags: tagsArray,
        }),
      });

      if (!res.ok) {
        setStats(previousStats);
        if (res.status === 429) {
          setSubmitError('Feedback already submitted for this drill today.');
          setHasVoted(true);
          saveLocalVote(drillId, {
            rating: selectedRating,
            tags: tagsArray,
            timestamp: new Date().toISOString(),
          });
        } else {
          setSubmitError('Could not save feedback. Please try again.');
        }
        return;
      }

      const data = (await res.json()) as { stats?: DrillRatingStats };
      if (data.stats) {
        setStats(data.stats);
      }

      saveLocalVote(drillId, {
        rating: selectedRating,
        tags: tagsArray,
        timestamp: new Date().toISOString(),
      });
      setHasVoted(true);
    } catch {
      setStats(previousStats);
      clearLocalVote(drillId);
      setSubmitError('Could not save feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`text-left space-y-4 rounded-2xl border border-miro-hairlineSoft bg-miro-surface/40 p-4 sm:p-5 transition-all ${className}`}
    >
      {hasVoted ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-miro-card border border-miro-hairline">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-full bg-miro-successLight text-miro-successText flex items-center justify-center shrink-0">
              <Check className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs sm:text-sm text-miro-primary font-medium">
              Thank you for your feedback!{' '}
              <span className="text-miro-slate font-normal">
                ({selectedRating === 'up' ? '👍 Liked it' : '👎 Didn’t like it'})
              </span>
            </p>
          </div>
          {stats.likePercentage !== null && (
            <span className="text-xs font-mono text-miro-muted">
              {stats.likePercentage}% liked ({stats.totalVotes} review{stats.totalVotes === 1 ? '' : 's'})
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          <div>
            <h3 className="text-sm sm:text-base font-medium text-miro-primary">
              What&apos;d you think of today&apos;s drill?
            </h3>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => handleRatingSelect('up')}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
                selectedRating === 'up'
                  ? 'border-2 border-miro-blue bg-miro-lavenderLight/30 text-miro-primary font-semibold shadow-xs'
                  : 'bg-miro-card text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
              }`}
            >
              <span aria-hidden="true">👍</span>
              <span>Liked it</span>
            </button>

            <button
              type="button"
              onClick={() => handleRatingSelect('down')}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
                selectedRating === 'down'
                  ? 'border-2 border-miro-blue bg-miro-lavenderLight/30 text-miro-primary font-semibold shadow-xs'
                  : 'bg-miro-card text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
              }`}
            >
              <span aria-hidden="true">👎</span>
              <span>Didn&apos;t like it</span>
            </button>
          </div>

          {selectedRating === 'up' && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
              <span className="text-xs font-medium text-miro-slate">
                What worked?
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_LIKED_TAGS.map((tag) => {
                  const active = selectedTags.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-miro-lavenderLight text-miro-blue border-miro-lavenderBorder font-semibold'
                          : 'bg-miro-card text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
                      }`}
                    >
                      {DRILL_LIKED_TAG_LABELS[tag as DrillLikedReason]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedRating === 'down' && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
              <span className="text-xs font-medium text-miro-slate">
                What missed?
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DISLIKED_TAGS.map((tag) => {
                  const active = selectedTags.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-miro-dangerLight text-miro-dangerText border-miro-dangerBorder font-semibold'
                          : 'bg-miro-card text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
                      }`}
                    >
                      {DRILL_DISLIKED_TAG_LABELS[tag as DrillDislikedReason]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {submitError && (
            <p className="text-xs text-miro-dangerText" role="alert">
              {submitError}
            </p>
          )}

          {selectedRating && (
            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="rounded-xl bg-miro-primary hover:bg-miro-charcoal disabled:opacity-40 text-miro-onPrimary text-xs sm:text-sm font-medium px-5 py-2 cursor-pointer transition-colors shadow-xs"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
