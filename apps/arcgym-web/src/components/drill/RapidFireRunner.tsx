import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import { ArcGymScoringEngine, ConfidenceAnchor } from '@arcgym/drill-core';
import { CheckCircle2, XCircle, ExternalLink, ArrowRight, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DrillOption {
  id: string;
  label: string;
  isCorrect: boolean;
  distractorAntipattern?: string;
  rationale: string;
  citationUrl?: string;
}

interface DrillStep {
  id: string;
  prompt: string;
  options: DrillOption[];
}

interface RapidFireDrill {
  id: string;
  title: string;
  domain: string;
  pillars: string[];
  steps: DrillStep[];
}

const DEFAULT_DRILL: RapidFireDrill = {
  id: 'AGD-00101',
  title: 'Enterprise Integration: Scale vs. Tight Coupling in Order Egress',
  domain: 'Enterprise Integration & Event-Driven',
  pillars: ['Reliability', 'Trust', 'Operational_Excellence'],
  steps: [
    {
      id: 's1',
      prompt: 'An enterprise ERP requires near-real-time updates when an Order or Account changes (450,000 events/day). Custom business payload transformation and filtering are required prior to external publication. Which integration pattern complies with Well-Architected Trust & Reliability?',
      options: [
        {
          id: 's1_a',
          label: 'Change Data Capture (CDC) with default channel publishing',
          isCorrect: false,
          distractorAntipattern: 'CDC publishes raw schema deltas and cannot filter or enrich business payloads prior to egress.',
          rationale: 'CDC publishes raw database deltas and does not support custom Apex transformation or business filtering prior to external event egress.',
          citationUrl: 'https://architect.salesforce.com/docs/architect/decision-guides#event-driven-architecture'
        },
        {
          id: 's1_b',
          label: 'Custom High-Volume Platform Event published via Apex after-save trigger with event enrichments',
          isCorrect: true,
          rationale: 'Platform Events decouple systems asynchronously, support custom schemas, and allow Apex trigger filtering and enrichment before event egress.',
          citationUrl: 'https://architect.salesforce.com/docs/architect/decision-guides#event-driven-architecture'
        },
        {
          id: 's1_c',
          label: 'Direct synchronous REST callout inside an after-update Apex trigger',
          isCorrect: false,
          distractorAntipattern: 'Synchronous callouts inside triggers block worker threads and throw uncommitted work exceptions.',
          rationale: 'Synchronous callouts inside triggers block database transactions, risk uncommitted work exceptions, and violate platform scalability standards.',
          citationUrl: 'https://architect.salesforce.com/docs/architect/decision-guides#event-driven-architecture'
        }
      ]
    },
    {
      id: 's2',
      prompt: 'A global B2B portal has 80 million Order records. Complex dashboard queries filtering by Order Date and Customer Tier are resulting in SOQL 101 query timeouts. Which Well-Architected pattern resolves this Large Data Volume (LDV) bottleneck?',
      options: [
        {
          id: 's2_a',
          label: 'Add a standard custom index on Customer Tier and run query synchronously',
          isCorrect: false,
          distractorAntipattern: 'Low-cardinality picklists without compound indexing still exceed standard index selectivity thresholds on 80M records.',
          rationale: 'Standard custom indexes alone do not provide deterministic performance on tables over 50M rows when filter selectivity is below the 10% threshold.',
          citationUrl: 'https://architect.salesforce.com/docs/architect/well-architected/guide/reliability.html'
        },
        {
          id: 's2_b',
          label: 'Deploy Salesforce Skinny Tables combining Order header and critical filter fields, backed by Big Objects archive tiering',
          isCorrect: true,
          rationale: 'Skinny tables eliminate expensive join tables in physical database storage for high-volume objects, dramatically reducing IOPS for complex queries.',
          citationUrl: 'https://architect.salesforce.com/docs/architect/well-architected/guide/reliability.html'
        },
        {
          id: 's2_c',
          label: 'Query all 80M records in Batch Apex with 200 batch size on page load',
          isCorrect: false,
          distractorAntipattern: 'Asynchronous batch jobs cannot power synchronous interactive UI dashboards and exceed flex queue limits.',
          rationale: 'Batch Apex is designed for asynchronous bulk processing, not interactive portal latency budgets.',
          citationUrl: 'https://architect.salesforce.com/docs/architect/well-architected/guide/reliability.html'
        }
      ]
    },
    {
      id: 's3',
      prompt: 'An enterprise needs to query 15 billion historical customer telemetry transactions stored in Snowflake directly inside Data Cloud without incurring recurring cross-cloud data replication costs or storage synchronization lag. What pattern should you architect?',
      options: [
        {
          id: 's3_a',
          label: 'Zero Copy Snowflake Query Federation into Data Cloud DMOs via Apache Iceberg metadata sharing',
          isCorrect: true,
          rationale: 'Data Cloud Zero Copy queries federated Snowflake tables directly at the storage/query layer without copying or duplicating petabyte data volumes.',
          citationUrl: 'https://architect.salesforce.com/docs/architect/fundamentals/guide/data360_integration_patterns_and_practices.html#inbound-zero-copy--external-platforms-to-data-360'
        },
        {
          id: 's3_b',
          label: 'Nightly MuleSoft ETL pipeline batch extracting 15B rows into Salesforce Big Objects',
          isCorrect: false,
          distractorAntipattern: 'Massive ETL replication burns huge egress costs, causes 24h data staleness, and hits platform storage ceilings.',
          rationale: 'Traditional ETL duplication for multi-billion record datasets violates Cost Optimization and Operational Excellence.',
          citationUrl: 'https://architect.salesforce.com/docs/architect/fundamentals/guide/data360_integration_patterns_and_practices.html'
        }
      ]
    }
  ]
};

interface StepResult {
  stepId: string;
  selectedOptionId: string;
  confidence: number;
  isCorrect: boolean;
  score: number;
}

export const RapidFireRunner: React.FC<{
  drill?: RapidFireDrill;
  onDrillComplete?: (result: { streakDays: number; brierScore: number }) => void;
}> = ({ drill = DEFAULT_DRILL, onDrillComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentStep = drill.steps[currentStepIndex];
  const progressPercent = Math.round(((currentStepIndex + (isSubmitted ? 1 : 0)) / drill.steps.length) * 100);

  const handleSelectOption = (optionId: string) => {
    if (isSubmitted) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOptionId || !selectedConfidence) return;

    const chosenOption = currentStep.options.find((o) => o.id === selectedOptionId);
    const isCorrect = !!chosenOption?.isCorrect;

    // ArcGym Asymmetric Brier scoring engine
    const confidenceAnchor = (selectedConfidence / 100) as ConfidenceAnchor;
    const brierResult = ArcGymScoringEngine.calculateDecisionScore(confidenceAnchor, isCorrect);
    const score = brierResult.pointsAwarded;

    const newResult: StepResult = {
      stepId: currentStep.id,
      selectedOptionId,
      confidence: selectedConfidence,
      isCorrect,
      score,
    };

    setStepResults((prev) => [...prev, newResult]);
    setIsSubmitted(true);

    if (isCorrect && selectedConfidence >= 85) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  const handleNext = () => {
    if (currentStepIndex + 1 < drill.steps.length) {
      setCurrentStepIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setSelectedConfidence(null);
      setIsSubmitted(false);
    } else {
      setIsCompleted(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Update streak
      let nextStreak = 1;
      try {
        const raw = localStorage.getItem('arcgym_streak');
        if (raw) {
          const parsed = JSON.parse(raw);
          nextStreak = (parsed.streakDays || 0) + 1;
        }
        localStorage.setItem(
          'arcgym_streak',
          JSON.stringify({ streakDays: nextStreak, lastCompletedAt: new Date().toISOString() })
        );
      } catch (e) {
        // Fallback
      }

      onDrillComplete?.({
        streakDays: nextStreak,
        brierScore: 100,
      });
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setSelectedOptionId(null);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setStepResults([]);
    setIsCompleted(false);
  };

  const totalScore = stepResults.reduce((acc, r) => acc + r.score, 0);

  if (isCompleted) {
    return (
      <Card className="border-blue-100 shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Drill Completed!</CardTitle>
          <CardDescription>
            You executed all {drill.steps.length} architectural trade-off reps for today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="grid grid-cols-3 gap-4 text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Total Points</span>
              <p className="text-2xl font-bold text-blue-700">{totalScore}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Decisions Correct</span>
              <p className="text-2xl font-bold text-emerald-600">
                {stepResults.filter((r) => r.isCorrect).length} / {drill.steps.length}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Avg Conviction</span>
              <p className="text-2xl font-bold text-slate-800">
                {Math.round(stepResults.reduce((acc, r) => acc + r.confidence, 0) / stepResults.length)}%
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700">Decision Summary:</h4>
            {stepResults.map((r, i) => (
              <div
                key={r.stepId}
                className="flex items-center justify-between p-3 rounded-lg border text-sm bg-white"
              >
                <div className="flex items-center gap-2">
                  {r.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  )}
                  <span className="font-medium text-slate-800">Rep {i + 1}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={r.isCorrect ? 'success' : 'destructive'}>
                    {r.confidence}% Conviction
                  </Badge>
                  <span className={`font-semibold ${r.score >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {r.score >= 0 ? `+${r.score}` : r.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleRestart} variant="outline" className="w-full gap-2">
            <RotateCcw className="h-4 w-4" /> Practice Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/90 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="domain">{drill.domain}</Badge>
            <div className="flex gap-1">
              {drill.pillars.map((p) => (
                <Badge key={p} variant="pillar">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Rep {currentStepIndex + 1} of {drill.steps.length}
          </span>
        </div>
        <Progress value={progressPercent} className="mt-3 h-1.5" />
      </CardHeader>

      <CardContent className="pt-6">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed mb-6">
          {currentStep.prompt}
        </h3>

        <div className="space-y-3 mb-6">
          {currentStep.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            let containerStyle = 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50 bg-white';

            if (isSubmitted) {
              if (opt.isCorrect) {
                containerStyle = 'border-2 border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
              } else if (isSelected && !opt.isCorrect) {
                containerStyle = 'border-2 border-rose-500 bg-rose-50/70 text-rose-950';
              } else {
                containerStyle = 'border-slate-200 opacity-50 bg-white';
              }
            } else if (isSelected) {
              containerStyle = 'border-2 border-blue-600 bg-blue-50/50 text-blue-950 shadow-xs';
            }

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer text-sm leading-normal flex items-start gap-3 ${containerStyle}`}
              >
                <div className="mt-0.5 shrink-0">
                  {isSubmitted && opt.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : isSubmitted && isSelected && !opt.isCorrect ? (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  ) : (
                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs font-semibold ${
                        isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      {opt.id.slice(-1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{opt.label}</p>
                  {isSubmitted && opt.distractorAntipattern && (
                    <p className="mt-2 text-xs text-rose-800 bg-rose-100/70 p-2 rounded-md font-normal">
                      ⚠️ <span className="font-semibold">Antipattern Risk:</span> {opt.distractorAntipattern}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Universal Pre-Submit Gate */}
        {!isSubmitted ? (
          <ConfidenceGate
            selectedConfidence={selectedConfidence}
            onSelectConfidence={setSelectedConfidence}
            onSubmit={handleSubmit}
            hasSelectedAnswer={!!selectedOptionId}
            submitLabel="Commit Decision Rep"
          />
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentStep.options.find((o) => o.id === selectedOptionId)?.isCorrect ? (
                  <Badge variant="success" className="gap-1 px-3 py-1">
                    <CheckCircle2 className="h-4 w-4" /> Correct Rep
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 px-3 py-1">
                    <XCircle className="h-4 w-4" /> Antipattern Detected
                  </Badge>
                )}
                <span className="text-xs text-slate-600 font-medium">
                  Conviction committed: {selectedConfidence}%
                </span>
              </div>
              <span className="text-sm font-bold text-slate-800">
                Score: {stepResults[stepResults.length - 1]?.score > 0 ? '+' : ''}
                {stepResults[stepResults.length - 1]?.score} pts
              </span>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">Architectural Rationale:</p>
              <p className="leading-relaxed">
                {currentStep.options.find((o) => o.isCorrect)?.rationale}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {currentStep.options.find((o) => o.isCorrect)?.citationUrl && (
                <a
                  href={currentStep.options.find((o) => o.isCorrect)?.citationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Guidance on architect.salesforce.com
                </a>
              )}
              <Button onClick={handleNext} className="w-full sm:w-auto gap-2 ml-auto">
                Next Rep <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
