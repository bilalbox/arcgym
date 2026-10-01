import type { DrillAttemptRecord, DrillDefinitionDTO } from '@arcgym/drill-core';
import { AlertTriangle, Calendar, RotateCcw } from 'lucide-react';
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
          <DialogTitle className="text-xl font-medium text-miro-primary">Practice</DialogTitle>
          <DialogDescription className="text-sm text-miro-slate">
            Completed drills and cumulative points.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <div className="p-2.5 sm:p-3 rounded-xl border border-miro-hairline bg-miro-surfaceSoft">
              <div className="text-miro-muted text-xs font-medium mb-1">Points</div>
              <p className="text-sm sm:text-base font-semibold text-miro-primary font-mono tabular-nums">
                {totalPoints.toLocaleString()}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl border border-miro-hairline bg-miro-surfaceSoft">
              <div className="text-miro-muted text-xs font-medium mb-1">Completed</div>
              <p className="text-sm sm:text-base font-semibold text-miro-primary font-mono tabular-nums">
                {completedCount}
                <span className="text-[11px] font-normal text-miro-muted">
                  {' '}
                  / {totalDrillsCount}
                </span>
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl border border-miro-hairline bg-miro-surfaceSoft">
              <div className="text-miro-muted text-xs font-medium mb-1">Streak</div>
              <p className="text-sm sm:text-base font-semibold text-miro-primary font-mono tabular-nums">
                {streakDays}
                <span className="text-[11px] font-normal text-miro-muted">
                  {' '}
                  day{streakDays === 1 ? '' : 's'}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-xs text-miro-slate">
              <span>Catalog</span>
              <span className="font-medium text-miro-primary font-mono tabular-nums">
                {percent}%
              </span>
            </div>
            <Progress
              value={percent}
              className="h-1.5 bg-miro-surface"
              indicatorClassName="bg-miro-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-2">
          {completedCount === 0 ? (
            <div className="py-8 px-4 rounded-xl border border-dashed border-miro-hairline bg-miro-surfaceSoft">
              <p className="text-sm text-miro-slate text-center">No drills completed yet.</p>
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

                const body = (
                  <>
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
                          <span>· {attempt.attemptsCount} attempts</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs text-miro-slate tabular-nums">
                        +{attempt.score}
                      </span>
                    </div>
                  </>
                );

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
                      {body}
                    </button>
                  );
                }

                return (
                  <div
                    key={attempt.drillId}
                    className="p-3 rounded-xl border border-miro-hairline bg-miro-card hover:bg-miro-surfaceSoft transition-colors flex items-start justify-between gap-3 text-sm"
                  >
                    {body}
                  </div>
                );
              })
          )}
        </div>

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
