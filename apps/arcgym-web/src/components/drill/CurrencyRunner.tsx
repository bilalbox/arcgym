import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import { ArcGymScoringEngine, ConfidenceAnchor, DrillFormat } from '@arcgym/drill-core';
import { Gauge, AlertTriangle, CheckCircle2, RotateCcw, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CurrencyRunner: React.FC<{
  isReviewMode?: boolean;
  onDrillComplete?: (result: {
    drillId: string;
    format: DrillFormat;
    score: number;
    accuracy: number;
    streakDays: number;
  }) => void;
}> = ({ isReviewMode, onDrillComplete }) => {
  const TOTAL_BUDGET = 100;

  // 4 Resource allocation knobs
  const [soqlPoints, setSoqlPoints] = useState(25);
  const [cpuPoints, setCpuPoints] = useState(30);
  const [heapPoints, setHeapPoints] = useState(25);
  const [calloutPoints, setCalloutPoints] = useState(20);

  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const allocatedTotal = soqlPoints + cpuPoints + heapPoints + calloutPoints;
  const isOverBudget = allocatedTotal > TOTAL_BUDGET;

  const handleSubmit = () => {
    if (isOverBudget || !selectedConfidence) return;

    // Ideal balanced Governor envelope: SOQL <= 25, CPU >= 30, Heap <= 25, Callouts <= 20
    const isOptimal = soqlPoints <= 25 && cpuPoints >= 30 && heapPoints <= 25 && calloutPoints <= 20;
    const confidenceAnchor = (selectedConfidence / 100) as ConfidenceAnchor;

    const brierResult = ArcGymScoringEngine.calculateDecisionScore(confidenceAnchor, isOptimal);
    const calcScore = brierResult.pointsAwarded;

    setScore(calcScore);
    setIsSubmitted(true);

    if (isOptimal) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      onDrillComplete?.({
        drillId: 'AGD-00201',
        format: 'Currency',
        score: calcScore,
        accuracy: 1.0,
        streakDays: 1,
      });
    }
  };

  const handleReset = () => {
    setSoqlPoints(25);
    setCpuPoints(30);
    setHeapPoints(25);
    setCalloutPoints(20);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setScore(null);
  };

  return (
    <Card className="border-miro-hairline bg-white shadow-xs">
      <CardHeader className="pb-4 border-b border-miro-hairlineSoft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="domain">Core Platform Governor Capacity</Badge>
            <Badge variant="pillar">Reliability</Badge>
            <Badge variant="pillar">Cost_Optimization</Badge>
            {isReviewMode && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                Review Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <Gauge className="h-4 w-4 text-miro-blue" />
            <span className={isOverBudget ? 'text-miro-dangerText font-medium' : 'text-slate-700 font-medium'}>
              Allocated: {allocatedTotal} / {TOTAL_BUDGET} pts
            </span>
          </div>
        </div>
        <Progress
          value={Math.min(100, allocatedTotal)}
          className="mt-3"
          indicatorClassName={isOverBudget ? 'bg-rose-500' : allocatedTotal > 85 ? 'bg-amber-500' : 'bg-miro-primary'}
        />
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-medium text-miro-primary leading-relaxed">
            Order spike pipeline: allocate 100-point governor capacity budget
          </h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            During a peak volume spike (10,000 orders/sec into Salesforce), allocate your 100-point transaction
            envelope across four critical architectural resources to prevent transaction rollback under high concurrency.
          </p>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-miro-surface rounded-2xl border border-miro-hairlineSoft">
          {/* SOQL Queries */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Database SOQL & locking budget</span>
              <span className="font-mono text-miro-primary font-semibold">{soqlPoints} pts</span>
            </div>
            <Slider
              disabled={isSubmitted}
              value={[soqlPoints]}
              onValueChange={([v]) => setSoqlPoints(v)}
              max={50}
              step={5}
            />
            <p className="text-[12px] text-slate-500 leading-normal">
              Controls indexed SOQL selectivity and FOR UPDATE parent-child lock contention.
            </p>
          </div>

          {/* Apex CPU Time */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Apex CPU execution budget</span>
              <span className="font-mono text-miro-primary font-semibold">{cpuPoints} pts</span>
            </div>
            <Slider
              disabled={isSubmitted}
              value={[cpuPoints]}
              onValueChange={([v]) => setCpuPoints(v)}
              max={60}
              step={5}
            />
            <p className="text-[12px] text-slate-500 leading-normal">
              Allocated to high-density bulkified triggers and JSON business validation.
            </p>
          </div>

          {/* Heap Size */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Platform cache & heap memory</span>
              <span className="font-mono text-miro-primary font-semibold">{heapPoints} pts</span>
            </div>
            <Slider
              disabled={isSubmitted}
              value={[heapPoints]}
              onValueChange={([v]) => setHeapPoints(v)}
              max={40}
              step={5}
            />
            <p className="text-[12px] text-slate-500 leading-normal">
              In-memory state and Platform Cache session partition sizing.
            </p>
          </div>

          {/* Callout Limits */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Outbound event egress budget</span>
              <span className="font-mono text-miro-primary font-semibold">{calloutPoints} pts</span>
            </div>
            <Slider
              disabled={isSubmitted}
              value={[calloutPoints]}
              onValueChange={([v]) => setCalloutPoints(v)}
              max={40}
              step={5}
            />
            <p className="text-[12px] text-slate-500 leading-normal">
              High-volume Platform Event publishing and asynchronous queue handoffs.
            </p>
          </div>
        </div>

        {isOverBudget && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-200 bg-miro-dangerLight text-xs text-miro-dangerText font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Governor limit exceeded. You exceeded the 100-point total capacity by {allocatedTotal - TOTAL_BUDGET} pts.
              Reduce allocation before committing.
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
                {score && score > 0 ? (
                  <Badge variant="success" className="gap-1.5 px-3 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Optimal architecture envelope
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Suboptimal governor distribution
                  </Badge>
                )}
                <span className="text-xs text-slate-500">
                  Conviction: {selectedConfidence}%
                </span>
              </div>
              <span className="text-sm font-mono font-semibold text-miro-primary">
                Score: {score && score > 0 ? `+${score}` : score} pts
              </span>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 space-y-1.5">
              <p className="font-medium text-miro-primary">Well-Architected governor analysis:</p>
              <p className="leading-relaxed">
                During 10,000 orders/sec spikes, prioritizing CPU budget (&ge;30 pts) ensures complex business
                validation completes without hitting 10,000ms CPU timeouts. Keeping SOQL budget (&le;25 pts) forces the
                use of Platform Cache and Skinny Tables, eliminating unindexed database row lock contention.
              </p>
            </div>

            <div className="pt-3 border-t border-miro-hairlineSoft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <a
                href="https://architect.salesforce.com/docs/architect/well-architected/guide/reliability.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-miro-blue hover:text-miro-blueDeep font-medium flex items-center gap-1.5 underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Review scalability guide on architect.salesforce.com
              </a>
              <Button onClick={handleReset} variant="secondary" className="gap-2">
                <RotateCcw className="h-4 w-4" /> Reset allocation
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
