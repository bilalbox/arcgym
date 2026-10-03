import {
  ARCHITECTURAL_DOMAIN_LABELS,
  ARCHITECTURAL_DOMAINS,
  type ArchitecturalDomain,
  type DrillFormat,
  isCaseFileDrill,
  isRapidFireDrill,
  isTroubleshootingDrill,
  type StepAttemptTelemetry,
} from '@arcgym/drill-core';
import type React from 'react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { RapidFireRunner } from '@/components/drill/RapidFireRunner';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ALL_DRILLS, useDrillRecommendation } from '@/hooks/useDrillRecommendation';
import { useRouter } from '@/hooks/useRouter';
import { useVisitorProgress } from '@/hooks/useVisitorProgress';
import { allowStudioNavigation } from '@/studio/navBlock';

const ProgressDialog = lazy(() =>
  import('@/components/progress/ProgressDialog').then((m) => ({ default: m.ProgressDialog })),
);
const PrivacyPage = lazy(() =>
  import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const SkillProfilePage = lazy(() =>
  import('@/pages/SkillProfilePage').then((m) => ({ default: m.SkillProfilePage })),
);
const DrillPage = lazy(() => import('@/pages/DrillPage').then((m) => ({ default: m.DrillPage })));
const CasesPage = lazy(() => import('@/pages/CasesPage').then((m) => ({ default: m.CasesPage })));
const CasePage = lazy(() => import('@/pages/CasePage').then((m) => ({ default: m.CasePage })));
const TroubleshootCatalogPage = lazy(() =>
  import('@/pages/TroubleshootCatalogPage').then((m) => ({
    default: m.TroubleshootCatalogPage,
  })),
);
const TroubleshootPage = lazy(() =>
  import('@/pages/TroubleshootPage').then((m) => ({ default: m.TroubleshootPage })),
);
const StudioDrillsPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/pages/studio/StudioDrillsPage').then((m) => ({ default: m.StudioDrillsPage })),
    )
  : null;
const StudioDrillPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/pages/studio/StudioDrillPage').then((m) => ({ default: m.StudioDrillPage })),
    )
  : null;

const RouteFallback: React.FC = () => (
  <div className="min-h-screen bg-miro-surface flex items-center justify-center">
    <p className="text-sm text-miro-slate">Loading…</p>
  </div>
);

