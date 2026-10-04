import {
  ARCHITECTURAL_DOMAIN_LABELS,
  type ArchitecturalDomain,
  type CaseFileDrillDefinition,
  type ClientDrillDefinitionDTO,
  type ClientTroubleshootingDrillDefinition,
  calculateProficiencyReport,
  type DailyWorkoutAssignment,
  type DrillAttemptRecord,
  type DrillFormat,
  type RapidFireDrillDefinition,
} from '@arcgym/drill-core';
import { ArrowRight, BarChart2, CheckCircle2, FileText, Flame, Search, Zap } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface GymFloorProps {
  rapidFireCatalog: RapidFireDrillDefinition[];
  caseFiles: CaseFileDrillDefinition[];
  incidents: ClientTroubleshootingDrillDefinition[];
  allDrills: ClientDrillDefinitionDTO[];
  completedDrills: Record<string, DrillAttemptRecord>;
  streakDays: number;
  isStreakEarnedToday: boolean;
  totalPoints: number;
  activeDomain?: ArchitecturalDomain;
  dailyWorkout: DailyWorkoutAssignment | null;
  onDomainChange: (domain: ArchitecturalDomain | undefined) => void;
  onStartRapidFireWorkout: () => void;
  onLaunchDailyWorkout: () => void;
  navigate: (to: string) => void;
}

export const GymFloor: React.FC<GymFloorProps> = ({
  rapidFireCatalog,
  caseFiles,
  incidents,
  allDrills,
  completedDrills,
  streakDays,
  isStreakEarnedToday,
  totalPoints,
  activeDomain,
  dailyWorkout,
  onDomainChange,
  onStartRapidFireWorkout,
  onLaunchDailyWorkout,
  navigate,
}) => {
  const availableDomains = useMemo(() => {
    const present = new Set(rapidFireCatalog.map((d) => d.domain));
    return (Object.keys(ARCHITECTURAL_DOMAIN_LABELS) as ArchitecturalDomain[]).filter((d) =>
      present.has(d),
    );
  }, [rapidFireCatalog]);

  const completedRapidFireCount = useMemo(
    () => rapidFireCatalog.filter((d) => Boolean(completedDrills[d.id])).length,
    [rapidFireCatalog, completedDrills],
  );

  const completedCasesCount = useMemo(
    () => caseFiles.filter((d) => Boolean(completedDrills[d.id])).length,
    [caseFiles, completedDrills],
  );

  const completedIncidentsCount = useMemo(
    () => incidents.filter((d) => Boolean(completedDrills[d.id])).length,
    [incidents, completedDrills],
  );

  const proficiencyReport = useMemo(
    () => calculateProficiencyReport(completedDrills, allDrills, 4),
    [completedDrills, allDrills],
  );

  return (
    <div className="space-y-8">
      {/* Title & Introduction */}
      <div className="text-center sm:text-left space-y-2">
        <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
          Architectural judgment practice
        </h1>
        <p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
          High-stakes Salesforce Well-Architected decision workouts across three training tracks.
        </p>
      </div>

      {/* Hero: Today's Workout */}
      <DailyWorkoutHero
        dailyWorkout={dailyWorkout}
        activeDomain={activeDomain}
        availableDomains={availableDomains}
        streakDays={streakDays}
        isStreakEarnedToday={isStreakEarnedToday}
        onDomainChange={onDomainChange}
        onLaunchDailyWorkout={onLaunchDailyWorkout}
      />

      {/* Practice Tracks (3 Disciplines) */}
      <PracticeTracksSection
        rapidFireCount={completedRapidFireCount}
        rapidFireTotal={rapidFireCatalog.length}
        casesCount={completedCasesCount}
        casesTotal={caseFiles.length}
        incidentsCount={completedIncidentsCount}
        incidentsTotal={incidents.length}
        totalAllDrills={allDrills.length}
        onStartRapidFire={onStartRapidFireWorkout}
        navigate={navigate}
      />

      {/* Architectural Readiness & Skill Profile Snapshot */}
      <ReadinessSnapshotSection
        report={proficiencyReport}
        totalPoints={totalPoints}
        navigate={navigate}
      />
    </div>
  );
};

const WorkoutStreakBadge: React.FC<{ streakDays: number; isStreakEarnedToday: boolean }> = ({
  streakDays,
  isStreakEarnedToday,
}) => {
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
  return <span className="text-miro-slate font-medium">Start your daily practice streak</span>;
};

