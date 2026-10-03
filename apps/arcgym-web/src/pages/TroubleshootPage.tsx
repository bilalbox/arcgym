import {
  type ClientDrillDefinitionDTO,
  type ClientTroubleshootingDrillDefinition,
  type DrillAttemptRecord,
  type DrillFormat,
  isTroubleshootingDrill,
  type StepAttemptTelemetry,
  WELL_ARCHITECTED_PILLAR_LABELS,
} from '@arcgym/drill-core';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { TroubleshootRunner } from '@/components/drill/TroubleshootRunner';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TroubleshootPageProps {
  drillId: string;
  allDrills: ClientDrillDefinitionDTO[];
  incidents: ClientTroubleshootingDrillDefinition[];
  completedDrills: Record<string, DrillAttemptRecord>;
  onDrillComplete: (result: {
    drillId: string;
    format: DrillFormat;
    score: number;
    accuracy: number;
    streakDays: number;
    steps?: StepAttemptTelemetry[];
  }) => void;
  navigate: (to: string) => void;
  pathname: string;
}

export const TroubleshootPage: React.FC<TroubleshootPageProps> = ({
  drillId,
  allDrills,
  incidents,
  completedDrills,
  onDrillComplete,
  navigate,
  pathname,
}) => {
  const drill = useMemo(() => {
    const cleanId = drillId.trim().toUpperCase();
    const found = allDrills.find((d) => d.id.toUpperCase() === cleanId);
    return found && isTroubleshootingDrill(found) ? found : undefined;
  }, [allDrills, drillId]);

  const previousAttempt = drill ? completedDrills[drill.id] : undefined;

  const handleNextDrill = () => {
    if (!drill) {
      navigate('/troubleshoot');
      return;
    }
    const currentIndex = incidents.findIndex((d) => d.id === drill.id);
    if (currentIndex >= 0 && currentIndex < incidents.length - 1) {
      navigate(`/troubleshoot/${incidents[currentIndex + 1].id}`);
    } else {
      navigate('/troubleshoot');
    }
  };

  if (!drill) {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <button
          type="button"
          onClick={() => navigate('/troubleshoot')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-miro-slate hover:text-miro-primary transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>
        <div className="bg-miro-card rounded-2xl border border-miro-hairline p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-miro-surface text-miro-muted">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg sm:text-xl font-medium text-miro-primary">Incident not found</h1>
            <p className="text-sm text-miro-slate max-w-md mx-auto">
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-miro-surface border border-miro-hairline">
                {drillId}
              </code>{' '}
              is missing or not published.
            </p>
          </div>
          <Button
            onClick={() => navigate('/troubleshoot')}
            className="rounded-full bg-miro-primary hover:bg-miro-primaryHover text-miro-onPrimary text-xs font-medium px-4 py-2"
          >
            Return
          </Button>
        </div>
        <Footer navigate={navigate} currentPath={pathname} />
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/troubleshoot')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-miro-slate hover:text-miro-primary transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-miro-muted font-medium bg-miro-surface px-2 py-0.5 rounded border border-miro-hairline">
            {drill.id}
          </span>
          {drill.pillars.map((pillar) => (
            <Badge
              key={pillar}
              variant="outline"
              className="text-[10px] py-0 px-1.5 text-miro-slate"
            >
              {WELL_ARCHITECTED_PILLAR_LABELS[pillar] ?? pillar}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-medium text-miro-primary tracking-tight">
          {drill.title}
        </h1>
        {previousAttempt && (
          <p className="inline-flex items-center gap-1.5 text-xs text-miro-successText font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Previously completed with +{previousAttempt.score} pts
          </p>
        )}
      </div>

      <TroubleshootRunner
        drill={drill}
        isReviewMode={Boolean(previousAttempt)}
        previousAttempt={previousAttempt}
        onDrillComplete={onDrillComplete}
        onNextDrill={handleNextDrill}
      />

      <Footer navigate={navigate} currentPath={pathname} />
    </main>
  );
};
