import {
	ALL_DISLIKED_TAGS,
	ALL_LIKED_TAGS,
	DRILL_DISLIKED_TAG_LABELS,
	DRILL_LIKED_TAG_LABELS,
	type DrillFeedbackRecord,
	type DrillFeedbackTag,
	type DrillRatingStats,
	MIN_RATING_THRESHOLD,
} from "@arcgym/drill-core";
import {
	AlertCircle,
	Calendar,
	MessageSquare,
	RefreshCw,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function formatTimeAgo(isoString: string): string {
	const d = new Date(isoString);
	const now = new Date();
	const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
	if (Number.isNaN(diffSec) || diffSec < 0) return isoString;
	if (diffSec < 60) return "just now";
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHour = Math.floor(diffMin / 60);
	if (diffHour < 24) return `${diffHour}h ago`;
	const diffDays = Math.floor(diffHour / 24);
	if (diffDays === 1) return "yesterday";
	if (diffDays < 30) return `${diffDays}d ago`;
	return d.toLocaleDateString();
}

function formatSubmissionDate(isoString: string): string {
	const d = new Date(isoString);
	if (Number.isNaN(d.getTime())) return isoString;
	return `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function getTagLabel(tag: DrillFeedbackTag): string {
	if (tag in DRILL_LIKED_TAG_LABELS) {
		return DRILL_LIKED_TAG_LABELS[tag as keyof typeof DRILL_LIKED_TAG_LABELS];
	}
	if (tag in DRILL_DISLIKED_TAG_LABELS) {
		return DRILL_DISLIKED_TAG_LABELS[
			tag as keyof typeof DRILL_DISLIKED_TAG_LABELS
		];
	}
	return tag;
}

const ScorecardsSection: React.FC<{ stats: DrillRatingStats }> = ({
	stats,
}) => {
	const upPct =
		stats.totalVotes > 0
			? Math.round((stats.upVotes / stats.totalVotes) * 100)
			: 0;
	const downPct =
		stats.totalVotes > 0
			? Math.round((stats.downVotes / stats.totalVotes) * 100)
			: 0;

	let approvalSubtext = `< ${MIN_RATING_THRESHOLD} votes (sample bias)`;
	if (stats.likePercentage !== null) {
		approvalSubtext =
			stats.likePercentage >= 80 ? "Healthy" : "Needs attention";
	}

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
			<Card className="border-miro-hairline bg-miro-card p-4 sm:p-5">
				<span className="text-[11px] uppercase tracking-wider text-miro-muted font-medium">
					Total Votes
				</span>
				<p className="text-2xl font-semibold text-miro-primary mt-1">
					{stats.totalVotes}
				</p>
				<p className="text-xs text-miro-slate mt-0.5">Learner submissions</p>
			</Card>

			<Card className="border-miro-hairline bg-miro-card p-4 sm:p-5">
				<span className="text-[11px] uppercase tracking-wider text-miro-muted font-medium flex items-center gap-1.5">
					<ThumbsUp className="h-3.5 w-3.5 text-miro-successText" />
					Up Votes
				</span>
				<p className="text-2xl font-semibold text-miro-successText mt-1">
					{stats.upVotes}
				</p>
				<p className="text-xs text-miro-slate mt-0.5">{upPct}% of total</p>
			</Card>

			<Card className="border-miro-hairline bg-miro-card p-4 sm:p-5">
				<span className="text-[11px] uppercase tracking-wider text-miro-muted font-medium flex items-center gap-1.5">
					<ThumbsDown className="h-3.5 w-3.5 text-miro-dangerText" />
					Down Votes
				</span>
				<p className="text-2xl font-semibold text-miro-dangerText mt-1">
					{stats.downVotes}
				</p>
				<p className="text-xs text-miro-slate mt-0.5">{downPct}% of total</p>
			</Card>

			<Card className="border-miro-hairline bg-miro-card p-4 sm:p-5">
				<span className="text-[11px] uppercase tracking-wider text-miro-muted font-medium">
					Approval Rate
				</span>
				<p className="text-2xl font-semibold text-miro-primary mt-1">
					{stats.likePercentage !== null ? `${stats.likePercentage}%` : "—"}
				</p>
				<p className="text-xs text-miro-slate mt-0.5">{approvalSubtext}</p>
			</Card>
		</div>
	);
};

interface TagFrequencyRowProps {
	label: string;
	count: number;
	totalVotes: number;
	barColorClass: string;
}

const TagFrequencyRow: React.FC<TagFrequencyRowProps> = ({
	label,
	count,
	totalVotes,
	barColorClass,
}) => {
	const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-xs">
				<span className="text-miro-primary font-medium">{label}</span>
				<span className="text-miro-slate font-mono">
					{count} {count === 1 ? "vote" : "votes"}
				</span>
			</div>
			<div className="h-2 rounded-full bg-miro-surfaceSoft overflow-hidden">
				<div
					className={cn("h-full rounded-full transition-all", barColorClass)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
};

const TagBreakdownSection: React.FC<{
	stats: DrillRatingStats;
	tagCounts: Partial<Record<DrillFeedbackTag, number>>;
}> = ({ stats, tagCounts }) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<Card className="border-miro-hairline bg-miro-card">
				<CardHeader className="p-4 sm:p-5 pb-2">
					<CardTitle className="text-sm font-medium flex items-center gap-2 text-miro-primary">
						<ThumbsUp className="h-4 w-4 text-miro-successText" />
						What Learners Liked
					</CardTitle>
				</CardHeader>
				<CardContent className="p-4 sm:p-5 pt-0 space-y-2.5">
					{ALL_LIKED_TAGS.map((tag) => (
						<TagFrequencyRow
							key={tag}
							label={DRILL_LIKED_TAG_LABELS[tag]}
							count={tagCounts[tag] ?? 0}
							totalVotes={stats.upVotes}
							barColorClass="bg-miro-successText"
						/>
					))}
				</CardContent>
			</Card>

			<Card className="border-miro-hairline bg-miro-card">
				<CardHeader className="p-4 sm:p-5 pb-2">
					<CardTitle className="text-sm font-medium flex items-center gap-2 text-miro-primary">
						<ThumbsDown className="h-4 w-4 text-miro-dangerText" />
						Friction & Confusion Points
					</CardTitle>
				</CardHeader>
				<CardContent className="p-4 sm:p-5 pt-0 space-y-2.5">
					{ALL_DISLIKED_TAGS.map((tag) => (
						<TagFrequencyRow
							key={tag}
							label={DRILL_DISLIKED_TAG_LABELS[tag]}
							count={tagCounts[tag] ?? 0}
							totalVotes={stats.downVotes}
							barColorClass="bg-miro-dangerText"
						/>
					))}
				</CardContent>
			</Card>
		</div>
	);
};

const RecentSubmissionsSection: React.FC<{
	records: DrillFeedbackRecord[];
}> = ({ records }) => {
	if (records.length === 0) {
		return (
			<section className="space-y-3">
				<h3 className="text-xs uppercase tracking-wider text-miro-muted font-medium">
					Recent Submissions (0)
				</h3>
				<p className="text-xs text-miro-slate italic">
					Aggregated ratings are available, but individual submission event
					records are not present in this snapshot.
				</p>
			</section>
		);
	}

	const sorted = [...records].sort(
		(a, b) =>
			new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
	);

	return (
		<section className="space-y-3">
			<h3 className="text-xs uppercase tracking-wider text-miro-muted font-medium">
				Recent Submissions ({sorted.length})
			</h3>
			<div className="space-y-2">
				{sorted.map((record) => (
					<div
						key={record.id}
						className="p-3.5 rounded-xl border border-miro-hairline bg-miro-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
					>
						<div className="flex items-center gap-2.5 min-w-0">
							<Badge
								variant={record.rating === "up" ? "success" : "destructive"}
								className="text-[11px] gap-1 shrink-0"
							>
								{record.rating === "up" ? (
									<>
										<ThumbsUp className="h-3 w-3" /> Up
									</>
								) : (
									<>
										<ThumbsDown className="h-3 w-3" /> Down
									</>
								)}
							</Badge>
							<div className="flex flex-wrap gap-1.5">
								{record.tags.length === 0 ? (
									<span className="text-xs text-miro-muted italic">
										No tags selected
									</span>
								) : (
									record.tags.map((tag) => (
										<Badge
											key={tag}
											variant="secondary"
											className="text-[11px] font-normal"
										>
											{getTagLabel(tag)}
										</Badge>
									))
								)}
							</div>
						</div>
						<div className="flex items-center gap-1.5 text-[11px] text-miro-slate shrink-0">
							<Calendar className="h-3 w-3" />
							<span>{formatSubmissionDate(record.submittedAt)}</span>
						</div>
					</div>
				))}
			</div>
		</section>
	);
};

interface DrillFeedbackTabProps {
	drillId: string;
	stats?: DrillRatingStats;
	records?: DrillFeedbackRecord[];
	lastSyncedAt: string | null;
	onSync: () => Promise<void>;
	syncing: boolean;
	error?: string | null;
}

export const DrillFeedbackTab: React.FC<DrillFeedbackTabProps> = ({
	drillId,
	stats,
	records = [],
	lastSyncedAt,
	onSync,
	syncing,
	error,
}) => {
	const hasFeedback = stats && stats.totalVotes > 0;

	return (
		<div className="space-y-6 pt-2">
			<div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-miro-hairline bg-miro-card">
				<div className="space-y-0.5">
					<h2 className="text-sm font-medium text-miro-primary">
						Learner Feedback & Sentiment
					</h2>
					<p className="text-xs text-miro-slate">
						{lastSyncedAt ? (
							<>
								Synced {formatTimeAgo(lastSyncedAt)} (
								{lastSyncedAt.slice(0, 10)})
							</>
						) : (
							"Not yet synced with remote D1"
						)}
					</p>
				</div>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					disabled={syncing}
					onClick={onSync}
					className="cursor-pointer"
				>
					<RefreshCw
						className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")}
					/>
					{syncing ? "Syncing D1…" : "Sync Feedback"}
				</Button>
			</div>

			{error && (
				<div className="p-3 text-sm rounded-lg border border-miro-dangerBorder bg-miro-dangerLight text-miro-dangerText flex items-center gap-2">
					<AlertCircle className="h-4 w-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{!hasFeedback ? (
				<div className="rounded-2xl border border-dashed border-miro-hairline bg-miro-card p-10 text-center space-y-3">
					<div className="w-10 h-10 rounded-full bg-miro-surfaceSoft flex items-center justify-center mx-auto text-miro-muted">
						<MessageSquare className="h-5 w-5" />
					</div>
					<div className="space-y-1">
						<h3 className="text-sm font-medium text-miro-primary">
							No feedback recorded yet
						</h3>
						<p className="text-xs text-miro-slate max-w-md mx-auto">
							Learners submit thumbs up/down ratings and select feedback pills
							upon completing drill <span className="font-mono">{drillId}</span>
							. Use the sync button above to pull recent submissions from
							Cloudflare D1.
						</p>
					</div>
				</div>
			) : (
				<>
					<ScorecardsSection stats={stats} />
					<TagBreakdownSection
						stats={stats}
						tagCounts={stats.tagCounts ?? {}}
					/>
					<RecentSubmissionsSection records={records} />
				</>
			)}
		</div>
	);
};