const WorkoutTypeBadge: React.FC<{ format?: DrillFormat }> = ({ format }) => {
  if (format === 'Case_File') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-miro-surfaceSoft border border-miro-hairline text-miro-primary">
          <FileText className="h-3.5 w-3.5 text-miro-blue" />
          Today's Workout
        </span>
        <span className="text-xs text-miro-muted font-mono uppercase tracking-wider">
          Case File
        </span>
      </div>
    );
  }
  if (format === 'Troubleshooting') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-miro-surfaceSoft border border-miro-hairline text-miro-primary">
          <Search className="h-3.5 w-3.5 text-purple-500" />
          Today's Workout
        </span>
        <span className="text-xs text-miro-muted font-mono uppercase tracking-wider">
          Troubleshoot
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-miro-surfaceSoft border border-miro-hairline text-miro-primary">
        <Zap className="h-3.5 w-3.5 text-amber-500" />
        Today's Workout
      </span>
      <span className="text-xs text-miro-muted font-mono uppercase tracking-wider">Rapid Fire</span>
    </div>
  );
};

const WorkoutMetaTags: React.FC<{ format?: DrillFormat; estimatedMinutes: number }> = ({
  format,
  estimatedMinutes,
}) => {
  if (format === 'Case_File') {
    return (
      <div className="flex items-center gap-3 text-xs text-miro-muted">
        <span>Enterprise Brief</span>
        <span>•</span>
        <span>3+ Stations</span>
        <span>•</span>
        <span>~{estimatedMinutes} min</span>
      </div>
    );
  }
  if (format === 'Troubleshooting') {
    return (
      <div className="flex items-center gap-3 text-xs text-miro-muted">
        <span>System Topology</span>
        <span>•</span>
        <span>Scarce Probes</span>
        <span>•</span>
        <span>~{estimatedMinutes} min</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 text-xs text-miro-muted">
      <span>5 reps / round</span>
      <span>•</span>
      <span>~{estimatedMinutes} min</span>
      <span>•</span>
      <span>Universal Pre-Submit Gate</span>
    </div>
  );
};

const RapidFireDomainFilter: React.FC<{
  activeDomain?: ArchitecturalDomain;
  availableDomains: ArchitecturalDomain[];
  onDomainChange: (domain: ArchitecturalDomain | undefined) => void;
}> = ({ activeDomain, availableDomains, onDomainChange }) => (
  <div className="space-y-2 pt-1">
    <span className="text-[11px] uppercase tracking-wider text-miro-muted font-medium block">
      Focus Domain
    </span>
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => onDomainChange(undefined)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
          activeDomain === undefined
            ? 'bg-miro-primary text-miro-onPrimary border-miro-primary'
            : 'bg-miro-surface text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
        }`}
      >
        All Domains
      </button>
      {availableDomains.map((dom) => (
        <button
          type="button"
          key={dom}
          onClick={() => onDomainChange(dom)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
            activeDomain === dom
              ? 'bg-miro-primary text-miro-onPrimary border-miro-primary'
              : 'bg-miro-surface text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
          }`}
        >
          {ARCHITECTURAL_DOMAIN_LABELS[dom]}
        </button>
      ))}
    </div>
  </div>
);

function getWorkoutInfo(
  dailyWorkout: DailyWorkoutAssignment | null,
  activeDomain?: ArchitecturalDomain,
): {
  format: DrillFormat;
  title: string;
  description: string;
  estimatedMinutes: number;
} {
  const format: DrillFormat = dailyWorkout?.format ?? 'Rapid_Fire';
  if (dailyWorkout && (format === 'Case_File' || format === 'Troubleshooting')) {
    return {
      format,
      title: dailyWorkout.title,
      description: dailyWorkout.description,
      estimatedMinutes: dailyWorkout.estimatedMinutes,
    };
  }
  return {
    format,
    title: activeDomain
      ? `${ARCHITECTURAL_DOMAIN_LABELS[activeDomain]} Workout`
      : '5-Rep Architectural Judgment Workout',
    description:
      '5 high-tempo decision reps. Calibrate your certainty across platform trade-offs before committing recommendations.',
    estimatedMinutes: 5,
  };
}

