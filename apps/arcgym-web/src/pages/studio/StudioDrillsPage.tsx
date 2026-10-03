import { ARCHITECTURAL_DOMAIN_LABELS } from '@arcgym/drill-core';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StudioBanner } from '@/components/studio/StudioBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { listStudioDrills, type StudioDrillListItem } from '@/studio/api';

interface StudioDrillsPageProps {
  navigate: (to: string) => void;
}

export const StudioDrillsPage: React.FC<StudioDrillsPageProps> = ({ navigate }) => {
  const [includePublished, setIncludePublished] = useState(false);
  const [drills, setDrills] = useState<StudioDrillListItem[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listStudioDrills(includePublished)
      .then((res) => setDrills(res.drills))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [includePublished]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drills;
    return drills.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.domainLabel.toLowerCase().includes(q),
    );
  }, [drills, query]);

  return (
    <>
      <StudioBanner />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-miro-primary tracking-tight">Drills</h1>
            <p className="text-sm text-miro-slate">
              {includePublished ? 'Drafts + published' : 'Drafts'}
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search id or title…"
            className="flex-1 min-w-[12rem] rounded-md border border-miro-hairline bg-miro-card px-3 py-2 text-sm"
          />
          <label className="inline-flex items-center gap-2 text-sm text-miro-slate cursor-pointer">
            <input
              type="checkbox"
              checked={includePublished}
              onChange={(e) => setIncludePublished(e.target.checked)}
            />
            Include published
          </label>
        </div>

        {error && (
          <p className="text-sm text-miro-dangerText border border-miro-hairline rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-miro-slate">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-miro-hairline bg-miro-card p-8 text-center">
            <p className="text-sm text-miro-slate">No drills</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((drill) => (
              <Card
                key={drill.id}
                className="border-miro-hairline bg-miro-card shadow-xs cursor-pointer hover:border-miro-hairlineStrong transition-colors"
                onClick={() => navigate(`/dev/drills/${drill.id}`)}
              >
                <CardHeader className="pb-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {drill.id}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {drill.status}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {drill.format === 'Rapid_Fire'
                        ? 'Rapid Fire'
                        : drill.format === 'Case_File'
                          ? 'Case File'
                          : 'Troubleshooting'}
                    </Badge>
                    {drill.findingCount > 0 && (
                      <Badge variant="destructive" className="text-[11px]">
                        {drill.findingCount} finding{drill.findingCount === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-base font-medium text-miro-primary tracking-tight">
                    {drill.title}
                  </h2>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-miro-slate flex flex-wrap gap-x-3 gap-y-1">
                  <span>{ARCHITECTURAL_DOMAIN_LABELS[drill.domain]}</span>
                  <span>{drill.difficulty.replaceAll('_', ' ')}</span>
                  {drill.sourceCardIds && drill.sourceCardIds.length > 0 && (
                    <span className="font-mono">{drill.sourceCardIds.join(', ')}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
};

export default StudioDrillsPage;
