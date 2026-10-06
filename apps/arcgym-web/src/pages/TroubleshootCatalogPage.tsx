import {
  ARCHITECTURAL_DOMAIN_LABELS,
  type ArchitecturalDomain,
  type ClientTroubleshootingDrillDefinition,
  type DrillAttemptRecord,
} from '@arcgym/drill-core';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface TroubleshootCatalogPageProps {
  incidents: ClientTroubleshootingDrillDefinition[];
  completedDrills: Record<string, DrillAttemptRecord>;
  navigate: (to: string) => void;
  pathname: string;
}

export const TroubleshootCatalogPage: React.FC<TroubleshootCatalogPageProps> = ({
  incidents,
  completedDrills,
  navigate,
  pathname,
}) => {
  const [domain, setDomain] = useState<ArchitecturalDomain | 'all'>('all');

  const domains = useMemo(() => {
    const present = new Set(incidents.map((d) => d.domain));
    return (Object.keys(ARCHITECTURAL_DOMAIN_LABELS) as ArchitecturalDomain[]).filter((d) =>
      present.has(d),
    );
  }, [incidents]);

  const filtered = domain === 'all' ? incidents : incidents.filter((d) => d.domain === domain);

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-miro-slate hover:text-miro-primary transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </button>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
          Troubleshoot
        </h1>
      </div>

      {domains.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDomain('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              domain === 'all'
                ? 'bg-miro-primary text-miro-onPrimary border-miro-primary'
                : 'bg-miro-card text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
            }`}
          >
            All
          </button>
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                domain === d
                  ? 'bg-miro-primary text-miro-onPrimary border-miro-primary'
                  : 'bg-miro-card text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
              }`}
            >
              {ARCHITECTURAL_DOMAIN_LABELS[d]}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-miro-hairline bg-miro-card p-8 text-center">
          <p className="text-sm font-medium text-miro-slate">No Incidents yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((drill) => (
            <IncidentCard
              key={drill.id}
              drill={drill}
              completed={completedDrills[drill.id]}
              onOpen={() => navigate(`/troubleshoot/${drill.id}`)}
            />
          ))}
        </div>
      )}

      <Footer navigate={navigate} currentPath={pathname} />
    </main>
  );
};

function IncidentCard({
  drill,
  completed,
  onOpen,
}: {
  drill: ClientTroubleshootingDrillDefinition;
  completed?: DrillAttemptRecord;
  onOpen: () => void;
}) {
  return (
    <Card className="border-miro-hairline bg-miro-card shadow-xs">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-mono">
            {drill.id}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {ARCHITECTURAL_DOMAIN_LABELS[drill.domain]}
          </Badge>
          {completed && (
            <Badge variant="success" className="text-[11px]">
              +{completed.score} pts
            </Badge>
          )}
        </div>
        <h3 className="text-lg font-medium text-miro-primary tracking-tight">{drill.title}</h3>
        <p className="text-sm text-miro-slate line-clamp-2">{drill.issue}</p>
      </CardHeader>
      <CardContent className="pt-0 flex justify-end">
        <Button
          onClick={onOpen}
          className="gap-1.5 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary text-xs"
        >
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
