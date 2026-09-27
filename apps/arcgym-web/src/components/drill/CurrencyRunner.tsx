import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import {
  ArcGymScoringEngine,
  ConfidenceAnchor,
  CurrencyDrillDefinition,
  DrillFormat,
  isArchitectBudgetOptimal,
} from '@arcgym/drill-core';
import { Gauge, AlertTriangle, CheckCircle2, RotateCcw, ExternalLink } from 'lucide-react';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';

export const CurrencyRunner: React.FC<{
  drill: CurrencyDrillDefinition;
  isReviewMode?: boolean;
  onDrillComplete?: (result: {
    drillId: string;
    format: DrillFormat;
    score: number;
    accuracy: number;
    streakDays: number;
  }) => void;
  onNextDrill?: () => void;
}> = ({ drill, isReviewMode, onDrillComplete, onNextDrill }) => {
  const initialAllocations = useMemo(() => {
    const next: Record<string, number> = {};
    for (const cat of drill.categories) {
      next[cat.id] = cat.defaultPoints;
    }
    return next;
  }, [drill]);

  const [allocations, setAllocations] = useState<Record<string, number>>(initialAllocations);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [wasOptimal, setWasOptimal] = useState(false);

  useEffect(() => {
    setAllocations(initialAllocations);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setScore(null);
    setWasOptimal(false);
  }, [drill.id, initialAllocations]);

  const allocatedTotal = Object.values(allocations).reduce((sum, n) => sum + n, 0);
  const isOverBudget = allocatedTotal > drill.totalPoints;

  const handleSubmit = () => {
    if (isOverBudget || !selectedConfidence) return;

    const optimal = isArchitectBudgetOptimal(allocations, drill.optimalRules);
    const confidenceAnchor = (selectedConfidence / 100) as ConfidenceAnchor;
    const brierResult = ArcGymScoringEngine.calculateDecisionScore(confidenceAnchor, optimal);

    setWasOptimal(optimal);
    setScore(brierResult.pointsAwarded);
    setIsSubmitted(true);

    onDrillComplete?.({
      drillId: drill.id,
      format: 'Currency',
      score: brierResult.pointsAwarded,
      accuracy: optimal ? 1.0 : 0,
      streakDays: 1,
    });
  };

  const handleReset = () => {
    setAllocations(initialAllocations);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setScore(null);
    setWasOptimal(false);
  };

  return (
    <Card className="border-miro-hairline bg-white shadow-xs">
      <CardHeader className="pb-4 border-b border-miro-hairlineSoft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="domain">{drill.domainLabel}</Badge>
            {drill.pillars.map((p) => (
              <Badge key={p} variant="pillar">
                {p}
              </Badge>
            ))}
            {isReviewMode && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                Review Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <DrillFeedbackWidget drillId={drill.id} />
            <div className="flex items-center gap-2 font-mono text-xs">
              <Gauge className="h-4 w-4 text-miro-blue" />
              <span className={isOverBudget ? 'text-miro-dangerText font-medium' : 'text-slate-700 font-medium'}>
                Allocated: {allocatedTotal} / {drill.totalPoints} pts
              </span>
            </div>
          </div>
        </div>
        <Progress
          value={Math.min(100, (allocatedTotal / drill.totalPoints) * 100)}
          className="mt-3"
          indicatorClassName={
            isOverBudget ? 'bg-rose-500' : allocatedTotal / drill.totalPoints > 0.85 ? 'bg-amber-500' : 'bg-miro-primary'
          }
        />
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-medium text-miro-primary leading-relaxed">{drill.prompt}</h3>
          {drill.detail && (
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{drill.detail}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-miro-surface rounded-2xl border border-miro-hairlineSoft">
          {drill.categories.map((cat) => (
            <div key={cat.id} className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>{cat.label}</span>
                <span className="font-mono text-miro-primary font-semibold">
                  {allocations[cat.id] ?? cat.defaultPoints} pts
                </span>
              </div>
              <Slider
                disabled={isSubmitted}
                value={[allocations[cat.id] ?? cat.defaultPoints]}
                onValueChange={([v]) => setAllocations((prev) => ({ ...prev, [cat.id]: v }))}
                max={cat.maxPoints}
                step={cat.step ?? 5}
              />
              {cat.description && (
                <p className="text-[12px] text-slate-500 leading-normal">{cat.description}</p>
              )}
            </div>
          ))}
        </div>

        {isOverBudget && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-200 bg-miro-dangerLight text-xs text-miro-dangerText font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Governor limit exceeded. You exceeded the {drill.totalPoints}-point total capacity by{' '}
              {allocatedTotal - drill.totalPoints} pts. Reduce allocation before committing.
            </span>
          </div>
        )}

        {!isSubmitted ? (
          <ConfidenceGate
            selectedConfidence={selectedConfidence}
            onSelectConfidence={setSelectedConfidence}
            onSubmit={handleSubmit}
            disabled={isOverBudget}
            hasSelectedAnswer={!isOverBudget && allocatedTotal > 0}
            submitLabel="Commit governor allocation"
          />
        ) : (
          <div className="mt-6 rounded-2xl border border-miro-hairline bg-miro-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {wasOptimal ? (
                  <Badge variant="success" className="gap-1.5 px-3 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Optimal architecture envelope
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Suboptimal governor distribution
                  </Badge>
                )}
                <span className="text-xs text-slate-500">Confidence: {selectedConfidence}%</span>
              </div>
              <span className="text-sm font-mono font-semibold text-miro-primary">
                Score: {score !== null && score > 0 ? `+${score}` : score} pts
              </span>
            </div>

            {drill.analysis && (
              <div className="text-xs sm:text-sm text-slate-700 space-y-1.5">
                <p className="font-medium text-miro-primary">Well-Architected governor analysis:</p>
                <p className="leading-relaxed">{drill.analysis}</p>
              </div>
            )}

            <div className="pt-3 border-t border-miro-hairlineSoft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {drill.citationUrl && (
                <a
                  href={drill.citationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-miro-blue hover:text-miro-blueDeep font-medium flex items-center gap-1.5 underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Review scalability guide on architect.salesforce.com
                </a>
              )}
              <div className="flex gap-2">
                <Button onClick={handleReset} variant="secondary" className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Reset allocation
                </Button>
                {onNextDrill && (
                  <Button onClick={onNextDrill} className="gap-2">
                    Next drill
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
