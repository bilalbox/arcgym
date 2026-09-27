import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { RapidFireRunner } from '@/components/drill/RapidFireRunner';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useVisitorProgress } from '@/hooks/useVisitorProgress';
import { useRouter } from '@/hooks/useRouter';
import { ALL_DRILLS, useDrillRecommendation } from '@/hooks/useDrillRecommendation';
import {
  ArchitecturalDomain,
  ARCHITECTURAL_DOMAINS,
  ARCHITECTURAL_DOMAIN_LABELS,
  DrillFormat,
  isCurrencyDrill,
  isLessonDrill,
  isRapidFireDrill,
  isScenarioDrill,
  StepAttemptTelemetry,
} from '@arcgym/drill-core';
import { Zap, Coins, Users2, GraduationCap, CheckCircle } from 'lucide-react';

const CurrencyRunner = lazy(() =>
  import('@/components/drill/CurrencyRunner').then((m) => ({ default: m.CurrencyRunner }))
);
const DualMeterScenario = lazy(() =>
  import('@/components/drill/DualMeterScenario').then((m) => ({ default: m.DualMeterScenario }))
);
const LessonStepper = lazy(() =>
  import('@/components/drill/LessonStepper').then((m) => ({ default: m.LessonStepper }))
);
const ProgressDialog = lazy(() =>
  import('@/components/progress/ProgressDialog').then((m) => ({ default: m.ProgressDialog }))
);
const PrivacyPage = lazy(() =>
  import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const SkillProfilePage = lazy(() =>
  import('@/pages/SkillProfilePage').then((m) => ({ default: m.SkillProfilePage }))
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
    id: 'Currency',
    label: 'Currency',
    icon: <Coins className="h-4 w-4" />,
    description: 'Architect Budget discipline: allocate constrained capacity under concurrency pressure.',
  },
  {
    id: 'Scenario',
    label: 'Scenario',
    icon: <Users2 className="h-4 w-4" />,
    description: 'Balance Stakeholder Standing against Well-Architected integrity under C-suite pressure.',
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
    <p className="text-sm text-slate-600">Loading…</p>
  </div>
);

const PanelFallback: React.FC = () => (
  <div className="rounded-2xl border border-miro-hairline bg-white p-8 text-center">
    <p className="text-sm text-slate-600">Loading drill…</p>
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
    completedDrills,
    totalCompleted,
    recordDrillCompletion,
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
      ALL_DRILLS.filter((d) => d.format === activeFormat).map((d) => d.domain)
    );
    return (Object.keys(ARCHITECTURAL_DOMAIN_LABELS) as ArchitecturalDomain[]).filter((d) =>
      present.has(d)
    );
  }, [activeFormat]);

  const {
    currentDrill,
    reason,
    isReviewMode,
    previousAttempt,
    uncompletedCount,
    advanceToNextDrill,
    resetSessionSkip,
  } = useDrillRecommendation(activeFormat, completedDrills, activeDomain);

  const handleFormatChange = (fmt: DrillFormat) => {
    setActiveFormat(fmt);
    // Drop domain if it would empty the Format ∩ Domain pool
    const stillValid = ALL_DRILLS.some(
      (d) => d.format === fmt && (!activeDomain || d.domain === activeDomain)
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
          onOpenProgressModal={openProgressModal}
        />
        <Suspense fallback={<RouteFallback />}>
          <SkillProfilePage
            completedDrills={completedDrills}
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
        onOpenProgressModal={openProgressModal}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="text-center sm:text-left space-y-2">
          {reason === 'daily' && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-200/60 text-miro-blue text-xs font-medium mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-miro-blue" />
              Today's architectural practice
            </div>
          )}
          {reason === 'next_uncompleted' && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium mb-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              Daily drill completed • Next uncompleted practice ({uncompletedCount} remaining)
            </div>
          )}
          {reason === 'review' && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-medium mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Mastery Review Mode • Spaced repetition practice
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
            Architectural judgment practice
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Trade-off drills strictly grounded in official Salesforce Well-Architected guidance.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {FORMATS.map((fmt) => {
            const isActive = activeFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => handleFormatChange(fmt.id)}
                title={fmt.description}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'border-miro-primary bg-white shadow-xs text-miro-primary'
                    : 'border-miro-hairline bg-white/70 hover:bg-white hover:border-slate-400 text-slate-600'
                }`}
              >
                <span
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isActive ? 'bg-miro-surface text-miro-primary' : 'bg-miro-surface text-slate-500'
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
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mr-1">
            Domain
          </span>
          <button
            onClick={() => handleDomainChange(undefined)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              activeDomain === undefined
                ? 'bg-miro-primary text-white border-miro-primary'
                : 'bg-white text-slate-600 border-miro-hairline hover:border-slate-400'
            }`}
          >
            All
          </button>
          {domainsForFormat.map((domain) => (
            <button
              key={domain}
              onClick={() => handleDomainChange(domain)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                activeDomain === domain
                  ? 'bg-miro-primary text-white border-miro-primary'
                  : 'bg-white text-slate-600 border-miro-hairline hover:border-slate-400'
              }`}
            >
              {ARCHITECTURAL_DOMAIN_LABELS[domain]}
            </button>
          ))}
        </div>

        <div className="pt-2">
          {!currentDrill && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700">No drills in this domain yet</p>
              <p className="text-xs text-slate-600">
                Pick another Architectural Domain, or choose All, for the active Format.
              </p>
            </div>
          )}

          {currentDrill && isRapidFireDrill(currentDrill) && (
            <RapidFireRunner
              drill={currentDrill}
              isReviewMode={isReviewMode}
              previousAttempt={previousAttempt}
              onDrillComplete={handleDrillComplete}
              onNextDrill={advanceToNextDrill}
            />
          )}
          <Suspense fallback={<PanelFallback />}>
            {currentDrill && isCurrencyDrill(currentDrill) && (
              <CurrencyRunner
                drill={currentDrill}
                isReviewMode={isReviewMode}
                onDrillComplete={handleDrillComplete}
                onNextDrill={advanceToNextDrill}
              />
            )}
            {currentDrill && isScenarioDrill(currentDrill) && (
              <DualMeterScenario
                drill={currentDrill}
                isReviewMode={isReviewMode}
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
