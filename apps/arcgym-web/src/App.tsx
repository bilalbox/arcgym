import React, { useMemo, useState } from 'react';
import { RapidFireRunner } from '@/components/drill/RapidFireRunner';
import { CurrencyRunner } from '@/components/drill/CurrencyRunner';
import { DualMeterScenario } from '@/components/drill/DualMeterScenario';
import { LessonStepper } from '@/components/drill/LessonStepper';
import { ProgressDialog } from '@/components/progress/ProgressDialog';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/Footer';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { useVisitorProgress } from '@/hooks/useVisitorProgress';
import { useRouter } from '@/hooks/useRouter';
import { ALL_DRILLS, useDrillRecommendation } from '@/hooks/useDrillRecommendation';
import {
  ArchitecturalDomain,
  ARCHITECTURAL_DOMAIN_LABELS,
  DrillFormat,
  isCurrencyDrill,
  isLessonDrill,
  isRapidFireDrill,
  isScenarioDrill,
} from '@arcgym/drill-core';
import { Flame, Compass, Zap, Coins, Users2, GraduationCap, Target, CheckCircle } from 'lucide-react';

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

export const App: React.FC = () => {
  const { pathname, navigate } = useRouter();
  const [activeFormat, setActiveFormat] = useState<DrillFormat>('Rapid_Fire');
  const [activeDomain, setActiveDomain] = useState<ArchitecturalDomain | undefined>(undefined);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const {
    streakDays,
    completedDrills,
    totalCompleted,
    recordDrillCompletion,
    resetProgress,
  } = useVisitorProgress();

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
  }) => {
    recordDrillCompletion({
      drillId: result.drillId,
      format: result.format,
      score: result.score,
      accuracy: result.accuracy,
    });
  };

  if (pathname === '/privacy') {
    return <PrivacyPage navigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-miro-surface text-miro-primary flex flex-col font-sans antialiased">
      <header className="sticky top-0 z-40 w-full border-b border-miro-hairline bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 group text-left cursor-pointer"
            >
              <div className="h-8 w-8 rounded-full bg-miro-primary flex items-center justify-center text-white font-medium text-xs tracking-tight group-hover:bg-miro-charcoal transition-colors">
                AG
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-miro-primary tracking-tight text-lg">
                  Arc<span className="text-miro-blue">Gym</span>
                </span>
                <Badge variant="outline" className="text-[11px] font-medium hidden sm:inline-flex">
                  Salesforce Architect Edition
                </Badge>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsProgressModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
              title="Click to view practice history and completed drills"
            >
              <Target className="h-3.5 w-3.5 text-miro-blue" />
              <span>
                {totalCompleted} / {ALL_DRILLS.length} mastered
              </span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-miro-yellowLight border border-amber-200/80 text-miro-yellowText text-xs font-medium">
              <Flame className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
              <span>{streakDays} day streak</span>
            </div>

            <a
              href="https://architect.salesforce.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-miro-blue font-medium hidden md:flex items-center gap-1.5 transition-colors ml-1"
            >
              <Compass className="h-3.5 w-3.5 text-miro-blue" />
              architect.salesforce.com
            </a>
          </div>
        </div>
      </header>

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
            Daily architectural judgment practice
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl leading-relaxed">
            Daily trade-off drills strictly grounded in official Salesforce Well-Architected guidance.
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
              <p className="text-xs text-slate-500">
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
        </div>

        <Footer navigate={navigate} currentPath={pathname} />
      </main>

      <ProgressDialog
        open={isProgressModalOpen}
        onOpenChange={setIsProgressModalOpen}
        completedDrills={completedDrills}
        totalDrillsCount={ALL_DRILLS.length}
        allDrills={ALL_DRILLS}
        onResetProgress={resetProgress}
      />
    </div>
  );
};

export default App;
