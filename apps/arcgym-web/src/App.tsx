import {
  ARCHITECTURAL_DOMAIN_LABELS,
  ARCHITECTURAL_DOMAINS,
  type ArchitecturalDomain,
  type DrillFormat,
  isDiagramDrill,
  isLessonDrill,
  isRapidFireDrill,
  type StepAttemptTelemetry,
} from '@arcgym/drill-core';
import { GraduationCap, Network, Zap } from 'lucide-react';
import type React from 'react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { RapidFireRunner } from '@/components/drill/RapidFireRunner';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ALL_DRILLS, useDrillRecommendation } from '@/hooks/useDrillRecommendation';
import { useRouter } from '@/hooks/useRouter';
import { useVisitorProgress } from '@/hooks/useVisitorProgress';

const DiagramRunner = lazy(() =>
  import('@/components/drill/DiagramRunner').then((m) => ({ default: m.DiagramRunner })),
);
const LessonStepper = lazy(() =>
  import('@/components/drill/LessonStepper').then((m) => ({ default: m.LessonStepper })),
);
const ProgressDialog = lazy(() =>
  import('@/components/progress/ProgressDialog').then((m) => ({ default: m.ProgressDialog })),
);
const PrivacyPage = lazy(() =>
  import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const SkillProfilePage = lazy(() =>
  import('@/pages/SkillProfilePage').then((m) => ({ default: m.SkillProfilePage })),
);

interface FormatConfig {
  id: DrillFormat;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const FORMATS: FormatConfig[] = [
  {
    id: 'Rapid_Fire',
    label: 'Rapid Fire',
    icon: <Zap className="h-4 w-4" />,
    description: 'High-velocity decision reps across Integration, Data, Security, and Agentic AI.',
  },
  {
    id: 'Diagram',
    label: 'Diagram',
    icon: <Network className="h-4 w-4" />,
    description:
      'Locate the missing or wrong element on a topology, then commit the Well-Architected repair.',
  },
  {
    id: 'Lesson',
    label: 'Lesson',
    icon: <GraduationCap className="h-4 w-4" />,
    description: 'Multi-stage coaching path from forensic diagnosis to operational observability.',
  },
];

const RouteFallback: React.FC = () => (
  <div className="min-h-screen bg-miro-surface flex items-center justify-center">
    <p className="text-sm text-miro-slate">Loading…</p>
  </div>
);

const PanelFallback: React.FC = () => (
  <div className="rounded-2xl border border-miro-hairline bg-miro-card p-8 text-center">
    <p className="text-sm text-miro-slate">Loading drill…</p>
  </div>
);

export const App: React.FC = () => {
  const { pathname, search, navigate } = useRouter();
  const [activeFormat, setActiveFormat] = useState<DrillFormat>('Rapid_Fire');
  const [activeDomain, setActiveDomain] = useState<ArchitecturalDomain | undefined>(undefined);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressDialogLoaded, setProgressDialogLoaded] = useState(false);

  const {
    streakDays,
    isStreakEarnedToday,
    totalPoints,
    completedDrills,
    totalCompleted,
    recordDrillCompletion,
    recordRapidFireSetCompletion,
    resetProgress,
  } = useVisitorProgress();

  // If URL has ?domain=Param, sync to activeDomain filter
  useEffect(() => {
    if (search) {
      const params = new URLSearchParams(search);
      const dom = params.get('domain');
      if (dom && (ARCHITECTURAL_DOMAINS as string[]).includes(dom)) {
        setActiveDomain(dom as ArchitecturalDomain);
      }
    }
  }, [search]);

  const domainsForFormat = useMemo(() => {
    const present = new Set(
      ALL_DRILLS.filter((d) => d.format === activeFormat).map((d) => d.domain),
    );
    return (Object.keys(ARCHITECTURAL_DOMAIN_LABELS) as ArchitecturalDomain[]).filter((d) =>
      present.has(d),
    );
  }, [activeFormat]);

  const {
    currentDrill,
    rapidFireDrills,
    isReviewMode,
    previousAttempt,
    advanceToNextDrill,
    resetSessionSkip,
  } = useDrillRecommendation(activeFormat, completedDrills, activeDomain);

  const handleFormatChange = (fmt: DrillFormat) => {
    setActiveFormat(fmt);
    // Drop domain if it would empty the Format ∩ Domain pool
    const stillValid = ALL_DRILLS.some(
      (d) => d.format === fmt && (!activeDomain || d.domain === activeDomain),
    );
    if (!stillValid) {
      setActiveDomain(undefined);
    }
    resetSessionSkip();
  };

  const handleDomainChange = (domain: ArchitecturalDomain | undefined) => {
    setActiveDomain(domain);
    resetSessionSkip();
  };

  const handleDrillComplete = (result: {
    drillId: string;
    format: DrillFormat;
    score: number;
    accuracy: number;
    streakDays: number;
    steps?: StepAttemptTelemetry[];
  }) => {
    recordDrillCompletion({
      drillId: result.drillId,
      format: result.format,
      score: result.score,
      accuracy: result.accuracy,
      steps: result.steps,
    });
  };

  const handleRapidFireComplete = (result: {
    attempts: Array<{
      drillId: string;
      format: DrillFormat;
      score: number;
      accuracy: number;
      steps?: StepAttemptTelemetry[];
    }>;
    totalScore: number;
    accuracy: number;
  }) => {
    recordRapidFireSetCompletion(result.attempts);
  };

  const openProgressModal = () => {
    setProgressDialogLoaded(true);
    setIsProgressModalOpen(true);
  };

  const progressDialog = progressDialogLoaded ? (
    <Suspense fallback={null}>
      <ProgressDialog
        open={isProgressModalOpen}
        onOpenChange={setIsProgressModalOpen}
        completedDrills={completedDrills}
        totalDrillsCount={ALL_DRILLS.length}
        totalPoints={totalPoints}
        streakDays={streakDays}
        allDrills={ALL_DRILLS}
        onResetProgress={resetProgress}
      />
    </Suspense>
  ) : null;

  // Route: Privacy policy
  if (pathname === '/privacy') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <PrivacyPage navigate={navigate} />
      </Suspense>
    );
  }

  // Route: Skill Profile
  if (pathname === '/skills') {
    return (
      <div className="min-h-screen bg-miro-surface text-miro-primary flex flex-col font-sans antialiased">
        <Header
          pathname={pathname}
          navigate={navigate}
          totalCompleted={totalCompleted}
          totalDrillsCount={ALL_DRILLS.length}
          streakDays={streakDays}
          isStreakEarnedToday={isStreakEarnedToday}
          totalPoints={totalPoints}
          onOpenProgressModal={openProgressModal}
        />
        <Suspense fallback={<RouteFallback />}>
          <SkillProfilePage
            completedDrills={completedDrills}
            totalPoints={totalPoints}
            allDrills={ALL_DRILLS}
            navigate={navigate}
            pathname={pathname}
          />
        </Suspense>
        {progressDialog}
      </div>
    );
  }

  // Route: Home / Practice
  return (
    <div className="min-h-screen bg-miro-surface text-miro-primary flex flex-col font-sans antialiased">
      <Header
        pathname={pathname}
        navigate={navigate}
        totalCompleted={totalCompleted}
        totalDrillsCount={ALL_DRILLS.length}
        streakDays={streakDays}
        isStreakEarnedToday={isStreakEarnedToday}
        totalPoints={totalPoints}
        onOpenProgressModal={openProgressModal}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="text-center sm:text-left space-y-2">
          <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
            Architectural judgment practice
          </h1>
          <p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
            Trade-off drills grounded in official Salesforce Well-Architected guidance.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {FORMATS.map((fmt) => {
            const isActive = activeFormat === fmt.id;
            return (
              <button
                type="button"
                key={fmt.id}
                onClick={() => handleFormatChange(fmt.id)}
                title={fmt.description}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'border-miro-primary bg-miro-card shadow-xs text-miro-primary'
                    : 'border-miro-hairline bg-miro-card/70 hover:bg-miro-card hover:border-miro-hairlineStrong text-miro-slate'
                }`}
              >
                <span
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isActive
                      ? 'bg-miro-surface text-miro-primary'
                      : 'bg-miro-surface text-miro-muted'
                  }`}
                >
                  {fmt.icon}
                </span>
                <span className="text-sm font-medium">{fmt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Architectural Domain filter — only domains with drills in the active Format */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-miro-muted font-medium mr-1">
            Domain
          </span>
          <button
            type="button"
            onClick={() => handleDomainChange(undefined)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              activeDomain === undefined
                ? 'bg-miro-primary text-miro-onPrimary border-miro-primary'
                : 'bg-miro-card text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
            }`}
          >
            All
          </button>
          {domainsForFormat.map((domain) => (
            <button
              type="button"
              key={domain}
              onClick={() => handleDomainChange(domain)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                activeDomain === domain
                  ? 'bg-miro-primary text-miro-onPrimary border-miro-primary'
                  : 'bg-miro-card text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
              }`}
            >
              {ARCHITECTURAL_DOMAIN_LABELS[domain]}
            </button>
          ))}
        </div>

        <div className="pt-2">
          {!currentDrill && (
            <div className="rounded-2xl border border-dashed border-miro-hairline bg-miro-card p-8 text-center space-y-2">
              <p className="text-sm font-medium text-miro-slate">No drills in this domain yet</p>
              <p className="text-xs text-miro-slate">
                Pick another Architectural Domain, or choose All, for the active Format.
              </p>
            </div>
          )}

          {currentDrill && isRapidFireDrill(currentDrill) && (
            <RapidFireRunner
              drill={currentDrill}
              drills={rapidFireDrills}
              isReviewMode={isReviewMode}
              previousAttempt={previousAttempt}
              onDrillComplete={handleDrillComplete}
              onRapidFireComplete={handleRapidFireComplete}
              onNextDrill={advanceToNextDrill}
            />
          )}
          <Suspense fallback={<PanelFallback />}>
            {currentDrill && isDiagramDrill(currentDrill) && (
              <DiagramRunner
                drill={currentDrill}
                isReviewMode={isReviewMode}
                previousAttempt={previousAttempt}
                onDrillComplete={handleDrillComplete}
                onNextDrill={advanceToNextDrill}
              />
            )}
            {currentDrill && isLessonDrill(currentDrill) && (
              <LessonStepper
                drill={currentDrill}
                isReviewMode={isReviewMode}
                onDrillComplete={handleDrillComplete}
                onNextDrill={advanceToNextDrill}
              />
            )}
          </Suspense>
        </div>

        <Footer navigate={navigate} currentPath={pathname} />
      </main>

      {progressDialog}
    </div>
  );
};

export default App;
