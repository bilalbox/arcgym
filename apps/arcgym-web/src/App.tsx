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
import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { RapidFireRunner } from '@/components/drill/RapidFireRunner';
import { GymFloor } from '@/components/home/GymFloor';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ProgressDialog } from '@/components/progress/ProgressDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { getWebFormatDescriptor } from '@/formats';
import { ALL_DRILLS, useDrillRecommendation } from '@/hooks/useDrillRecommendation';
import { useRouter } from '@/hooks/useRouter';
import { useVisitorProgress } from '@/hooks/useVisitorProgress';
import { allowStudioNavigation } from '@/studio/navBlock';

const PrivacyPage = lazy(() =>
  import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() => import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage })));
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

  const {
    streakDays,
    isStreakEarnedToday,
    totalPoints,
    completedDrills,
    totalCompleted,
    isAuthenticated,
    visitorId,
    isSyncing,
    isTrialExhausted,
    recordDrillCompletion,
    recordRapidFireSetCompletion,
    resetProgress,
    signInWithGoogle,
    signInWithGithub,
    signOut,
    eraseAllData,
  } = useVisitorProgress();

  const caseFiles = useMemo(() => ALL_DRILLS.filter(isCaseFileDrill), []);
  const incidents = useMemo(() => ALL_DRILLS.filter(isTroubleshootingDrill), []);
  const rapidFireCatalog = useMemo(() => ALL_DRILLS.filter(isRapidFireDrill), []);

  const isWorkoutMode = useMemo(() => {
    if (!search) return false;
    const params = new URLSearchParams(search);
    return params.get('workout') === 'rapid-fire';
  }, [search]);

  useEffect(() => {
    if (search) {
      const params = new URLSearchParams(search);
      const dom = params.get('domain');
      if (dom && (ARCHITECTURAL_DOMAINS as string[]).includes(dom)) {
        setActiveDomain(dom as ArchitecturalDomain);
      } else if (!dom) {
        setActiveDomain(undefined);
      }
    } else {
      setActiveDomain(undefined);
    }
  }, [search]);

  const { rapidFireDrills, dailyWorkout, isReviewMode, previousAttempt, resetSessionSkip } =
    useDrillRecommendation(completedDrills, activeDomain, visitorId);

  const handleDomainChange = (domain: ArchitecturalDomain | undefined) => {
    setActiveDomain(domain);
    resetSessionSkip();
    const params = new URLSearchParams(search || '');
    if (domain) {
      params.set('domain', domain);
    } else {
      params.delete('domain');
    }
    const qs = params.toString();
    navigate(qs ? `/?${qs}` : '/');
  };

  const handleStartRapidFireWorkout = () => {
    const params = new URLSearchParams(search || '');
    params.set('workout', 'rapid-fire');
    if (activeDomain) {
      params.set('domain', activeDomain);
    }
    navigate(`/?${params.toString()}`);
  };

  const handleExitWorkout = () => {
    const params = new URLSearchParams(search || '');
    params.delete('workout');
    const qs = params.toString();
    navigate(qs ? `/?${qs}` : '/');
  };

  const handleLaunchDailyWorkout = () => {
    if (!dailyWorkout) {
      handleStartRapidFireWorkout();
      return;
    }

    if (dailyWorkout.format === 'Case_File' && dailyWorkout.caseFile) {
      navigate(`/cases/${dailyWorkout.caseFile.id}`);
    } else if (dailyWorkout.format === 'Troubleshooting' && dailyWorkout.incident) {
      navigate(`/troubleshoot/${dailyWorkout.incident.id}`);
    } else {
      handleStartRapidFireWorkout();
    }
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
    resetSessionSkip();
  };

  const handleNextRapidFireSet = () => {
    resetSessionSkip();
  };

  const openProgressModal = () => {
    setIsProgressModalOpen(true);
  };

  const progressDialog = (
    <ProgressDialog
      open={isProgressModalOpen}
      onOpenChange={setIsProgressModalOpen}
      completedDrills={completedDrills}
      totalDrillsCount={ALL_DRILLS.length}
      totalPoints={totalPoints}
      streakDays={streakDays}
      allDrills={ALL_DRILLS}
      isAuthenticated={isAuthenticated}
      onSignIn={signInWithGoogle}
      onSignInGoogle={signInWithGoogle}
      onSignInGithub={signInWithGithub}
      onSignOut={signOut}
      onResetProgress={resetProgress}
      onEraseAllData={eraseAllData}
      navigate={navigate}
    />
  );

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
        isAuthenticated={isAuthenticated}
        isSyncing={isSyncing}
        isTrialExhausted={isTrialExhausted}
        onSignIn={openProgressModal}
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
    if (found) {
      const descriptor = getWebFormatDescriptor(found.format);
      const canonicalPath = `${descriptor.detailRoutePrefix}/${found.id}`;
      if (pathname !== canonicalPath) {
        navigate(canonicalPath);
      }
    }
  }, [routeDrillId, pathname, navigate]);

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

  if (pathname === '/terms') {
    return shell(
      <Suspense fallback={<RouteFallback />}>
        <TermsPage navigate={navigate} />
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
          isAuthenticated={isAuthenticated}
          onSignInGoogle={signInWithGoogle}
          onSignInGithub={signInWithGithub}
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
          isAuthenticated={isAuthenticated}
          onSignInGoogle={signInWithGoogle}
          onSignInGithub={signInWithGithub}
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
          isAuthenticated={isAuthenticated}
          onSignInGoogle={signInWithGoogle}
          onSignInGithub={signInWithGithub}
          onDrillComplete={handleDrillComplete}
          navigate={navigate}
          pathname={pathname}
        />
      </Suspense>,
    );
  }

  if (isWorkoutMode) {
    return shell(
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleExitWorkout}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-miro-slate hover:text-miro-primary transition-colors cursor-pointer group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Exit to Gym Floor
          </button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-miro-muted font-medium bg-miro-surface px-2 py-0.5 rounded border border-miro-hairline">
              5-Rep Round
            </span>
            <Badge variant="outline" className="text-[11px] py-0 px-2 font-normal">
              ⚡ Rapid Fire
            </Badge>
            <Badge variant="domain" className="text-[11px] py-0 px-2">
              {activeDomain ? ARCHITECTURAL_DOMAIN_LABELS[activeDomain] : 'All Domains'}
            </Badge>
          </div>
        </div>

        <div className="pt-1">
          {rapidFireDrills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-miro-hairline bg-miro-card p-8 text-center space-y-3">
              <p className="text-sm font-medium text-miro-primary">No drills in this domain yet</p>
              <p className="text-xs text-miro-slate">
                Pick another Architectural Domain, or choose All.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDomainChange(undefined)}
                className="text-xs rounded-full"
              >
                Reset to All Domains
              </Button>
            </div>
          ) : (
            <RapidFireRunner
              key={activeDomain ?? 'all'}
              drills={rapidFireDrills}
              isReviewMode={isReviewMode}
              previousAttempt={previousAttempt}
              isAuthenticated={isAuthenticated}
              isTrialExhausted={isTrialExhausted}
              onSignIn={openProgressModal}
              onSignInGoogle={signInWithGoogle}
              onSignInGithub={signInWithGithub}
              onRapidFireComplete={handleRapidFireComplete}
              onNextDrill={handleNextRapidFireSet}
            />
          )}
        </div>

        <Footer navigate={navigate} currentPath={pathname} />
      </main>,
    );
  }

  return shell(
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <GymFloor
        rapidFireCatalog={rapidFireCatalog}
        caseFiles={caseFiles}
        incidents={incidents}
        allDrills={ALL_DRILLS}
        completedDrills={completedDrills}
        streakDays={streakDays}
        isStreakEarnedToday={isStreakEarnedToday}
        totalPoints={totalPoints}
        activeDomain={activeDomain}
        dailyWorkout={dailyWorkout}
        onDomainChange={handleDomainChange}
        onStartRapidFireWorkout={isAuthenticated ? handleStartRapidFireWorkout : openProgressModal}
        onLaunchDailyWorkout={isAuthenticated ? handleLaunchDailyWorkout : openProgressModal}
        navigate={navigate}
      />

      <Footer navigate={navigate} currentPath={pathname} />
    </main>,
  );
};

export default App;
