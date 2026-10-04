import { Cloud, Flame, Moon, Sun, User } from 'lucide-react';
import type React from 'react';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  pathname: string;
  navigate: (to: string) => void;
  totalCompleted: number;
  totalDrillsCount: number;
  streakDays: number;
  isStreakEarnedToday?: boolean;
  totalPoints?: number;
  isAuthenticated?: boolean;
  isSyncing?: boolean;
  isTrialExhausted?: boolean;
  onSignIn?: () => void;
  onOpenProgressModal: () => void;
}

const chipClass =
  'inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full border border-miro-hairline bg-miro-card text-miro-slate text-xs font-medium transition-colors';

export const Header: React.FC<HeaderProps> = ({
  pathname,
  navigate,
  totalCompleted,
  totalDrillsCount,
  streakDays,
  isStreakEarnedToday = false,
  totalPoints: _totalPoints = 0,
  isAuthenticated = false,
  isSyncing = false,
  isTrialExhausted = false,
  onSignIn,
  onOpenProgressModal,
}) => {
  const isGym =
    pathname === '/' ||
    pathname === '' ||
    pathname.startsWith('/cases') ||
    pathname.startsWith('/troubleshoot') ||
    pathname.startsWith('/drills');
  const isSkills = pathname === '/skills';
  const isStudio = pathname === '/dev/drills' || pathname.startsWith('/dev/drills/');
  const { resolved, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-miro-hairline bg-miro-card/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 group text-left cursor-pointer"
            aria-label="ArcGym home"
          >
            <div
              aria-hidden="true"
              className="h-8 w-8 rounded-full bg-miro-primary flex items-center justify-center text-miro-onPrimary font-medium text-xs tracking-tight group-hover:bg-miro-charcoal transition-colors"
            >
              AG
            </div>
            <span className="font-medium text-miro-primary tracking-tight text-lg">
              Arc<span className="text-miro-blue">Gym</span>
            </span>
          </button>

          {/* Clean Primary Navigation */}
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`inline-flex items-center px-3 h-10 text-[13.5px] border-b-2 transition-colors cursor-pointer ${
                isGym && !isSkills && !isStudio
                  ? 'border-miro-primary text-miro-primary font-medium'
                  : 'border-transparent text-miro-muted hover:text-miro-primary'
              }`}
            >
              Gym
            </button>
            <button
              type="button"
              onClick={() => navigate('/skills')}
              className={`inline-flex items-center px-3 h-10 text-[13.5px] border-b-2 transition-colors cursor-pointer ${
                isSkills
                  ? 'border-miro-primary text-miro-primary font-medium'
                  : 'border-transparent text-miro-muted hover:text-miro-primary'
              }`}
            >
              Skill Profile
            </button>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => navigate('/dev/drills')}
                className={`inline-flex items-center px-3 h-10 text-[13.5px] border-b-2 transition-colors cursor-pointer ${
                  isStudio
                    ? 'border-miro-primary text-miro-primary font-medium'
                    : 'border-transparent text-miro-muted hover:text-miro-primary'
                }`}
              >
                Studio
              </button>
            )}
          </nav>
        </div>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Streak indicator chip */}
          {streakDays > 0 ? (
            <button
              type="button"
              onClick={onOpenProgressModal}
              className={`${chipClass} ${
                isStreakEarnedToday
                  ? 'border-miro-hairlineStrong text-miro-primary'
                  : 'text-miro-slate'
              } hover:bg-miro-surfaceSoft cursor-pointer gap-1`}
              title={
                isStreakEarnedToday
                  ? `${streakDays}-day streak · earned today`
                  : `${streakDays}-day streak · click for practice history`
              }
            >
              <Flame className="h-3 w-3 text-amber-500" />
              <span className="font-mono tabular-nums">{streakDays}d</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenProgressModal}
              className={`${chipClass} hover:bg-miro-surfaceSoft cursor-pointer hidden sm:inline-flex`}
              title="Practice progress"
            >
              <span className="font-mono tabular-nums">
                {totalCompleted}/{totalDrillsCount}
              </span>
            </button>
          )}

          {/* Account & Settings Pill Trigger */}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onOpenProgressModal}
              className={`${chipClass} hover:bg-miro-surfaceSoft hover:border-miro-hairlineStrong cursor-pointer text-miro-successText flex items-center gap-1.5`}
              title={isSyncing ? 'Syncing telemetry...' : 'Cloud synced · Account & Settings'}
            >
              <Cloud className={`h-3.5 w-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline font-medium">Account</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenProgressModal || onSignIn}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                isTrialExhausted
                  ? 'bg-miro-primary text-miro-onPrimary hover:bg-miro-charcoal animate-pulse'
                  : 'border border-miro-hairline bg-miro-card text-miro-slate hover:border-miro-hairlineStrong hover:text-miro-primary'
              }`}
              title={isTrialExhausted ? 'Save streak' : 'Account & Settings'}
            >
              <User className="h-3 w-3" />
              <span className="hidden sm:inline">
                {isTrialExhausted ? 'Save streak' : 'Account'}
              </span>
            </button>
          )}

          {/* Theme switcher */}
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
