import {
  ArcGymScoringEngine,
  type ConfidenceAnchor,
  type DrillAttemptRecord,
  type DrillFormat,
  optionSeed,
  orderOptions,
  type RapidFireDrillDefinition,
  safeCitationHref,
} from '@arcgym/drill-core';
import { ArrowRight, CheckCircle2, Expand, ExternalLink, RotateCcw, XCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, type ConfidenceLevel } from './ConfidenceGate';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';

interface StepResult {
  stepId: string;
  selectedOptionId: string;
  confidence: number;
  isCorrect: boolean;
  score: number;
}

export interface RapidFireRunnerProps {
  drill?: RapidFireDrillDefinition;
  drills?: RapidFireDrillDefinition[];
  isReviewMode?: boolean;
  previousAttempt?: DrillAttemptRecord;
  onDrillComplete?: (result: {
    drillId: string;
    format: DrillFormat;
    score: number;
    accuracy: number;
    streakDays: number;
    steps?: import('@arcgym/drill-core').StepAttemptTelemetry[];
  }) => void;
  onRapidFireComplete?: (result: {
    attempts: Array<{
      drillId: string;
      format: DrillFormat;
      score: number;
      accuracy: number;
      steps?: import('@arcgym/drill-core').StepAttemptTelemetry[];
    }>;
    totalScore: number;
    accuracy: number;
  }) => void;
  onNextDrill?: () => void;
}

