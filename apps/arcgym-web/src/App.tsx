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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold tracking-tight shadow-sm">
              AG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg">
                  Arc<span className="text-blue-600">Gym</span>
                </span>
                <Badge variant="outline" className="text-[11px] font-medium border-slate-300 hidden sm:inline-flex">
                  Salesforce Architect Edition
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold shadow-2xs">
              <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>{streakDays} Day Streak</span>
            </div>
            <a
              href="https://architect.salesforce.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-600 hover:text-blue-600 font-medium hidden md:flex items-center gap-1 transition-colors"
            >
              <Compass className="h-3.5 w-3.5 text-blue-600" />
              architect.salesforce.com
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero Banner */}
        <div className="text-center sm:text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold mb-1">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            TODAY'S ARCHITECTURAL PRACTICE
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Daily Architectural Judgment Practice
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            AI can write Apex and Flow. You are still the architect. 2-minute daily trade-off drills strictly grounded in official Salesforce Well-Architected guidance.
          </p>
        </div>

        {/* Format Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {FORMATS.map((fmt) => {
            const isActive = activeFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => setActiveFormat(fmt.id)}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'border-2 border-blue-600 bg-white shadow-sm ring-2 ring-blue-500/10'
                    : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    {fmt.icon}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {fmt.badge}
                  </span>
                </div>
                <span className={`text-sm font-bold ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                  {fmt.label}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
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
        <footer className="pt-8 pb-12 border-t border-slate-200/80 text-center space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed max-w-lg mx-auto">
            All ArcGym practice scenarios and rationales are strictly grounded in official guidance from{' '}
            <a
              href="https://architect.salesforce.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
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
