import {
  type DrillFormat,
  isCaseFileDrill,
  isTroubleshootingDrill,
  type StepAttemptTelemetry,
} from '@arcgym/drill-core';
import type React from 'react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Home } from '@/components/home/Home';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ProgressDialog } from '@/components/progress/ProgressDialog';

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
  const { pathname, navigate: rawNavigate } = useRouter();
  const navigate = useCallback(
    (to: string) => {
      if (!allowStudioNavigation()) return;
      rawNavigate(to);
    },
    [rawNavigate],
  );
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
    resetProgress,
    signInWithGoogle,
    signInWithGithub,
    signOut,
    eraseAllData,
  } = useVisitorProgress();

  const caseFiles = useMemo(() => ALL_DRILLS.filter(isCaseFileDrill), []);
  const incidents = useMemo(() => ALL_DRILLS.filter(isTroubleshootingDrill), []);

  const { dailyWorkout } = useDrillRecommendation(completedDrills, visitorId);

  const handleLaunchDailyWorkout = () => {
    if (!dailyWorkout) {
      navigate('/cases');
      return;
    }

    if (dailyWorkout.format === 'Case_File' && dailyWorkout.caseFile) {
      navigate(`/cases/${dailyWorkout.caseFile.id}`);
    } else if (dailyWorkout.format === 'Troubleshooting' && dailyWorkout.incident) {
      navigate(`/troubleshoot/${dailyWorkout.incident.id}`);
    } else {
      navigate('/cases');
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
    } else {
      navigate('/');
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
    return shell(<RouteFallback />);
  }

  return shell(
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Home
        caseFiles={caseFiles}
        incidents={incidents}
        allDrills={ALL_DRILLS}
        completedDrills={completedDrills}
        streakDays={streakDays}
        isStreakEarnedToday={isStreakEarnedToday}
        totalPoints={totalPoints}
        dailyWorkout={dailyWorkout}
        onLaunchDailyWorkout={isAuthenticated ? handleLaunchDailyWorkout : openProgressModal}
        navigate={navigate}
      />

      <Footer navigate={navigate} currentPath={pathname} />
    </main>,
  );
};

export default App;