export const RapidFireRunner: React.FC<RapidFireRunnerProps> = ({
  drill,
  drills,
  isReviewMode = false,
  previousAttempt,
  onDrillComplete,
  onRapidFireComplete,
  onNextDrill,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [inspectDiagram, setInspectDiagram] = useState<{
    url: string;
    label: string;
  } | null>(null);

  // Normalize into a sequence of reps (default 5 drills per rapid fire)
  const repList = useMemo(() => {
    if (drills && drills.length > 0) {
      return drills.map((d, index) => ({
        drill: d,
        step: d.steps[0] ?? {
          id: `step-${index}`,
          prompt: d.title,
          options: [],
        },
      }));
    }
    if (drill) {
      return drill.steps.map((step) => ({
        drill,
        step,
      }));
    }
    return [];
  }, [drills, drill]);

  const sessionKey = useMemo(() => {
    if (drills && drills.length > 0) {
      return drills.map((d) => d.id).join(':');
    }
    return drill?.id ?? 'default';
  }, [drills, drill]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset state when sessionKey changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setSelectedOptionId(null);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setStepResults([]);
    setIsCompleted(false);
    setInspectDiagram(null);
  }, [sessionKey]);

  const currentRep = repList[currentStepIndex] ?? repList[0];
  const activeDrill = currentRep?.drill;
  const currentStep = currentRep?.step;

  const orderedOptions = useMemo(() => {
    if (!activeDrill || !currentStep) return [];
    return orderOptions(currentStep.options, optionSeed(activeDrill.id, currentStep.id));
  }, [activeDrill?.id, currentStep, activeDrill]);

  const progressPercent =
    repList.length > 0
      ? Math.round(((currentStepIndex + (isSubmitted ? 1 : 0)) / repList.length) * 100)
      : 0;

  const correctCitationHref = safeCitationHref(
    currentStep?.options.find((o) => o.isCorrect)?.citationUrl,
  );

  if (!activeDrill || !currentStep) {
    return null;
  }

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
  };

  const handleNext = () => {
    if (currentStepIndex + 1 < repList.length) {
      setCurrentStepIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setSelectedConfidence(null);
      setIsSubmitted(false);
    } else {
      setIsCompleted(true);
      const totalPts = stepResults.reduce((acc, r) => acc + r.score, 0);
      const correctCount = stepResults.filter((r) => r.isCorrect).length;
      const accuracy = stepResults.length > 0 ? correctCount / stepResults.length : 0;

      const attempts = repList.map((rep, idx) => {
        const r = stepResults[idx];
        return {
          drillId: rep.drill.id,
          format: 'Rapid_Fire' as DrillFormat,
          score: r?.score ?? 0,
          accuracy: r?.isCorrect ? 1 : 0,
          steps: r
            ? [
                {
                  stepId: r.stepId,
                  confidence: (r.confidence / 100) as ConfidenceAnchor,
                  isCorrect: r.isCorrect,
                  score: r.score,
                  selectedOptionId: r.selectedOptionId,
                  distractorAntipattern: r.isCorrect
                    ? undefined
                    : rep.step.options.find((o) => o.id === r.selectedOptionId)
                        ?.distractorAntipattern,
                },
              ]
            : [],
        };
      });

      if (onRapidFireComplete) {
        onRapidFireComplete({
          attempts,
          totalScore: totalPts,
          accuracy,
        });
      }

      onDrillComplete?.({
        drillId: repList[0].drill.id,
        format: 'Rapid_Fire',
        score: totalPts,
        accuracy,
        streakDays: 1,
        steps: stepResults.map((r, idx) => ({
          stepId: r.stepId,
          confidence: (r.confidence / 100) as ConfidenceAnchor,
          isCorrect: r.isCorrect,
          score: r.score,
          selectedOptionId: r.selectedOptionId,
          distractorAntipattern: r.isCorrect
            ? undefined
            : repList[idx]?.step.options.find((o) => o.id === r.selectedOptionId)
                ?.distractorAntipattern,
        })),
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
      <Card className="border-miro-hairline bg-miro-card shadow-xs">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-miro-successLight text-miro-successText">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-miro-primary">
            Rapid Fire completed
          </h2>
          <p className="text-sm text-miro-slate mt-1">
            You committed all {repList.length} architectural decision reps for today.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="grid grid-cols-3 gap-3 text-center p-4 bg-miro-surface rounded-2xl border border-miro-hairlineSoft">
            <div>
              <span className="text-xs text-miro-slate font-medium">Total points</span>
              <p className="text-2xl font-medium text-miro-primary mt-0.5">{totalScore}</p>
            </div>
            <div>
              <span className="text-xs text-miro-slate font-medium">Decisions correct</span>
              <p className="text-2xl font-medium text-miro-successText mt-0.5">
                {stepResults.filter((r) => r.isCorrect).length} / {repList.length}
              </p>
            </div>
            <div>
              <span className="text-xs text-miro-slate font-medium">Avg confidence</span>
              <p className="text-2xl font-medium text-miro-primary mt-0.5">
                {stepResults.length > 0
                  ? Math.round(
                      stepResults.reduce((acc, r) => acc + r.confidence, 0) / stepResults.length,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-miro-slate">
              Decision breakdown ({repList.length} reps)
            </h4>
            {stepResults.map((r, i) => {
              const rep = repList[i];
              return (
                <div
                  key={`${rep?.drill.id ?? i}-${r.stepId}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-miro-hairline bg-miro-card text-sm gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {r.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-miro-successText shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-miro-dangerText shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-miro-primary text-xs shrink-0">
                          Rep {i + 1}
                        </span>
                        {rep?.drill.domainLabel && (
                          <Badge variant="domain" className="text-[10px] py-0 px-2 shrink-0">
                            {rep.drill.domainLabel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-miro-slate truncate mt-0.5">{rep?.drill.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <Badge variant={r.isCorrect ? 'success' : 'destructive'}>
                      {r.confidence}% confidence
                    </Badge>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        r.score >= 0 ? 'text-miro-successText' : 'text-miro-dangerText'
                      }`}
                    >
                      {r.score >= 0 ? `+${r.score}` : r.score} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {isReviewMode && previousAttempt && (
            <div className="p-3 bg-miro-yellowLight border border-miro-yellowBorder rounded-xl text-xs text-miro-yellowText flex items-center justify-between">
              <span>
                Review Practice: Previously mastered on{' '}
                {new Date(previousAttempt.completedAt).toLocaleDateString()}
              </span>
              <span className="font-semibold">Prior score: +{previousAttempt.score} pts</span>
            </div>
          )}

          <DrillFeedbackWidget drillId={repList[0]?.drill.id ?? 'drill'} />

          <div className="flex flex-col gap-2.5 pt-1">
            {onNextDrill && (
              <Button
                onClick={() => {
                  handleRestart();
                  onNextDrill();
                }}
                className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
              >
                Practice next Rapid Fire set <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={handleRestart} variant="secondary" className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Practice this set again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-miro-hairline bg-miro-card shadow-xs">
      <CardHeader className="pb-4 border-b border-miro-hairlineSoft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="domain">{activeDrill.domainLabel}</Badge>
            {(activeDrill.pillars || []).map((p) => (
              <Badge key={p} variant="pillar">
                {p}
              </Badge>
            ))}
            {isReviewMode && (
              <Badge
                variant="outline"
                className="bg-miro-yellowLight text-miro-yellowText border-miro-yellowBorder"
              >
                Review Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-miro-primary bg-miro-surfaceSoft px-2.5 py-1 rounded-full border border-miro-hairlineSoft">
              Rep {currentStepIndex + 1} of {repList.length}
            </span>
          </div>
        </div>
        <Progress
          value={progressPercent}
          className="mt-3 h-1 bg-miro-hairlineSoft"
          indicatorClassName="bg-miro-primary"
        />
      </CardHeader>

      <CardContent className="pt-6">
        <div className="mb-2">
          <span className="text-[11px] uppercase tracking-wider text-miro-muted font-medium">
            {activeDrill.title}
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-medium text-miro-primary leading-relaxed mb-6">
          {currentStep.prompt}
        </h2>

        <div className="space-y-3 mb-6">
          {orderedOptions.map((opt, index) => {
            const isSelected = selectedOptionId === opt.id;
            let containerStyle =
              'border-miro-hairline hover:border-miro-hairlineStrong bg-miro-card';

            if (isSubmitted) {
              if (opt.isCorrect) {
                containerStyle =
                  'border-2 border-miro-successText bg-miro-successLight text-miro-primary';
              } else if (isSelected && !opt.isCorrect) {
                containerStyle =
                  'border-2 border-miro-dangerText bg-miro-dangerLight text-miro-primary';
              } else {
                containerStyle = 'border-miro-hairline opacity-45 bg-miro-card';
              }
            } else if (isSelected) {
              containerStyle = 'border-2 border-miro-primary bg-miro-surfaceSoft text-miro-primary';
            }

            return (
              <div key={opt.id} className={`rounded-xl border ${containerStyle}`}>
                <button
                  type="button"
                  disabled={isSubmitted}
                  aria-pressed={isSelected}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 transition-all duration-150 cursor-pointer text-sm leading-normal flex items-start gap-3.5 disabled:cursor-default ${
                    opt.diagramUrl || (isSubmitted && opt.distractorAntipattern) ? 'pb-2.5' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isSubmitted && opt.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-miro-successText" />
                    ) : isSubmitted && isSelected && !opt.isCorrect ? (
                      <XCircle className="h-5 w-5 text-miro-dangerText" />
                    ) : (
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs font-semibold ${
                          isSelected
                            ? 'border-miro-primary bg-miro-primary text-miro-onPrimary'
                            : 'border-miro-hairlineStrong text-miro-muted'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                    )}
                  </div>
                  <p className="flex-1 font-normal text-miro-primary">{opt.label}</p>
                </button>

                {opt.diagramUrl && (
                  <div className="px-4 pb-3 pl-[3.375rem]">
                    <div className="relative rounded-lg border border-miro-hairlineSoft bg-miro-surface overflow-hidden">
                      <button
                        type="button"
                        disabled={isSubmitted}
                        aria-label={`Select ${opt.label}`}
                        onClick={() => handleSelectOption(opt.id)}
                        className="block w-full cursor-pointer disabled:cursor-default"
                      >
                        <img
                          src={opt.diagramUrl}
                          alt={`${opt.label} topology preview`}
                          className="w-full h-auto max-h-48 object-contain bg-miro-card"
                        />
                      </button>
                      {isSubmitted && (
                        <div className="absolute inset-x-0 top-0 flex justify-center p-2 pointer-events-none">
                          {opt.isCorrect ? (
                            <Badge variant="success" className="gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Well-Architected
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1.5">
                              <XCircle className="h-3.5 w-3.5" /> Antipattern
                              {opt.distractorAntipattern ? `: ${opt.distractorAntipattern}` : ''}
                            </Badge>
                          )}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2 h-7 gap-1.5 px-2 text-xs"
                        onClick={() => {
                          const url = opt.diagramUrl;
                          if (url) setInspectDiagram({ url, label: opt.label });
                        }}
                      >
                        <Expand className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
                    </div>
                  </div>
                )}

                {isSubmitted && opt.distractorAntipattern && (
                  <div className="px-4 pb-4 pl-[3.375rem]">
                    <div className="text-xs text-miro-dangerText bg-miro-dangerLight border border-miro-dangerBorder p-2.5 rounded-lg space-y-1.5">
                      <p>
                        <span className="font-semibold">Antipattern risk:</span>{' '}
                        {opt.distractorAntipattern}
                      </p>
                      {isSelected && (
                        <p className="text-xs sm:text-sm leading-relaxed">{opt.rationale}</p>
                      )}
                    </div>
                  </div>
                )}
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
                <span className="text-xs text-miro-slate">Confidence: {selectedConfidence}%</span>
              </div>
              <span className="text-sm font-mono font-semibold text-miro-primary">
                Score: {stepResults[stepResults.length - 1]?.score > 0 ? '+' : ''}
                {stepResults[stepResults.length - 1]?.score} pts
              </span>
            </div>

            <div className="text-xs sm:text-sm text-miro-slate space-y-1.5">
              <p className="font-medium text-miro-primary">Architectural rationale:</p>
              <p className="leading-relaxed">
                {currentStep.options.find((o) => o.isCorrect)?.rationale}
              </p>
            </div>

            <div className="pt-3 border-t border-miro-hairlineSoft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {correctCitationHref && (
                <a
                  href={correctCitationHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-miro-blue hover:text-miro-blueDeep font-medium flex items-center gap-1.5 underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View guidance on architect.salesforce.com
                </a>
              )}
              <Button onClick={handleNext} className="w-full sm:w-auto gap-2 ml-auto">
                {currentStepIndex + 1 < repList.length ? (
                  <>
                    Next rep ({currentStepIndex + 2} of {repList.length}){' '}
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Complete Rapid Fire <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog
        open={inspectDiagram !== null}
        onOpenChange={(open) => {
          if (!open) setInspectDiagram(null);
        }}
      >
        <DialogContent className="max-w-4xl w-[calc(100%-2rem)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{inspectDiagram?.label ?? 'Topology'}</DialogTitle>
            <DialogDescription>Full-size architecture topology preview.</DialogDescription>
          </DialogHeader>
          {inspectDiagram && (
            <img
              src={inspectDiagram.url}
              alt={`${inspectDiagram.label} topology`}
              className="w-full h-auto max-h-[75vh] object-contain rounded-lg border border-miro-hairlineSoft bg-miro-card"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
