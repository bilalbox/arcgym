import React, { useState, useEffect } from 'react';
import { RapidFireRunner } from '@/components/drill/RapidFireRunner';
import { CurrencyRunner } from '@/components/drill/CurrencyRunner';
import { DualMeterScenario } from '@/components/drill/DualMeterScenario';
import { LessonStepper } from '@/components/drill/LessonStepper';
import { Badge } from '@/components/ui/badge';
import { Flame, Compass, Zap, Coins, Users2, GraduationCap, ExternalLink } from 'lucide-react';

export type DrillFormat = 'Rapid_Fire' | 'Currency' | 'Scenario' | 'Lesson';

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
  const [streakDays, setStreakDays] = useState<number>(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('arcgym_streak');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.streakDays) {
          setStreakDays(parsed.streakDays);
        }
      }
    } catch (e) {
      // Fallback
    }
  }, []);

  const handleDrillComplete = (result: { streakDays: number }) => {
    if (result.streakDays) {
      setStreakDays(result.streakDays);
    }
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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-miro-yellowLight border border-amber-200/80 text-miro-yellowText text-xs font-medium">
              <Flame className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
              <span>{streakDays} day streak</span>
            </div>
            <a
              href="https://architect.salesforce.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-miro-blue font-medium hidden md:flex items-center gap-1.5 transition-colors"
            >
              <Compass className="h-3.5 w-3.5 text-miro-blue" />
              architect.salesforce.com
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero Banner */}
        <div className="text-center sm:text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-200/60 text-miro-blue text-xs font-medium mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-miro-blue" />
            Today's architectural practice
          </div>
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
                onClick={() => setActiveFormat(fmt.id)}
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
          {activeFormat === 'Rapid_Fire' && <RapidFireRunner onDrillComplete={handleDrillComplete} />}
          {activeFormat === 'Currency' && <CurrencyRunner onDrillComplete={handleDrillComplete} />}
          {activeFormat === 'Scenario' && <DualMeterScenario onDrillComplete={handleDrillComplete} />}
          {activeFormat === 'Lesson' && <LessonStepper onDrillComplete={handleDrillComplete} />}
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
    </div>
  );
};
export default App;