export const App: React.FC = () => {
  const { pathname, search, navigate: rawNavigate } = useRouter();
  const navigate = useCallback(
    (to: string) => {
      if (!allowStudioNavigation()) return;
      rawNavigate(to);
    },
    [rawNavigate],
  );
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

  const caseFiles = useMemo(() => ALL_DRILLS.filter(isCaseFileDrill), []);
  const incidents = useMemo(() => ALL_DRILLS.filter(isTroubleshootingDrill), []);
  const rapidFireCatalog = useMemo(() => ALL_DRILLS.filter(isRapidFireDrill), []);

  useEffect(() => {
    if (search) {
      const params = new URLSearchParams(search);
      const dom = params.get('domain');
      if (dom && (ARCHITECTURAL_DOMAINS as string[]).includes(dom)) {
        setActiveDomain(dom as ArchitecturalDomain);
      }
    }
  }, [search]);

  const availableDomains = useMemo(() => {
    const present = new Set(rapidFireCatalog.map((d) => d.domain));
    return (Object.keys(ARCHITECTURAL_DOMAIN_LABELS) as ArchitecturalDomain[]).filter((d) =>
      present.has(d),
    );
  }, [rapidFireCatalog]);

  const { rapidFireDrills, isReviewMode, previousAttempt, advanceToNextDrill, resetSessionSkip } =
    useDrillRecommendation(completedDrills, activeDomain);

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
        navigate={navigate}
      />
    </Suspense>
  ) : null;

  const shell = (body: React.ReactNode) => (
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
      {body}
      {progressDialog}
    </div>
  );

  const drillMatch = pathname.match(/^\/drills?\/([^/]+)$/i);
  const routeDrillId = drillMatch ? drillMatch[1] : null;

  const caseMatch = pathname.match(/^\/cases\/([^/]+)$/i);
  const routeCaseId = caseMatch ? caseMatch[1] : null;

  const troubleshootMatch = pathname.match(/^\/troubleshoot\/([^/]+)$/i);
  const routeTroubleshootId = troubleshootMatch ? troubleshootMatch[1] : null;

  const studioDrillMatch = import.meta.env.DEV ? pathname.match(/^\/dev\/drills\/([^/]+)$/i) : null;
  const routeStudioDrillId = studioDrillMatch ? studioDrillMatch[1] : null;

  useEffect(() => {
    if (pathname === '/drills' || pathname === '/drill') {
      navigate('/');
    }
  }, [pathname, navigate]);

  useEffect(() => {
    if (!routeDrillId) return;
    const found = ALL_DRILLS.find((d) => d.id.toUpperCase() === routeDrillId.toUpperCase());
    if (found && isCaseFileDrill(found)) {
      navigate(`/cases/${found.id}`);
    } else if (found && isTroubleshootingDrill(found)) {
      navigate(`/troubleshoot/${found.id}`);
    }
  }, [routeDrillId, navigate]);

  if (import.meta.env.DEV && StudioDrillsPage && pathname === '/dev/drills') {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <StudioDrillsPage navigate={navigate} />
      </Suspense>,
    );
  }

  if (import.meta.env.DEV && StudioDrillPage && routeStudioDrillId) {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <StudioDrillPage drillId={routeStudioDrillId} navigate={navigate} />
      </Suspense>,
    );
  }

  if (pathname === '/privacy') {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <PrivacyPage navigate={navigate} />
      </Suspense>,
    );
  }

  if (pathname === '/skills') {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <SkillProfilePage
          completedDrills={completedDrills}
          totalPoints={totalPoints}
          allDrills={ALL_DRILLS}
          navigate={navigate}
          pathname={pathname}
        />
      </Suspense>,
    );
  }

  if (pathname === '/cases') {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <CasesPage
          caseFiles={caseFiles}
          completedDrills={completedDrills}
          navigate={navigate}
          pathname={pathname}
        />
      </Suspense>,
    );
  }

  if (routeCaseId) {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <CasePage
          drillId={routeCaseId}
          allDrills={ALL_DRILLS}
          caseFiles={caseFiles}
          completedDrills={completedDrills}
          onDrillComplete={handleDrillComplete}
          navigate={navigate}
          pathname={pathname}
        />
      </Suspense>,
    );
  }

  if (pathname === '/troubleshoot') {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <TroubleshootCatalogPage
          incidents={incidents}
          completedDrills={completedDrills}
          navigate={navigate}
          pathname={pathname}
        />
      </Suspense>,
    );
  }

  if (routeTroubleshootId) {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <TroubleshootPage
          drillId={routeTroubleshootId}
          allDrills={ALL_DRILLS}
          incidents={incidents}
          completedDrills={completedDrills}
          onDrillComplete={handleDrillComplete}
          navigate={navigate}
          pathname={pathname}
        />
      </Suspense>,
    );
  }

  if (routeDrillId) {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <DrillPage
          drillId={routeDrillId}
          allDrills={rapidFireCatalog}
          completedDrills={completedDrills}
          onDrillComplete={handleDrillComplete}
          navigate={navigate}
          pathname={pathname}
        />
      </Suspense>,
    );
  }

  return shell(
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="text-center sm:text-left space-y-2">
        <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
          Architectural judgment practice
        </h1>
        <p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
          Trade-off drills grounded in official Salesforce Well-Architected guidance.
        </p>
      </div>

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
        {availableDomains.map((domain) => (
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
        {rapidFireDrills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-miro-hairline bg-miro-card p-8 text-center space-y-2">
            <p className="text-sm font-medium text-miro-slate">No drills in this domain yet</p>
            <p className="text-xs text-miro-slate">
              Pick another Architectural Domain, or choose All.
            </p>
          </div>
        ) : (
          <RapidFireRunner
            drills={rapidFireDrills}
            isReviewMode={isReviewMode}
            previousAttempt={previousAttempt}
            onRapidFireComplete={handleRapidFireComplete}
            onNextDrill={advanceToNextDrill}
          />
        )}
      </div>

      <Footer navigate={navigate} currentPath={pathname} />
    </main>,
  );
};

export default App;
