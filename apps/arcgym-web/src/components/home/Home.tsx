import type {
	CaseFileDrillDefinition,
	ClientDrillDefinitionDTO,
	ClientTroubleshootingDrillDefinition,
	DailyWorkoutAssignment,
	DrillAttemptRecord,
	DrillFormat,
} from "@arcgym/drill-core";
import { ArrowRight, CheckCircle2, Flame } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";

interface HomeProps {
	caseFiles: CaseFileDrillDefinition[];
	incidents: ClientTroubleshootingDrillDefinition[];
	allDrills?: ClientDrillDefinitionDTO[];
	completedDrills?: Record<string, DrillAttemptRecord>;
	streakDays: number;
	isStreakEarnedToday: boolean;
	totalPoints?: number;
	dailyWorkout: DailyWorkoutAssignment | null;
	onLaunchDailyWorkout: () => void;
	navigate: (to: string) => void;
}

export const Home: React.FC<HomeProps> = ({
	caseFiles: _caseFiles,
	incidents: _incidents,
	allDrills: _allDrills,
	completedDrills: _completedDrills,
	streakDays,
	isStreakEarnedToday,
	totalPoints: _totalPoints = 0,
	dailyWorkout,
	onLaunchDailyWorkout,
	navigate,
}) => {
	return (
		<div className="space-y-8">
			{/* Title & Introduction */}
			<div className="text-center sm:text-left space-y-2">
				<h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
					Architectural judgment practice
				</h1>
				<p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
					High-stakes Salesforce Well-Architected decision workouts across two
					investigation tracks.
				</p>
			</div>

			{/* Hero: Today's Daily Drill */}
			<DailyWorkoutHero
				dailyWorkout={dailyWorkout}
				streakDays={streakDays}
				isStreakEarnedToday={isStreakEarnedToday}
				onLaunchDailyWorkout={onLaunchDailyWorkout}
			/>

			{/* Practice Tracks (2 Tracks) */}
			<PracticeTracksSection navigate={navigate} />
		</div>
	);
};

const WorkoutStreakBadge: React.FC<{
	streakDays: number;
	isStreakEarnedToday: boolean;
}> = ({ streakDays, isStreakEarnedToday }) => {
	if (isStreakEarnedToday) {
		return (
			<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-miro-successLight text-miro-successText font-medium">
				<CheckCircle2 className="h-3.5 w-3.5" />
				{streakDays}-day streak earned today
			</span>
		);
	}
	if (streakDays > 0) {
		return (
			<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-miro-surfaceSoft text-miro-primary font-medium border border-miro-hairline">
				<Flame className="h-3.5 w-3.5 text-amber-500" />
				{streakDays}-day streak · Complete to extend
			</span>
		);
	}
	return (
		<span className="text-miro-slate font-medium">
			Start your daily practice streak
		</span>
	);
};

