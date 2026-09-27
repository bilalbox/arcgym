import React, { useState } from 'react';
import { RapidFireRunner } from '@/components/drill/RapidFireRunner';
import { CurrencyRunner } from '@/components/drill/CurrencyRunner';
import { DualMeterScenario } from '@/components/drill/DualMeterScenario';
import { LessonStepper } from '@/components/drill/LessonStepper';
import { ProgressDialog } from '@/components/progress/ProgressDialog';
import { Badge } from '@/components/ui/badge';
import { useVisitorProgress } from '@/hooks/useVisitorProgress';
import { useDrillRecommendation } from '@/hooks/useDrillRecommendation';
import { DrillDefinitionDTO, DrillFormat } from '@arcgym/drill-core';
import rawCanonicalDrills from '@/data/canonicalDrills.json';
import { Flame, Compass, Zap, Coins, Users2, GraduationCap, ExternalLink, Target, CheckCircle } from 'lucide-react';

const ALL_DRILLS = rawCanonicalDrills as unknown as DrillDefinitionDTO[];

interface FormatConfig {
  id: DrillFormat;
  label: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
}

const FORMATS: FormatConfig[] = [
  {
    id: 'Rapid_Fire',
    label: 'Rapid Fire',
    badge: '6 Decisions',
    icon: <Zap className="h-4 w-4" />,
    description: 'High-velocity decision reps across CDC, Platform Events, Skinny Tables, and Zero Copy.',
  },
  {
    id: 'Currency',
    label: 'Currency',
    badge: 'Budget Allocation',
    icon: <Coins className="h-4 w-4" />,
    description: 'Governor limit discipline: Allocate a 100-point capacity budget under high concurrency.',
  },
  {
    id: 'Scenario',
    label: 'Scenario',
    badge: 'Dual-Meter Dialogue',
    icon: <Users2 className="h-4 w-4" />,
    description: 'Balance Stakeholder Trust against Platform Reliability in a high-stakes C-suite crunch.',
  },
  {
    id: 'Lesson',
    label: 'Lesson',
    badge: '4-Stage Refactor',
    icon: <GraduationCap className="h-4 w-4" />,
    description: 'Forensic diagnosis of a failing Flow monolith. Refactor into bulkified Apex with Event Monitoring.',
  },
];

export const App: React.FC = () => {
  const [activeFormat, setActiveFormat] = useState<DrillFormat>('Rapid_Fire');
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const {
    streakDays,
    completedDrills,
    totalCompleted,
    recordDrillCompletion,
    resetProgress,
  } = useVisitorProgress();

  const {
    currentDrill,
    reason,
    isReviewMode,
    previousAttempt,
    uncompletedCount,
    advanceToNextDrill,
    resetSessionSkip,
  } = useDrillRecommendation(activeFormat, completedDrills);

  const handleFormatChange = (fmt: DrillFormat) => {
    setActiveFormat(fmt);
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

  return (
    <div className="min-h-screen bg-miro-surface text-miro-primary flex flex-col font-sans antialiased">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-miro-hairline bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-miro-primary flex items-center justify-center text-white font-medium text-xs tracking-tight">
              AG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-miro-primary tracking-tight text-lg">
                  Arc<span className="text-miro-blue">Gym</span>
                </span>
                <Badge variant="outline" className="text-[11px] font-medium hidden sm:inline-flex">
                  Salesforce Architect Edition
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Progress Pill / History Modal Trigger */}
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

            {/* Streak Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-miro-yellowLight border border-amber-200/80 text-miro-yellowText text-xs font-medium">
              <Flame className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
              <span>{streakDays} day streak</span>
            </div>

            {/* External Docs Link */}
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

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero Banner with Dynamic Context */}
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
            AI can write Apex and Flow. You are still the architect. 2-minute daily trade-off drills strictly grounded in official Salesforce Well-Architected guidance.
          </p>
        </div>

        {/* Format Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {FORMATS.map((fmt) => {
            const isActive = activeFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => handleFormatChange(fmt.id)}
                className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'border-miro-primary bg-white shadow-xs text-miro-primary'
                    : 'border-miro-hairline bg-white/70 hover:bg-white hover:border-slate-400 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-1.5 rounded-lg ${isActive ? 'bg-miro-surface text-miro-primary' : 'bg-miro-surface text-slate-500'}`}>
                    {fmt.icon}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {fmt.badge}
                  </span>
                </div>
                <span className="text-sm font-medium text-miro-primary">
                  {fmt.label}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-normal">
                  {fmt.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Drill Runner */}
        <div className="pt-2">
          {activeFormat === 'Rapid_Fire' && (
            <RapidFireRunner
              drill={currentDrill || undefined}
              isReviewMode={isReviewMode}
              previousAttempt={previousAttempt}
              onDrillComplete={handleDrillComplete}
              onNextDrill={advanceToNextDrill}
            />
          )}
          {activeFormat === 'Currency' && (
            <CurrencyRunner
              isReviewMode={isReviewMode}
              onDrillComplete={handleDrillComplete}
            />
          )}
          {activeFormat === 'Scenario' && (
            <DualMeterScenario
              isReviewMode={isReviewMode}
              onDrillComplete={handleDrillComplete}
            />
          )}
          {activeFormat === 'Lesson' && (
            <LessonStepper
              isReviewMode={isReviewMode}
              onDrillComplete={handleDrillComplete}
            />
          )}
        </div>

        {/* Grounding & Methodology Footer */}
        <footer className="pt-8 pb-12 border-t border-miro-hairlineSoft text-center space-y-2">
          <p className="text-xs text-slate-500 leading-relaxed max-w-lg mx-auto">
            All ArcGym practice scenarios and rationales are strictly grounded in official guidance from{' '}
            <a
              href="https://architect.salesforce.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-miro-blue hover:text-miro-blueDeep font-medium underline inline-flex items-center gap-1"
            >
              architect.salesforce.com <ExternalLink className="h-3 w-3" />
            </a>
            . Built for Salesforce Technical Architects (CTAs), Enterprise Architects, and Trailblazers.
          </p>
          <p className="text-[11px] text-slate-400">
            Powered by Cloudflare Pages & React + shadcn/ui. Zero Salesforce runtime dependency.
          </p>
        </footer>
      </main>

      {/* Progress & History Modal */}
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
