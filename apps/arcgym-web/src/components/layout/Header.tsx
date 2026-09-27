import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Target, Flame, Compass } from 'lucide-react';

interface HeaderProps {
  pathname: string;
  navigate: (to: string) => void;
  totalCompleted: number;
  totalDrillsCount: number;
  streakDays: number;
  onOpenProgressModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pathname,
  navigate,
  totalCompleted,
  totalDrillsCount,
  streakDays,
  onOpenProgressModal,
}) => {
  const isHome = pathname === '/' || pathname === '';
  const isSkills = pathname === '/skills';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-miro-hairline bg-white/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group text-left cursor-pointer"
            aria-label="ArcGym home"
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

          {/* Navigation Links */}
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => navigate('/')}
              className={`inline-flex items-center px-3 h-10 text-[13.5px] border-b-2 transition-colors cursor-pointer ${
                isHome
                  ? 'border-miro-primary text-miro-primary font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigate('/skills')}
              className={`inline-flex items-center px-3 h-10 text-[13.5px] border-b-2 transition-colors cursor-pointer ${
                isSkills
                  ? 'border-miro-primary text-miro-primary font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Skill Profile
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenProgressModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Click to view practice history and completed drills"
          >
            <Target className="h-3.5 w-3.5 text-miro-blue" />
            <span>
              {totalCompleted} / {totalDrillsCount} mastered
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
  );
};
