import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Target, Flame, Moon, Sun, Zap } from 'lucide-react';

interface HeaderProps {
  pathname: string;
  navigate: (to: string) => void;
  totalCompleted: number;
  totalDrillsCount: number;
  streakDays: number;
  isStreakEarnedToday?: boolean;
  totalPoints?: number;
  onOpenProgressModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pathname,
  navigate,
  totalCompleted,
  totalDrillsCount,
  streakDays,
  isStreakEarnedToday = false,
  totalPoints = 0,
  onOpenProgressModal,
}) => {
  const isHome = pathname === '/' || pathname === '';
  const isSkills = pathname === '/skills';
  const { resolved, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-miro-hairline bg-miro-card/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group text-left cursor-pointer"
            aria-label="ArcGym home"
          >
            <div
              aria-hidden="true"
              className="h-8 w-8 rounded-full bg-miro-primary flex items-center justify-center text-miro-onPrimary font-medium text-xs tracking-tight group-hover:bg-miro-charcoal transition-colors"
            >
              AG
            </div>
            <span className="hidden sm:inline font-medium text-miro-primary tracking-tight text-lg">
              Arc<span className="text-miro-blue">Gym</span>
            </span>
          </button>

          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => navigate('/')}
              className={`inline-flex items-center px-3 h-10 text-[13.5px] border-b-2 transition-colors cursor-pointer ${
                isHome
                  ? 'border-miro-primary text-miro-primary font-medium'
                  : 'border-transparent text-miro-muted hover:text-miro-primary'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigate('/skills')}
              className={`inline-flex items-center px-3 h-10 text-[13.5px] border-b-2 transition-colors cursor-pointer ${
                isSkills
                  ? 'border-miro-primary text-miro-primary font-medium'
                  : 'border-transparent text-miro-muted hover:text-miro-primary'
              }`}
            >
              Skill Profile
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={onOpenProgressModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-miro-surface hover:bg-miro-hairlineSoft border border-miro-hairline text-miro-slate text-xs font-medium transition-colors cursor-pointer"
            title="Click to view practice history and completed drills"
          >
            <Target className="h-3.5 w-3.5 text-miro-blue" />
            <span>
              {totalCompleted} / {totalDrillsCount} mastered
            </span>
          </button>

          {totalPoints > 0 && (
            <button
              onClick={onOpenProgressModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-miro-lavenderLight hover:bg-miro-lavenderLight/80 border border-miro-lavenderBorder text-miro-blue text-xs font-semibold transition-colors cursor-pointer"
              title="Total points achieved across all drills. Click to view history."
            >
              <Zap className="h-3.5 w-3.5 text-miro-blue fill-miro-blue" />
              <span>{totalPoints.toLocaleString()} pts</span>
            </button>
          )}

          {streakDays > 0 && (
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-xs font-medium animate-in fade-in duration-200 ${
                isStreakEarnedToday
                  ? 'bg-miro-yellowLight border-miro-yellowBorder text-miro-yellowText'
                  : 'bg-miro-surface border-miro-hairline text-miro-slate'
              }`}
              title={
                isStreakEarnedToday
                  ? `${streakDays} day practice streak (achieved today!)`
                  : `${streakDays} day practice streak • Complete all 5 Rapid Fire reps today to keep your streak!`
              }
            >
              <Flame
                className={`h-3.5 w-3.5 ${
                  isStreakEarnedToday
                    ? 'text-miro-yellowText fill-miro-yellowText'
                    : 'text-miro-muted'
                }`}
              />
              <span>{streakDays} day streak</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-miro-hairline bg-miro-card text-miro-slate hover:border-miro-hairlineStrong hover:text-miro-primary transition-colors cursor-pointer"
            aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolved === 'dark' ? (
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
