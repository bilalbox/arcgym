import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import {
  ArcGymScoringEngine,
  ConfidenceAnchor,
  RapidFireDrillDefinition,
  DrillFormat,
  DrillAttemptRecord,
  safeCitationHref,
  orderOptions,
  optionSeed,
} from '@arcgym/drill-core';
import { CheckCircle2, XCircle, ExternalLink, ArrowRight, RotateCcw } from 'lucide-react';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';

interface StepResult {
  stepId: string;
  selectedOptionId: string;
  confidence: number;
  isCorrect: boolean;
  score: number;
}

export const RapidFireRunner: React.FC<{
  drill: RapidFireDrillDefinition;
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
  onNextDrill?: () => void;
}> = ({
  drill,
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
  const orderedOptions = useMemo(
    () => orderOptions(currentStep.options, optionSeed(drill.id, currentStep.id)),
    [drill.id, currentStep]
  );
  const progressPercent = Math.round(((currentStepIndex + (isSubmitted ? 1 : 0)) / drill.steps.length) * 100);
  const correctCitationHref = safeCitationHref(
    currentStep.options.find((o) => o.isCorrect)?.citationUrl
  );

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
    if (currentStepIndex + 1 < drill.steps.length) {
      setCurrentStepIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setSelectedConfidence(null);
      setIsSubmitted(false);
    } else {
      setIsCompleted(true);

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
        steps: stepResults.map((r) => ({
          stepId: r.stepId,
          confidence: (r.confidence / 100) as ConfidenceAnchor,
          isCorrect: r.isCorrect,
          score: r.score,
          selectedOptionId: r.selectedOptionId,
          distractorAntipattern: r.isCorrect
            ? undefined
            : drill.steps
                .find((s) => s.id === r.stepId)
                ?.options.find((o) => o.id === r.selectedOptionId)?.distractorAntipattern,
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
          <h2 className="text-xl sm:text-2xl font-medium text-miro-primary">Drill completed</h2>
          <p className="text-sm text-miro-slate mt-1">
            You committed all {drill.steps.length} architectural decision reps for today.
          </p>
          <div className="flex items-center justify-center mt-3">
            <DrillFeedbackWidget drillId={drill.id} />
          </div>
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
                {stepResults.filter((r) => r.isCorrect).length} / {drill.steps.length}
              </p>
            </div>
            <div>
              <span className="text-xs text-miro-slate font-medium">Avg confidence</span>
              <p className="text-2xl font-medium text-miro-primary mt-0.5">
                {Math.round(stepResults.reduce((acc, r) => acc + r.confidence, 0) / stepResults.length)}%
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-miro-slate">Decision breakdown</h4>
            {stepResults.map((r, i) => (
              <div
                key={r.stepId}
                className="flex items-center justify-between p-3 rounded-xl border border-miro-hairline bg-miro-card text-sm"
              >
                <div className="flex items-center gap-2.5">
                  {r.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-miro-successText shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-miro-dangerText shrink-0" />
                  )}
                  <span className="font-medium text-miro-primary">Rep {i + 1}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={r.isCorrect ? 'success' : 'destructive'}>
                    {r.confidence}% confidence
                  </Badge>
                  <span className={`font-mono text-xs font-semibold ${r.score >= 0 ? 'text-miro-successText' : 'text-miro-dangerText'}`}>
                    {r.score >= 0 ? `+${r.score}` : r.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>

          {isReviewMode && previousAttempt && (
            <div className="p-3 bg-miro-yellowLight border border-miro-yellowBorder rounded-xl text-xs text-miro-yellowText flex items-center justify-between">
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
                className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
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
    <Card className="border-miro-hairline bg-miro-card shadow-xs">
      <CardHeader className="pb-4 border-b border-miro-hairlineSoft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="domain">{drill.domainLabel}</Badge>
            {(drill.pillars || []).map((p) => (
              <Badge key={p} variant="pillar">
                {p}
              </Badge>
            ))}
            {isReviewMode && (
              <Badge variant="outline" className="bg-miro-yellowLight text-miro-yellowText border-miro-yellowBorder">
                Review Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <DrillFeedbackWidget drillId={drill.id} />
            <span className="text-xs text-miro-slate font-medium">
              Rep {currentStepIndex + 1} of {drill.steps.length}
            </span>
          </div>
        </div>
        <Progress value={progressPercent} className="mt-3 h-1 bg-miro-hairlineSoft" indicatorClassName="bg-miro-primary" />
      </CardHeader>

      <CardContent className="pt-6">
        <h2 className="text-base sm:text-lg font-medium text-miro-primary leading-relaxed mb-6">
          {currentStep.prompt}
        </h2>

        <div className="space-y-3 mb-6">
          {orderedOptions.map((opt, index) => {
            const isSelected = selectedOptionId === opt.id;
            let containerStyle = 'border-miro-hairline hover:border-miro-hairlineStrong bg-miro-card';

            if (isSubmitted) {
              if (opt.isCorrect) {
                containerStyle = 'border-2 border-miro-successText bg-miro-successLight text-miro-primary';
              } else if (isSelected && !opt.isCorrect) {
                containerStyle = 'border-2 border-miro-dangerText bg-miro-dangerLight text-miro-primary';
              } else {
                containerStyle = 'border-miro-hairline opacity-45 bg-miro-card';
              }
            } else if (isSelected) {
              containerStyle = 'border-2 border-miro-primary bg-miro-surfaceSoft text-miro-primary';
            }

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer text-sm leading-normal flex items-start gap-3.5 ${containerStyle}`}
              >
                <div className="mt-0.5 shrink-0">
                  {isSubmitted && opt.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-miro-successText" />
                  ) : isSubmitted && isSelected && !opt.isCorrect ? (
                    <XCircle className="h-5 w-5 text-miro-dangerText" />
                  ) : (
                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs font-semibold ${
                        isSelected ? 'border-miro-primary bg-miro-primary text-miro-onPrimary' : 'border-miro-hairlineStrong text-miro-muted'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-normal text-miro-primary">{opt.label}</p>
                  {isSubmitted && opt.distractorAntipattern && (
                    <div className="mt-2.5 text-xs text-miro-dangerText bg-miro-dangerLight border border-miro-dangerBorder p-2.5 rounded-lg space-y-1.5">
                      <p>
                        <span className="font-semibold">Antipattern risk:</span> {opt.distractorAntipattern}
                      </p>
                      {isSelected && <p className="text-xs sm:text-sm leading-relaxed">{opt.rationale}</p>}
                    </div>
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
                <span className="text-xs text-miro-slate">
                  Confidence: {selectedConfidence}%
                </span>
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
                Next rep <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
