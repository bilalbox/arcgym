import type { ClientDrillDefinitionDTO, DrillAttemptRecord } from '@arcgym/drill-core';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Calendar,
  Cloud,
  FileText,
  RotateCcw,
  Shield,
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
import { GithubIcon, GoogleIcon } from '@/components/ui/icons';
import { Progress } from '@/components/ui/progress';

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedDrills: Record<string, DrillAttemptRecord>;
  totalDrillsCount: number;
  totalPoints?: number;
  streakDays?: number;
  allDrills: ClientDrillDefinitionDTO[];
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onSignInGoogle?: () => void;
  onSignInGithub?: () => void;
  onSignOut?: () => void;
  onResetProgress: () => void;
  onEraseAllData?: () => void;
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
  isAuthenticated = false,
  onSignIn,
  onSignInGoogle,
  onSignInGithub,
  onSignOut,
  onResetProgress,
  onEraseAllData,
  navigate,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const completedList = Object.values(completedDrills);
  const completedCount = completedList.length;
  const percent = Math.min(100, Math.round((completedCount / (totalDrillsCount || 1)) * 100));

  const drillMap = new Map<string, ClientDrillDefinitionDTO>();
  for (const d of allDrills) {
    drillMap.set(d.id, d);
  }

  const handleReset = () => {
    if (isAuthenticated && onEraseAllData) {
      onEraseAllData();
    } else {
      onResetProgress();
    }
    setConfirmReset(false);
    onOpenChange(false);
  };

  const handleOpenPrivacy = () => {
    onOpenChange(false);
    if (navigate) {
      navigate('/privacy');
    }
  };

  const handleOpenTerms = () => {
    onOpenChange(false);
    if (navigate) {
      navigate('/terms');
    }
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm flex flex-col p-6 gap-0">
          <DialogHeader className="pb-4 border-b border-miro-hairlineSoft">
            <DialogTitle className="text-lg font-medium text-miro-primary">
              Sign in to ArcGym
            </DialogTitle>
            <DialogDescription className="text-sm text-miro-slate">
              Practice is 100% free. Sign in to start drills, commit decisions, and track your
              streak.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-3">
            {(onSignInGoogle || onSignIn) && (
              <Button
                type="button"
                onClick={onSignInGoogle || onSignIn}
                className="w-full py-2.5 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary text-xs font-semibold rounded-full inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <GoogleIcon className="h-4 w-4" />
                <span>Continue with Google</span>
              </Button>
            )}
            {onSignInGithub && (
              <Button
                type="button"
                variant="outline"
                onClick={onSignInGithub}
                className="w-full py-2.5 bg-miro-card border-miro-hairline hover:border-miro-hairlineStrong hover:bg-miro-surfaceSoft text-miro-primary text-xs font-semibold rounded-full inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <GithubIcon className="h-4 w-4" />
                <span>Continue with GitHub</span>
              </Button>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-miro-hairlineSoft flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenPrivacy}
                className="text-xs text-miro-slate hover:text-miro-primary gap-1 cursor-pointer"
              >
                <Shield className="h-3 w-3" />
                <span>Privacy</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenTerms}
                className="text-xs text-miro-slate hover:text-miro-primary gap-1 cursor-pointer"
              >
                <FileText className="h-3 w-3" />
                <span>Terms</span>
              </Button>
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
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setConfirmReset(false);
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-medium text-miro-primary">
            Account & Settings
          </DialogTitle>
          <DialogDescription className="text-sm text-miro-slate">
            Manage cloud synchronization, telemetry, and local data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Identity & Cloud Sync Card */}
          <div className="p-3.5 bg-miro-surfaceSoft border border-miro-hairline rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-miro-successText">
              <Cloud className="h-4 w-4 shrink-0" />
              <div>
                <span className="font-semibold block text-miro-primary">Cloud Sync Active</span>
                <span className="text-[11px] text-miro-slate">
                  Telemetry synced across devices with Zero-PII protection.
                </span>
              </div>
            </div>
            {onSignOut && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSignOut}
                className="text-xs h-7 border-miro-hairline hover:bg-miro-card"
              >
                Sign out
              </Button>
            )}
          </div>

          {/* Practice Telemetry Overview */}
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

          {/* Catalog Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-miro-slate">
              <span>Catalog Practice Progress</span>
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

          {/* Skill Profile & Radar Access */}
          <div className="p-3 bg-miro-surfaceSoft border border-miro-hairline rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <BarChart2 className="h-4 w-4 text-miro-blue shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold block text-miro-primary">Skill Profile & Radar</span>
                <span className="text-[11px] text-miro-slate truncate block">
                  Domain proficiency, calibration scores, and readiness analysis.
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                navigate?.('/skills');
              }}
              className="text-xs h-7 px-2.5 border-miro-hairline hover:bg-miro-card shrink-0 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Radar</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Practice History List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 border-t border-miro-hairlineSoft pt-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium text-miro-primary">Practice History</span>
            <span className="text-[11px] text-miro-muted">
              {completedCount} record{completedCount === 1 ? '' : 's'}
            </span>
          </div>

          {completedCount === 0 ? (
            <div className="py-6 px-4 rounded-xl border border-dashed border-miro-hairline bg-miro-surfaceSoft text-center">
              <p className="text-xs text-miro-slate">
                No drills completed yet. Start your first workout!
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
                      <span className="font-mono text-xs text-miro-slate tabular-nums font-medium">
                        +{attempt.score} pts
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
                      className="w-full text-left p-2.5 rounded-xl border border-miro-hairline bg-miro-card transition-colors flex items-start justify-between gap-3 text-sm cursor-pointer hover:bg-miro-surfaceSoft hover:border-miro-hairlineStrong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miro-blue"
                    >
                      {body}
                    </button>
                  );
                }

                return (
                  <div
                    key={attempt.drillId}
                    className="p-2.5 rounded-xl border border-miro-hairline bg-miro-card hover:bg-miro-surfaceSoft transition-colors flex items-start justify-between gap-3 text-sm"
                  >
                    {body}
                  </div>
                );
              })
          )}
        </div>

        {/* Footer: Data Management & Privacy */}
        <DialogFooter className="pt-3 border-t border-miro-hairlineSoft flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div>
            {!confirmReset ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmReset(true)}
                className="text-xs text-miro-dangerText hover:text-miro-dangerText hover:bg-miro-dangerLight gap-1.5 px-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear Data
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
                  Yes, Clear
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

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenPrivacy}
              className="text-xs text-miro-slate hover:text-miro-primary gap-1 cursor-pointer"
            >
              <Shield className="h-3 w-3" />
              <span>Privacy</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenTerms}
              className="text-xs text-miro-slate hover:text-miro-primary gap-1 cursor-pointer"
            >
              <FileText className="h-3 w-3" />
              <span>Terms</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
