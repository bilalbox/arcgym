import {
  ARCHITECTURAL_DOMAIN_LABELS,
  DRILL_FORMAT_LABELS,
  type DrillRatingStats,
} from '@arcgym/drill-core';
import { RefreshCw } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatTimeAgo } from '@/components/studio/DrillFeedbackTab';
import { StudioBanner } from '@/components/studio/StudioBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getStudioFeedback,
  listStudioDrills,
  type StudioDrillListItem,
  type StudioFeedbackSnapshot,
  syncStudioFeedback,
} from '@/studio/api';

interface StudioDrillsPageProps {
  navigate: (to: string) => void;
}

type FeedbackSortOption = 'default' | 'needs_attention' | 'most_feedback' | 'most_downvotes';

export const DrillRatingBadge: React.FC<{ stats?: DrillRatingStats }> = ({ stats }) => {
  if (!stats || stats.totalVotes === 0) return null;

  const isLowApproval =
    stats.downVotes > 0 && (stats.likePercentage === null || stats.likePercentage < 70);
  const isHighApproval = stats.likePercentage !== null && stats.likePercentage >= 80;

  const variant = isLowApproval ? 'destructive' : isHighApproval ? 'success' : 'outline';

  return (
    <Badge variant={variant} className="text-[11px]">
      {stats.likePercentage !== null ? (
        <>
          👍 {stats.likePercentage}% ({stats.totalVotes})
        </>
      ) : (
        <>
          👍 {stats.upVotes} · 👎 {stats.downVotes}
        </>
      )}
    </Badge>
  );
};

interface StudioDrillCardProps {
  drill: StudioDrillListItem;
  stats?: DrillRatingStats;
  onClick: () => void;
}

const StudioDrillCard: React.FC<StudioDrillCardProps> = ({ drill, stats, onClick }) => {
  return (
    <Card
      className="border-miro-hairline bg-miro-card shadow-xs cursor-pointer hover:border-miro-hairlineStrong transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-mono">
            {drill.id}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {drill.status}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {DRILL_FORMAT_LABELS[drill.format]}
          </Badge>
          {drill.findingCount > 0 && (
            <Badge variant="destructive" className="text-[11px]">
              {drill.findingCount} finding{drill.findingCount === 1 ? '' : 's'}
            </Badge>
          )}
          <DrillRatingBadge stats={stats} />
        </div>
        <h2 className="text-base font-medium text-miro-primary tracking-tight">{drill.title}</h2>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-miro-slate flex flex-wrap gap-x-3 gap-y-1">
        <span>{ARCHITECTURAL_DOMAIN_LABELS[drill.domain]}</span>
        <span>{drill.difficulty.replaceAll('_', ' ')}</span>
        {drill.sourceCardIds && drill.sourceCardIds.length > 0 && (
          <span className="font-mono">{drill.sourceCardIds.join(', ')}</span>
        )}
      </CardContent>
    </Card>
  );
};

function getNeedsAttentionScore(stats?: DrillRatingStats): number {
  if (!stats) return 1000;
  return stats.downVotes * 1000 - (stats.likePercentage ?? (stats.upVotes ? 100 : 0));
}

function sortDrillsByFeedback(
  list: StudioDrillListItem[],
  ratings: Record<string, DrillRatingStats>,
  sort: FeedbackSortOption,
): StudioDrillListItem[] {
  if (sort === 'default') return list;

  return [...list].sort((a, b) => {
    const statsA = ratings[a.id];
    const statsB = ratings[b.id];

    switch (sort) {
      case 'needs_attention':
        return getNeedsAttentionScore(statsB) - getNeedsAttentionScore(statsA);
      case 'most_downvotes':
        return (statsB?.downVotes ?? 0) - (statsA?.downVotes ?? 0);
      case 'most_feedback':
        return (statsB?.totalVotes ?? 0) - (statsA?.totalVotes ?? 0);
      default:
        return 0;
    }
  });
}

export const StudioDrillsPage: React.FC<StudioDrillsPageProps> = ({ navigate }) => {
  const [includePublished, setIncludePublished] = useState(false);
  const [drills, setDrills] = useState<StudioDrillListItem[]>([]);
  const [feedbackSnapshot, setFeedbackSnapshot] = useState<StudioFeedbackSnapshot | null>(null);
  const [syncingFeedback, setSyncingFeedback] = useState(false);
  const [feedbackSort, setFeedbackSort] = useState<FeedbackSortOption>('default');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.allSettled([listStudioDrills(includePublished), getStudioFeedback()])
      .then(([drillRes, fbRes]) => {
        if (drillRes.status === 'fulfilled') {
          setDrills(drillRes.value.drills);
        } else {
          setError(
            drillRes.reason instanceof Error ? drillRes.reason.message : String(drillRes.reason),
          );
        }
        if (fbRes.status === 'fulfilled') {
          setFeedbackSnapshot(fbRes.value);
        }
      })
      .finally(() => setLoading(false));
  }, [includePublished]);

  const handleSyncFeedback = async () => {
    setSyncingFeedback(true);
    setError(null);
    try {
      const res = await syncStudioFeedback();
      setFeedbackSnapshot(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingFeedback(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? drills.filter(
          (d) =>
            d.id.toLowerCase().includes(q) ||
            d.title.toLowerCase().includes(q) ||
            d.domainLabel.toLowerCase().includes(q),
        )
      : drills;

    const ratings = feedbackSnapshot?.ratings ?? {};
    return sortDrillsByFeedback(list, ratings, feedbackSort);
  }, [drills, query, feedbackSnapshot, feedbackSort]);

  return (
    <>
      <StudioBanner />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-miro-primary tracking-tight">Drills</h1>
            <p className="text-sm text-miro-slate">
              {includePublished ? 'Drafts + published' : 'Drafts'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {feedbackSnapshot?.lastSyncedAt && (
              <span className="text-xs text-miro-slate hidden sm:inline">
                Feedback synced {formatTimeAgo(feedbackSnapshot.lastSyncedAt)}
              </span>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={syncingFeedback}
              onClick={handleSyncFeedback}
              className="cursor-pointer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', syncingFeedback && 'animate-spin')} />
              {syncingFeedback ? 'Syncing D1…' : 'Sync Feedback'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={load}
              className="cursor-pointer"
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search id or title…"
            className="flex-1 min-w-[12rem] rounded-md border border-miro-hairline bg-miro-card px-3 py-2 text-sm"
          />
          <select
            value={feedbackSort}
            onChange={(e) => setFeedbackSort(e.target.value as FeedbackSortOption)}
            className="rounded-md border border-miro-hairline bg-miro-card px-3 py-2 text-sm text-miro-primary cursor-pointer"
          >
            <option value="default">Sort: Default order</option>
            <option value="needs_attention">Sort: Needs attention (downvotes / low %)</option>
            <option value="most_feedback">Sort: Most feedback</option>
            <option value="most_downvotes">Sort: Most downvotes</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-miro-slate cursor-pointer">
            <input
              type="checkbox"
              checked={includePublished}
              onChange={(e) => setIncludePublished(e.target.checked)}
            />
            Include published
          </label>
        </div>

        {error && (
          <p className="text-sm text-miro-dangerText border border-miro-hairline rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-miro-slate">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-miro-hairline bg-miro-card p-8 text-center">
            <p className="text-sm text-miro-slate">No drills</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((drill) => (
              <StudioDrillCard
                key={drill.id}
                drill={drill}
                stats={feedbackSnapshot?.ratings[drill.id]}
                onClick={() => navigate(`/dev/drills/${drill.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
};

export default StudioDrillsPage;
