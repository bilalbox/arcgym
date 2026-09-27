import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DrillAttemptRecord, DrillDefinitionDTO } from '@arcgym/drill-core';
import { CheckCircle2, RotateCcw, AlertTriangle, Calendar, Award } from 'lucide-react';

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedDrills: Record<string, DrillAttemptRecord>;
  totalDrillsCount: number;
  allDrills: DrillDefinitionDTO[];
  onResetProgress: () => void;
}

export const ProgressDialog: React.FC<ProgressDialogProps> = ({
  open,
  onOpenChange,
  completedDrills,
  totalDrillsCount,
  allDrills,
  onResetProgress,
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
    <Dialog open={open} onOpenChange={(val) => {
      setConfirmReset(false);
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-miro-blue" />
            <DialogTitle className="text-xl font-medium text-miro-primary">
              Architect Practice Mastery
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-500">
            Track your completed Well-Architected drills across all domains.
          </DialogDescription>
        </DialogHeader>

        {/* Overview Stats */}
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Catalog Completion</span>
            <span className="font-semibold text-miro-primary">
              {completedCount} of {totalDrillsCount} Drills ({percent}%)
            </span>
          </div>
          <Progress value={percent} className="h-2 bg-slate-100" indicatorClassName="bg-miro-blue" />
        </div>

        {/* Scrollable List of Completed Drills */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-2">
          {completedCount === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No drills completed yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Complete today's daily exercise to kick off your streak and track your architectural judgment reps.
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

                return (
                  <div
                    key={attempt.drillId}
                    className="p-3 rounded-xl border border-miro-hairline bg-white hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">{attempt.drillId}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                          {domain}
                        </Badge>
                      </div>
                      <p className="font-medium text-slate-800 text-xs sm:text-sm line-clamp-1">
                        {title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {dateStr}
                        </span>
                        {attempt.attemptsCount > 1 && (
                          <span>• {attempt.attemptsCount} attempts</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        +{attempt.score} pts
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Footer with Reset Controls */}
        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
          <div>
            {!confirmReset ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmReset(true)}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5 px-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Progress
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 font-medium inline-flex items-center gap-1">
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
