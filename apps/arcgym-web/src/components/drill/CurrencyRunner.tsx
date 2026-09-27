import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import { ArcGymScoringEngine, ConfidenceAnchor } from '@arcgym/drill-core';
import { Gauge, AlertTriangle, CheckCircle2, RotateCcw, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CurrencyRunner: React.FC<{
  onDrillComplete?: (result: { streakDays: number; brierScore: number }) => void;
}> = ({ onDrillComplete }) => {
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
      onDrillComplete?.({ streakDays: 1, brierScore: calcScore });
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
    <Card className="border-slate-200/90 shadow-sm">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="domain">Core Platform Governor Capacity</Badge>
            <Badge variant="pillar">Reliability</Badge>
            <Badge variant="pillar">Cost_Optimization</Badge>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <Gauge className="h-4 w-4 text-blue-600" />
            <span className={isOverBudget ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'}>
              Allocated: {allocatedTotal} / {TOTAL_BUDGET} pts
            </span>
          </div>
        </div>
        <Progress
          value={Math.min(100, allocatedTotal)}
          className={`mt-3 h-2 ${isOverBudget ? 'bg-rose-100' : 'bg-slate-100'}`}
          indicatorClassName={isOverBudget ? 'bg-rose-600' : allocatedTotal > 85 ? 'bg-amber-500' : 'bg-blue-600'}
        />
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
            Order Spike Pipeline: Allocate 100-Point Governor Capacity Budget
          </h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            During a Black Friday spike (10,000 orders/sec into Salesforce), allocate your 100-point transaction
            envelope across four critical architectural resources to prevent transaction rollback under high concurrency.
          </p>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
          {/* SOQL Queries */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Database SOQL & Locking Budget</span>
              <span className="font-mono text-blue-700">{soqlPoints} pts</span>
            </div>
            <Slider
              disabled={isSubmitted}
              value={[soqlPoints]}
              onValueChange={([v]) => setSoqlPoints(v)}
              max={50}
              step={5}
            />
            <p className="text-[11px] text-slate-500">
              Controls indexed SOQL selectivity and FOR UPDATE parent-child lock contention.
            </p>
          </div>

          {/* Apex CPU Time */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Apex CPU Execution Budget</span>
              <span className="font-mono text-blue-700">{cpuPoints} pts</span>
            </div>
            <Slider
              disabled={isSubmitted}
              value={[cpuPoints]}
              onValueChange={([v]) => setCpuPoints(v)}
              max={60}
              step={5}
            />
            <p className="text-[11px] text-slate-500">
              Allocated to high-density bulkified triggers and JSON business validation.
            </p>
          </div>

          {/* Heap Size */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Platform Cache & Heap Memory</span>
              <span className="font-mono text-blue-700">{heapPoints} pts</span>
            </div>
            <Slider
              disabled={isSubmitted}
              value={[heapPoints]}
              onValueChange={([v]) => setHeapPoints(v)}
              max={40}
              step={5}
            />
            <p className="text-[11px] text-slate-500">
              In-memory state and Platform Cache session partition sizing.
            </p>
          </div>

          {/* Callout Limits */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Outbound Event Egress Budget</span>
              <span className="font-mono text-blue-700">{calloutPoints} pts</span>
            </div>
            <Slider
              disabled={isSubmitted}
              value={[calloutPoints]}
              onValueChange={([v]) => setCalloutPoints(v)}
              max={40}
              step={5}
            />
            <p className="text-[11px] text-slate-500">
              High-volume Platform Event publishing and asynchronous queue handoffs.
            </p>
          </div>
        </div>

        {isOverBudget && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>
              Governor Limit Breach! You exceeded the 100-point total capacity by {allocatedTotal - TOTAL_BUDGET} pts.
              Reduce allocation before submitting.
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
            submitLabel="Commit Governor Allocation"
          />
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {score && score > 0 ? (
                  <Badge variant="success" className="gap-1 px-3 py-1">
                    <CheckCircle2 className="h-4 w-4" /> Optimal Architecture Envelope
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 px-3 py-1">
                    <AlertTriangle className="h-4 w-4" /> Suboptimal Governor Distribution
                  </Badge>
                )}
                <span className="text-xs text-slate-600 font-medium">
                  Conviction: {selectedConfidence}%
                </span>
              </div>
              <span className="text-sm font-bold text-slate-800">
                Score: {score && score > 0 ? `+${score}` : score} pts
              </span>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">Well-Architected Governor Analysis:</p>
              <p className="leading-relaxed">
                During 10,000 orders/sec spikes, prioritizing CPU budget (&ge;30 pts) ensures complex business
                validation completes without hitting 10,000ms CPU timeouts. Keeping SOQL budget (&le;25 pts) forces the
                use of Platform Cache and Skinny Tables, eliminating unindexed database row lock contention.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href="https://architect.salesforce.com/docs/architect/well-architected/guide/reliability.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Review Scalability Guide on architect.salesforce.com
              </a>
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" /> Reset Envelope
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