function getWorkoutButton(format: DrillFormat, isStreakEarnedToday: boolean) {
  if (isStreakEarnedToday) {
    if (format === 'Case_File') {
      return { text: 'Review Case File', icon: <FileText className="h-4 w-4" /> };
    }
    if (format === 'Troubleshooting') {
      return { text: 'Review Incident', icon: <Search className="h-4 w-4" /> };
    }
    return { text: 'Practice Another Set', icon: <Zap className="h-4 w-4" /> };
  }
  if (format === 'Case_File') {
    return { text: 'Launch Daily Case File', icon: <FileText className="h-4 w-4" /> };
  }
  if (format === 'Troubleshooting') {
    return { text: 'Launch Daily Incident', icon: <Search className="h-4 w-4" /> };
  }
  return { text: 'Start Daily Workout (5 Reps)', icon: <Zap className="h-4 w-4" /> };
}

interface DailyWorkoutHeroProps {
  dailyWorkout: DailyWorkoutAssignment | null;
  activeDomain?: ArchitecturalDomain;
  availableDomains: ArchitecturalDomain[];
  streakDays: number;
  isStreakEarnedToday: boolean;
  onDomainChange: (domain: ArchitecturalDomain | undefined) => void;
  onLaunchDailyWorkout: () => void;
}

const DailyWorkoutHero: React.FC<DailyWorkoutHeroProps> = ({
  dailyWorkout,
  activeDomain,
  availableDomains,
  streakDays,
  isStreakEarnedToday,
  onDomainChange,
  onLaunchDailyWorkout,
}) => {
  const { format, title, description, estimatedMinutes } = getWorkoutInfo(
    dailyWorkout,
    activeDomain,
  );
  const button = getWorkoutButton(format, isStreakEarnedToday);
  const isRapid = format !== 'Case_File' && format !== 'Troubleshooting';

  return (
    <section className="bg-miro-card rounded-2xl border border-miro-hairline p-6 sm:p-8 shadow-xs relative overflow-hidden transition-all hover:border-miro-hairlineStrong">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-miro-hairlineSoft">
        <WorkoutTypeBadge format={format} />
        <WorkoutStreakBadge streakDays={streakDays} isStreakEarnedToday={isStreakEarnedToday} />
      </div>

      <div className="py-6 space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-medium text-miro-primary tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-miro-slate max-w-xl leading-relaxed">{description}</p>
        </div>

        {isRapid && (
          <RapidFireDomainFilter
            activeDomain={activeDomain}
            availableDomains={availableDomains}
            onDomainChange={onDomainChange}
          />
        )}
      </div>

      <div className="pt-4 border-t border-miro-hairlineSoft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <WorkoutMetaTags format={format} estimatedMinutes={estimatedMinutes} />

        <Button
          size="lg"
          onClick={onLaunchDailyWorkout}
          className="rounded-full bg-miro-primary hover:bg-miro-primaryHover text-miro-onPrimary text-sm font-semibold px-6 py-2.5 shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
        >
          {button.icon}
          <span>{button.text}</span>
          <ArrowRight className="h-4 w-4 ml-0.5" />
        </Button>
      </div>
    </section>
  );
};

interface PracticeTracksProps {
  rapidFireCount: number;
  rapidFireTotal: number;
  casesCount: number;
  casesTotal: number;
  incidentsCount: number;
  incidentsTotal: number;
  totalAllDrills: number;
  onStartRapidFire: () => void;
  navigate: (to: string) => void;
}

