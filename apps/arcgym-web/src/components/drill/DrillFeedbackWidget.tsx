import React, { useState, useEffect, useRef } from 'react';
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
import { ThumbsUp, ThumbsDown, Check, X } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);
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
  const [submittedMessage, setSubmittedMessage] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    setSubmittedMessage(false);
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

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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

    // Optimistic preview only — commit local vote after a successful edge response.
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
          setSubmitError('Already submitted for this drill today.');
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
      setSubmittedMessage(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmittedMessage(false);
      }, 1200);
    } catch {
      setStats(previousStats);
      clearLocalVote(drillId);
      setSubmitError('Could not save feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const percentageDisplay =
    stats.likePercentage !== null ? `${stats.likePercentage}%` : '—';
  const percentageTitle =
    stats.likePercentage !== null
      ? `Share of raters who liked this drill (${stats.totalVotes} reviews)`
      : 'Rating available after 3 reviews';

  return (
    <div className={`relative flex items-center gap-[7px] p-0.5 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center justify-center min-w-11 min-h-11 sm:min-w-0 sm:min-h-0 cursor-pointer transition-colors ${
          hasVoted && selectedRating === 'up'
            ? 'text-miro-blue hover:text-blue-700'
            : hasVoted && selectedRating === 'down'
            ? 'text-rose-600 hover:text-rose-700'
            : 'text-slate-400 hover:text-miro-primary'
        }`}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill={hasVoted && selectedRating === 'up' ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1z" />
        </svg>
        <span className="sr-only">Rate this drill</span>
      </button>

      <span
        className="font-data font-mono text-[12px] text-slate-500 select-none tracking-tight"
        title={percentageTitle}
      >
        {percentageDisplay}
      </span>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Rate this drill"
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-miro-hairline bg-white p-4 shadow-xl z-50 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-miro-hairlineSoft">
            <span className="text-xs font-semibold text-miro-primary tracking-tight">
              {hasVoted ? 'Your drill rating' : 'Rate this drill'}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 rounded-md p-1 transition-colors"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {submittedMessage ? (
            <div className="py-4 text-center space-y-1.5">
              <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <Check className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-slate-800">Feedback submitted</p>
              <p className="text-[11px] text-slate-500">
                Thank you for helping improve ArcGym drills.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={hasVoted}
                  onClick={() => handleRatingSelect('up')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-medium border transition-colors ${
                    hasVoted ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    selectedRating === 'up'
                      ? 'bg-miro-primary text-white border-miro-primary shadow-xs'
                      : 'bg-white text-slate-700 border-miro-hairline hover:border-slate-400'
                  } disabled:opacity-90`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Helpful
                </button>

                <button
                  type="button"
                  disabled={hasVoted}
                  onClick={() => handleRatingSelect('down')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-medium border transition-colors ${
                    hasVoted ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    selectedRating === 'down'
                      ? 'bg-miro-primary text-white border-miro-primary shadow-xs'
                      : 'bg-white text-slate-700 border-miro-hairline hover:border-slate-400'
                  } disabled:opacity-90`}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  Needs work
                </button>
              </div>

              {selectedRating === 'up' && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-slate-500">
                    What stood out? (Optional)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_LIKED_TAGS.map((tag) => {
                      const active = selectedTags.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          disabled={hasVoted}
                          onClick={() => toggleTag(tag)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                            hasVoted ? 'cursor-default' : 'cursor-pointer'
                          } ${
                            active
                              ? 'bg-blue-50 text-miro-blue border-blue-200'
                              : 'bg-white text-slate-600 border-miro-hairline hover:border-slate-300'
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
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-slate-500">
                    What could be better? (Optional)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DISLIKED_TAGS.map((tag) => {
                      const active = selectedTags.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          disabled={hasVoted}
                          onClick={() => toggleTag(tag)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                            hasVoted ? 'cursor-default' : 'cursor-pointer'
                          } ${
                            active
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-white text-slate-600 border-miro-hairline hover:border-slate-300'
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
                <p className="text-[11px] text-rose-600" role="alert">
                  {submitError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-miro-hairlineSoft">
                <span className="text-[10px] text-slate-400">
                  Anonymous enum pills • No free text
                </span>
                {hasVoted ? (
                  <span className="text-[11px] font-medium text-slate-500">
                    Submitted
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!selectedRating || isSubmitting}
                    onClick={handleSubmit}
                    className="rounded-full bg-miro-primary hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-medium px-4 py-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    {isSubmitting ? 'Saving...' : 'Submit'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