const WorkoutTypeBadge: React.FC<{ format?: DrillFormat }> = ({ format }) => {
	if (format === "Troubleshooting") {
		return (
			<div className="flex items-center gap-2">
				<span className="text-xs text-miro-muted font-mono uppercase tracking-wider">
					Troubleshoot Incident
				</span>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-2">
			<span className="text-xs text-miro-muted font-mono uppercase tracking-wider">
				CTA Case File
			</span>
		</div>
	);
};

const WorkoutMetaTags: React.FC<{
	format?: DrillFormat;
	estimatedMinutes: number;
}> = ({ format, estimatedMinutes }) => {
	if (format === "Troubleshooting") {
		return (
			<div className="flex items-center gap-3 text-xs text-miro-muted">
				<span>System Topology</span>
				<span>•</span>
				<span>Scarce Probes</span>
				<span>•</span>
				<span>Cause & Fix</span>
				<span>•</span>
				<span>~{estimatedMinutes} min</span>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-3 text-xs text-miro-muted">
			<span>Enterprise Brief</span>
			<span>•</span>
			<span>3+ Stations</span>
			<span>•</span>
			<span>Probe Budget</span>
			<span>•</span>
			<span>~{estimatedMinutes} min</span>
		</div>
	);
};

function getWorkoutInfo(dailyWorkout: DailyWorkoutAssignment | null): {
	format: DrillFormat;
	title: string;
	description: string;
	estimatedMinutes: number;
} {
	if (dailyWorkout) {
		return {
			format: dailyWorkout.format,
			title: dailyWorkout.title,
			description: dailyWorkout.description,
			estimatedMinutes: dailyWorkout.estimatedMinutes,
		};
	}
	return {
		format: "Case_File",
		title: "Daily Architectural Judgment Drill",
		description:
			"Investigate platform trade-offs with scarce probes before committing decisions.",
		estimatedMinutes: 10,
	};
}

function getWorkoutButton(format: DrillFormat, isStreakEarnedToday: boolean) {
	if (isStreakEarnedToday) {
		if (format === "Troubleshooting") {
			return { text: "Review Daily Incident" };
		}
		return { text: "Review Daily Case File" };
	}
	if (format === "Troubleshooting") {
		return { text: "Launch Daily Incident" };
	}
	return { text: "Launch Daily Case File" };
}

interface DailyWorkoutHeroProps {
	dailyWorkout: DailyWorkoutAssignment | null;
	streakDays: number;
	isStreakEarnedToday: boolean;
	onLaunchDailyWorkout: () => void;
}

const DailyWorkoutHero: React.FC<DailyWorkoutHeroProps> = ({
	dailyWorkout,
	streakDays,
	isStreakEarnedToday,
	onLaunchDailyWorkout,
}) => {
	const { format, title, description, estimatedMinutes } =
		getWorkoutInfo(dailyWorkout);
	const button = getWorkoutButton(format, isStreakEarnedToday);

	return (
		<section className="bg-miro-card rounded-2xl border border-miro-hairline p-6 sm:p-8 shadow-xs relative overflow-hidden transition-all hover:border-miro-hairlineStrong">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-miro-hairlineSoft">
				<WorkoutTypeBadge format={format} />
				<WorkoutStreakBadge
					streakDays={streakDays}
					isStreakEarnedToday={isStreakEarnedToday}
				/>
			</div>

			<div className="py-6 space-y-4">
				<div className="space-y-1.5">
					<h2 className="text-xl sm:text-2xl font-medium text-miro-primary tracking-tight">
						{title}
					</h2>
					<p className="text-sm text-miro-slate max-w-xl leading-relaxed">
						{description}
					</p>
				</div>
			</div>

			<div className="pt-4 border-t border-miro-hairlineSoft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<WorkoutMetaTags format={format} estimatedMinutes={estimatedMinutes} />

				<Button
					size="lg"
					onClick={onLaunchDailyWorkout}
					className="rounded-full bg-miro-primary hover:bg-miro-primaryHover text-miro-onPrimary text-sm font-semibold px-6 py-2.5 shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
				>
					<span>{button.text}</span>
					<ArrowRight className="h-4 w-4 ml-0.5" />
				</Button>
			</div>
		</section>
	);
};

interface PracticeTracksProps {
	navigate: (to: string) => void;
}

const PracticeTracksSection: React.FC<PracticeTracksProps> = ({ navigate }) => (
	<section className="space-y-4">
		<h2 className="text-lg font-medium text-miro-primary tracking-tight">
			Practice Tracks
		</h2>

		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			{/* Case Files Track */}
			<div className="bg-miro-card rounded-2xl border border-miro-hairline p-5 flex flex-col justify-between hover:border-miro-hairlineStrong transition-colors shadow-xs group">
				<div className="space-y-3">
					<div className="space-y-1">
						<h3 className="text-base font-medium text-miro-primary">
							CTA Case Files
						</h3>
						<p className="text-xs text-miro-slate leading-relaxed">
							Evaluation-scale enterprise scenarios. Fictional Brief, scarce
							Probe Budget across 3+ Stations, and board recommendations.
						</p>
					</div>
				</div>

				<div className="pt-6">
					<Button
						variant="outline"
						onClick={() => navigate("/cases")}
						className="w-full rounded-full text-xs font-medium border-miro-hairline hover:border-miro-hairlineStrong hover:bg-miro-surface text-miro-primary justify-between"
					>
						<span>Browse Cases</span>
						<ArrowRight className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>

			{/* Troubleshooting Track */}
			<div className="bg-miro-card rounded-2xl border border-miro-hairline p-5 flex flex-col justify-between hover:border-miro-hairlineStrong transition-colors shadow-xs group">
				<div className="space-y-3">
					<div className="space-y-1">
						<h3 className="text-base font-medium text-miro-primary">
							Incident Triage
						</h3>
						<p className="text-xs text-miro-slate leading-relaxed">
							Real architectural failures. Inspect system topology diagrams,
							uncover pivotal facts with scarce probes, diagnose root causes,
							and commit remediations.
						</p>
					</div>
				</div>

				<div className="pt-6">
					<Button
						variant="outline"
						onClick={() => navigate("/troubleshoot")}
						className="w-full rounded-full text-xs font-medium border-miro-hairline hover:border-miro-hairlineStrong hover:bg-miro-surface text-miro-primary justify-between"
					>
						<span>Browse Incidents</span>
						<ArrowRight className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
		</div>
	</section>
);