const PracticeTracksSection: React.FC<PracticeTracksProps> = ({
  rapidFireCount,
  rapidFireTotal,
  casesCount,
  casesTotal,
  incidentsCount,
  incidentsTotal,
  totalAllDrills,
  onStartRapidFire,
  navigate,
}) => (
  <section className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-medium text-miro-primary tracking-tight">Practice Tracks</h2>
      <span className="text-xs text-miro-muted font-mono">
        {rapidFireCount + casesCount + incidentsCount} / {totalAllDrills} completed
      </span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Rapid Fire Track */}
      <div className="bg-miro-card rounded-2xl border border-miro-hairline p-5 flex flex-col justify-between hover:border-miro-hairlineStrong transition-colors shadow-xs group">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-miro-surfaceSoft text-miro-primary border border-miro-hairline">
              <Zap className="h-3 w-3 text-amber-500" />
              Rapid Fire
            </span>
            <span className="text-xs font-mono text-miro-muted tabular-nums">
              {rapidFireCount} / {rapidFireTotal}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium text-miro-primary">Fast-Twitch Reps</h3>
            <p className="text-xs text-miro-slate leading-relaxed">
              5 high-tempo architectural judgment reps with inline topology previews, antipattern
              distractors, and Brier calibration scoring.
            </p>
          </div>
        </div>

        <div className="pt-6">
          <Button
            variant="outline"
            onClick={onStartRapidFire}
            className="w-full rounded-full text-xs font-medium border-miro-hairline hover:border-miro-hairlineStrong hover:bg-miro-surface text-miro-primary justify-between"
          >
            <span>Launch 5-Rep Set</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Case Files Track */}
      <div className="bg-miro-card rounded-2xl border border-miro-hairline p-5 flex flex-col justify-between hover:border-miro-hairlineStrong transition-colors shadow-xs group">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-miro-surfaceSoft text-miro-primary border border-miro-hairline">
              <FileText className="h-3 w-3 text-miro-blue" />
              Cases
            </span>
            <span className="text-xs font-mono text-miro-muted tabular-nums">
              {casesCount} / {casesTotal}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium text-miro-primary">CTA Case Files</h3>
            <p className="text-xs text-miro-slate leading-relaxed">
              Evaluation-scale scenarios (~10 min). Fictional enterprise Brief, scarce Probe Budget
              across 3+ Stations, and board recommendations.
            </p>
          </div>
        </div>

        <div className="pt-6">
          <Button
            variant="outline"
            onClick={() => navigate('/cases')}
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
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-miro-surfaceSoft text-miro-primary border border-miro-hairline">
              <Search className="h-3 w-3 text-purple-500" />
              Troubleshoot
            </span>
            <span className="text-xs font-mono text-miro-muted tabular-nums">
              {incidentsCount} / {incidentsTotal}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium text-miro-primary">Incident Triage</h3>
            <p className="text-xs text-miro-slate leading-relaxed">
              Real architectural failures (~8 min). Inspect system topology diagrams, uncover
              pivotal facts with scarce probes, and commit root causes.
            </p>
          </div>
        </div>

        <div className="pt-6">
          <Button
            variant="outline"
            onClick={() => navigate('/troubleshoot')}
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

interface ReadinessSnapshotProps {
  report: ReturnType<typeof calculateProficiencyReport>;
  totalPoints: number;
  navigate: (to: string) => void;
}

const ReadinessSnapshotSection: React.FC<ReadinessSnapshotProps> = ({
  report,
  totalPoints,
  navigate,
}) => {
  const topStrength = report.strengths[0];
  const recommendedFocus = report.whereToStart[0];

  return (
    <section className="bg-miro-card rounded-2xl border border-miro-hairline p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-miro-hairlineSoft">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-miro-blue" />
            <h2 className="text-lg font-medium text-miro-primary tracking-tight">
              Architectural Readiness Snapshot
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-miro-slate">
            Proficiency and calibration calibrated against the 7 Architectural Domains.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/skills')}
          className="rounded-full border-miro-hairline hover:border-miro-hairlineStrong text-xs font-medium text-miro-primary inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span>View Radar & Analysis</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5">
        <div className="p-3.5 rounded-xl border border-miro-hairline bg-miro-surfaceSoft">
          <span className="text-xs text-miro-muted font-medium block mb-1">Question Reps</span>
          <p className="text-base sm:text-lg font-semibold text-miro-primary font-mono tabular-nums">
            {report.totalQuestionsAnswered}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-miro-hairline bg-miro-surfaceSoft">
          <span className="text-xs text-miro-muted font-medium block mb-1">Lifetime Points</span>
          <p className="text-base sm:text-lg font-semibold text-miro-primary font-mono tabular-nums">
            {totalPoints.toLocaleString()}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-miro-hairline bg-miro-surfaceSoft">
          <span className="text-xs text-miro-muted font-medium block mb-1">Calibrated Domains</span>
          <p className="text-base sm:text-lg font-semibold text-miro-primary font-mono tabular-nums">
            {report.measuredCount}
            <span className="text-xs font-normal text-miro-muted"> of {report.totalCount}</span>
          </p>
        </div>
      </div>

      {(topStrength || recommendedFocus) && (
        <div className="mt-4 pt-4 border-t border-miro-hairlineSoft flex flex-wrap items-center gap-4 text-xs">
          {topStrength && (
            <div className="flex items-center gap-2">
              <span className="text-miro-muted">Top Strength:</span>
              <Badge variant="domain" className="text-[11px] py-0 px-2">
                {topStrength.label}
              </Badge>
              <span className="font-mono text-miro-successText font-medium">
                {Math.round(topStrength.accuracy)}%
              </span>
            </div>
          )}
          {recommendedFocus && (
            <div className="flex items-center gap-2">
              <span className="text-miro-muted">Recommended Focus:</span>
              <Badge variant="outline" className="text-[11px] py-0 px-2 font-normal">
                {recommendedFocus.label}
              </Badge>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
