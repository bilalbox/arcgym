import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import { ArcGymScoringEngine, ConfidenceAnchor, DrillDefinitionDTO, DrillFormat, DrillAttemptRecord } from '@arcgym/drill-core';
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
  drill?: RapidFireDrill | DrillDefinitionDTO;
  isReviewMode?: boolean;
  previousAttempt?: DrillAttemptRecord;
  onDrillComplete?: (result: {
    drillId: string;
    format: DrillFormat;
    score: number;
    accuracy: number;
    streakDays: number;
  }) => void;
  onNextDrill?: () => void;
}> = ({
  drill = DEFAULT_DRILL,
  isReviewMode = false,
  previousAttempt,
  onDrillComplete,
  onNextDrill,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setCurrentStepIndex(0);
    setSelectedOptionId(null);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setStepResults([]);
    setIsCompleted(false);
  }, [drill.id]);

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
    // Notice: Purged single-question confetti here! Confetti is only fired upon drill completion.
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
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      let nextStreak = 1;
      try {
        const raw = localStorage.getItem('arcgym_streak');
        if (raw) {
          const parsed = JSON.parse(raw);
          nextStreak = (parsed.streakDays || 0) + 1;
        }
      } catch (e) {
        // Fallback
      }

      const totalPts = stepResults.reduce((acc, r) => acc + r.score, 0);
      const correctCount = stepResults.filter((r) => r.isCorrect).length;
      const accuracy = stepResults.length > 0 ? correctCount / stepResults.length : 0;

      onDrillComplete?.({
        drillId: drill.id,
        format: 'Rapid_Fire',
        score: totalPts,
        accuracy,
        streakDays: nextStreak,
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
      <Card className="border-miro-hairline bg-white shadow-xs">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-miro-successLight text-miro-successText">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-medium text-miro-primary">Drill completed</CardTitle>
          <CardDescription>
            You committed all {drill.steps.length} architectural decision reps for today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="grid grid-cols-3 gap-3 text-center p-4 bg-miro-surface rounded-2xl border border-miro-hairlineSoft">
            <div>
              <span className="text-xs text-slate-500 font-medium">Total points</span>
              <p className="text-2xl font-medium text-miro-primary mt-0.5">{totalScore}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Decisions correct</span>
              <p className="text-2xl font-medium text-emerald-700 mt-0.5">
                {stepResults.filter((r) => r.isCorrect).length} / {drill.steps.length}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Avg conviction</span>
              <p className="text-2xl font-medium text-slate-800 mt-0.5">
                {Math.round(stepResults.reduce((acc, r) => acc + r.confidence, 0) / stepResults.length)}%
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-700">Decision breakdown</h4>
            {stepResults.map((r, i) => (
              <div
                key={r.stepId}
                className="flex items-center justify-between p-3 rounded-xl border border-miro-hairline bg-white text-sm"
              >
                <div className="flex items-center gap-2.5">
                  {r.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  )}
                  <span className="font-medium text-slate-800">Rep {i + 1}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={r.isCorrect ? 'success' : 'destructive'}>
                    {r.confidence}% conviction
                  </Badge>
                  <span className={`font-mono text-xs font-semibold ${r.score >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {r.score >= 0 ? `+${r.score}` : r.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>

          {isReviewMode && previousAttempt && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
              <span>Review Practice: Previously mastered on {new Date(previousAttempt.completedAt).toLocaleDateString()}</span>
              <span className="font-semibold">Prior score: +{previousAttempt.score} pts</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-1">
            {onNextDrill && (
              <Button
                onClick={() => {
                  handleRestart();
                  onNextDrill();
                }}
                className="w-full gap-2 bg-miro-primary hover:bg-slate-800 text-white font-medium"
              >
                Practice next suggested drill <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={handleRestart} variant="secondary" className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Practice this drill again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-miro-hairline bg-white shadow-xs">
      <CardHeader className="pb-4 border-b border-miro-hairlineSoft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="domain">{drill.domain}</Badge>
            {(drill.pillars || []).map((p) => (
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
          <span className="text-xs text-slate-500 font-medium">
            Rep {currentStepIndex + 1} of {drill.steps.length}
          </span>
        </div>
        <Progress value={progressPercent} className="mt-3 h-1 bg-miro-hairlineSoft" indicatorClassName="bg-miro-primary" />
      </CardHeader>

      <CardContent className="pt-6">
        <h3 className="text-base sm:text-lg font-medium text-miro-primary leading-relaxed mb-6">
          {currentStep.prompt}
        </h3>

        <div className="space-y-3 mb-6">
          {currentStep.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            let containerStyle = 'border-miro-hairline hover:border-slate-400 bg-white';

            if (isSubmitted) {
              if (opt.isCorrect) {
                containerStyle = 'border-2 border-emerald-600 bg-emerald-50/50 text-slate-900';
              } else if (isSelected && !opt.isCorrect) {
                containerStyle = 'border-2 border-rose-500 bg-rose-50/60 text-slate-900';
              } else {
                containerStyle = 'border-miro-hairline opacity-45 bg-white';
              }
            } else if (isSelected) {
              containerStyle = 'border-2 border-miro-primary bg-slate-50/80 text-miro-primary';
            }

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer text-sm leading-normal flex items-start gap-3.5 ${containerStyle}`}
              >
                <div className="mt-0.5 shrink-0">
                  {isSubmitted && opt.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : isSubmitted && isSelected && !opt.isCorrect ? (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  ) : (
                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs font-semibold ${
                        isSelected ? 'border-miro-primary bg-miro-primary text-white' : 'border-miro-hairlineStrong text-slate-500'
                      }`}
                    >
                      {opt.id.slice(-1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-normal text-slate-800">{opt.label}</p>
                  {isSubmitted && opt.distractorAntipattern && (
                    <p className="mt-2.5 text-xs text-rose-900 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                      <span className="font-semibold">Antipattern risk:</span> {opt.distractorAntipattern}
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
            submitLabel="Commit decision"
          />
        ) : (
          <div className="mt-6 rounded-2xl border border-miro-hairline bg-miro-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentStep.options.find((o) => o.id === selectedOptionId)?.isCorrect ? (
                  <Badge variant="success" className="gap-1.5 px-3 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Well-Architected Choice
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                    <XCircle className="h-3.5 w-3.5" /> Antipattern Detected
                  </Badge>
                )}
                <span className="text-xs text-slate-500">
                  Conviction: {selectedConfidence}%
                </span>
              </div>
              <span className="text-sm font-mono font-semibold text-miro-primary">
                Score: {stepResults[stepResults.length - 1]?.score > 0 ? '+' : ''}
                {stepResults[stepResults.length - 1]?.score} pts
              </span>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 space-y-1.5">
              <p className="font-medium text-miro-primary">Architectural rationale:</p>
              <p className="leading-relaxed">
                {currentStep.options.find((o) => o.isCorrect)?.rationale}
              </p>
            </div>

            <div className="pt-3 border-t border-miro-hairlineSoft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {currentStep.options.find((o) => o.isCorrect)?.citationUrl && (
                <a
                  href={currentStep.options.find((o) => o.isCorrect)?.citationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-miro-blue hover:text-miro-blueDeep font-medium flex items-center gap-1.5 underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View guidance on architect.salesforce.com
                </a>
              )}
              <Button onClick={handleNext} className="w-full sm:w-auto gap-2 ml-auto">
                Next rep <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
