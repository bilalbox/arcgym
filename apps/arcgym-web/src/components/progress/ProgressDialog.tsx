import type { DrillAttemptRecord, DrillDefinitionDTO } from '@arcgym/drill-core';
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Flame,
  RotateCcw,
  Target,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedDrills: Record<string, DrillAttemptRecord>;
  totalDrillsCount: number;
  totalPoints?: number;
  streakDays?: number;
  allDrills: DrillDefinitionDTO[];
  onResetProgress: () => void;
  navigate?: (to: string) => void;
}

export const ProgressDialog: React.FC<ProgressDialogProps> = ({
  open,
  onOpenChange,
  completedDrills,
  totalDrillsCount,
  totalPoints = 0,
  streakDays = 0,
  allDrills,
  onResetProgress,
  navigate,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const completedList = Object.values(completedDrills);
  const completedCount = completedList.length;
  const percent = Math.min(100, Math.round((completedCount / (totalDrillsCount || 1)) * 100));

  // Map drillId to title & domain from catalog
  const drillMap = new Map<string, DrillDefinitionDTO>();
  for (const d of allDrills) {
    drillMap.set(d.id, d);
  }

  const handleReset = () => {
    onResetProgress();
    setConfirmReset(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setConfirmReset(false);
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-miro-blue" />
            <DialogTitle className="text-xl font-medium text-miro-primary">
              Architect Practice Mastery
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-miro-slate">
            Track your completed Well-Architected drills and cumulative decision points across all
            domains.
          </DialogDescription>
        </DialogHeader>

        {/* Overview Stats */}
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <div className="p-2.5 sm:p-3 rounded-xl border border-miro-hairline bg-miro-surfaceSoft">
              <div className="flex items-center gap-1.5 text-miro-muted text-[10px] sm:text-[11px] font-medium uppercase tracking-wider mb-1">
                <Zap className="h-3.5 w-3.5 text-miro-blue" />
                <span>Points</span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-miro-primary">
                {totalPoints.toLocaleString()}{' '}
                <span className="text-[11px] font-normal text-miro-muted">pts</span>
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl border border-miro-hairline bg-miro-surfaceSoft">
              <div className="flex items-center gap-1.5 text-miro-muted text-[10px] sm:text-[11px] font-medium uppercase tracking-wider mb-1">
                <Target className="h-3.5 w-3.5 text-miro-blue" />
                <span>Mastered</span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-miro-primary">
                {completedCount}{' '}
                <span className="text-[11px] font-normal text-miro-muted">
                  / {totalDrillsCount}
                </span>
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl border border-miro-hairline bg-miro-surfaceSoft">
              <div className="flex items-center gap-1.5 text-miro-muted text-[10px] sm:text-[11px] font-medium uppercase tracking-wider mb-1">
                <Flame className="h-3.5 w-3.5 text-miro-yellowText" />
                <span>Streak</span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-miro-primary">
                {streakDays > 0 ? (
                  <>
                    {streakDays}{' '}
                    <span className="text-[11px] font-normal text-miro-muted">
                      day{streakDays === 1 ? '' : 's'}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] font-normal text-miro-muted">0 days</span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-xs text-miro-slate">
              <span>Catalog Completion</span>
              <span className="font-semibold text-miro-primary">{percent}%</span>
            </div>
            <Progress
              value={percent}
              className="h-2 bg-miro-surface"
              indicatorClassName="bg-miro-blue"
            />
          </div>
        </div>

        {/* Scrollable List of Completed Drills */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-2">
          {completedCount === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-miro-hairline bg-miro-surfaceSoft">
              <CheckCircle2 className="h-8 w-8 text-miro-hairlineStrong mx-auto mb-2" />
              <p className="text-sm font-medium text-miro-slate">No drills completed yet</p>
              <p className="text-xs text-miro-muted mt-1 max-w-xs mx-auto">
                Complete today's daily exercise to kick off your streak and track your architectural
                judgment reps.
              </p>
            </div>
          ) : (
            completedList
              .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
              .map((attempt) => {
                const def = drillMap.get(attempt.drillId);
                const title = def?.title || `Drill ${attempt.drillId}`;
                const domain = def?.domainLabel || def?.domain || attempt.format;
                const dateStr = new Date(attempt.completedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                if (navigate) {
                  return (
                    <button
                      type="button"
                      key={attempt.drillId}
                      onClick={() => {
                        navigate(`/drills/${attempt.drillId}`);
                        onOpenChange(false);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-miro-hairline bg-miro-card transition-colors flex items-start justify-between gap-3 text-sm cursor-pointer hover:bg-miro-surfaceSoft hover:border-miro-hairlineStrong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miro-blue"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-miro-muted">
                            {attempt.drillId}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                            {domain}
                          </Badge>
                        </div>
                        <p className="font-medium text-miro-primary text-xs sm:text-sm line-clamp-1">
                          {title}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-miro-muted">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {dateStr}
                          </span>
                          {attempt.attemptsCount > 1 && (
                            <span>• {attempt.attemptsCount} attempts</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-semibold text-miro-successText bg-miro-successLight px-2 py-0.5 rounded-md border border-miro-successBorder">
                          +{attempt.score} pts
                        </span>
                      </div>
                    </button>
                  );
                }

                return (
                  <div
                    key={attempt.drillId}
                    className="p-3 rounded-xl border border-miro-hairline bg-miro-card hover:bg-miro-surfaceSoft transition-colors flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-miro-muted">
                          {attempt.drillId}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                          {domain}
                        </Badge>
                      </div>
                      <p className="font-medium text-miro-primary text-xs sm:text-sm line-clamp-1">
                        {title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-miro-muted">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {dateStr}
                        </span>
                        {attempt.attemptsCount > 1 && (
                          <span>• {attempt.attemptsCount} attempts</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-semibold text-miro-successText bg-miro-successLight px-2 py-0.5 rounded-md border border-miro-successBorder">
                        +{attempt.score} pts
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Footer with Reset Controls */}
        <DialogFooter className="pt-3 border-t border-miro-hairlineSoft flex items-center justify-between sm:justify-between w-full">
          <div>
            {!confirmReset ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmReset(true)}
                className="text-xs text-miro-dangerText hover:text-miro-dangerText hover:bg-miro-dangerLight gap-1.5 px-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Progress
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-miro-dangerText font-medium inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Clear all history?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs h-7 px-2.5"
                >
                  Yes, Reset
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmReset(false)}
                  className="text-xs h-7 px-2"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
