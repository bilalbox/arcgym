import {
  type ConfidenceAnchor,
  citationHostname,
  contrastPrincipleForRound,
  createPracticeSessionState,
  type DrillAttemptRecord,
  type DrillFormat,
  getCurrentRep,
  getRoundCompletionResult,
  isRepRevealed,
  optionSeed,
  orderOptions,
  type PracticeSessionState,
  practiceSessionReducer,
  type RapidFireDrillDefinition,
  type RoundCompletionResult,
  type StepAttemptTelemetry,
  safeCitationHref,
} from '@arcgym/drill-core';
import { ArrowRight, CheckCircle2, Expand, ExternalLink, RotateCcw, XCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
import { GithubIcon, GoogleIcon } from '@/components/ui/icons';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, type ConfidenceLevel } from './ConfidenceGate';
import { DrillAuthGate } from './DrillAuthGate';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';

export interface RapidFireRunnerProps {
  drill?: RapidFireDrillDefinition;
  drills?: RapidFireDrillDefinition[];
  isReviewMode?: boolean;
  previousAttempt?: DrillAttemptRecord;
  onRoundComplete?: (result: RoundCompletionResult) => void;
  onRapidFireComplete?: (result: {
    attempts: DrillAttemptRecord[];
    totalScore: number;
    accuracy: number;
  }) => void;
  onDrillComplete?: (result: {
    drillId: string;
    format: DrillFormat;
    score: number;
    accuracy: number;
    streakDays: number;
    steps?: StepAttemptTelemetry[];
  }) => void;
  onNextDrill?: () => void;
  isAuthenticated?: boolean;
  isTrialExhausted?: boolean;
  onSignIn?: () => void;
  onSignInGoogle?: () => void;
  onSignInGithub?: () => void;
}

export const RapidFireRunner: React.FC<RapidFireRunnerProps> = ({
  drill,
  drills,
  isReviewMode = false,
  previousAttempt,
  onRoundComplete,
  onRapidFireComplete,
  onDrillComplete,
  onNextDrill,
  isAuthenticated = false,
  isTrialExhausted = false,
  onSignIn,
  onSignInGoogle,
  onSignInGithub,
}) => {
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [inspectDiagram, setInspectDiagram] = useState<{
    url: string;
    label: string;
  } | null>(null);
  const [completedSession, setCompletedSession] = useState<PracticeSessionState | null>(null);

  // Normalize drills into a list (supports both set workout and solo drill navigation)
  const drillList = useMemo(() => {
    if (drills && drills.length > 0) return drills;
    if (drill) return [drill];
    return [];
  }, [drills, drill]);

  const sessionKey = useMemo(() => {
    return drillList.map((d) => d.id).join(':') || 'empty';
  }, [drillList]);

  const lastSessionKeyRef = useRef(sessionKey);

  const [session, dispatch] = useReducer(
    practiceSessionReducer,
    drillList,
    createPracticeSessionState,
  );

  // Reset session when drill list changes, but NOT while user is inspecting completed results
  useEffect(() => {
    if (completedSession) {
      return;
    }
    if (lastSessionKeyRef.current !== sessionKey) {
      lastSessionKeyRef.current = sessionKey;
      dispatch({ type: 'RESET_SESSION', drills: drillList });
      setSelectedConfidence(null);
      setInspectDiagram(null);
    }
  }, [sessionKey, completedSession, drillList]);

  const repList = session.reps;
  const currentStepIndex = session.currentRepIndex;
  const currentRep = getCurrentRep(session);
  const activeDrill = currentRep?.drill;
  const currentStep = currentRep?.step;
  const isSubmitted = currentRep?.isSubmitted ?? false;
  const hypercorrectionActive = currentRep?.hypercorrectionActive ?? false;
  const isRevealed = currentRep ? isRepRevealed(currentRep) : false;
  const selectedOptionId = currentRep?.selectedOptionId ?? null;
  const excludedOptionId = currentRep?.hypercorrectionExcludedOptionId;
  const isCompleted = session.isCompleted;

  // Track completion callback invocation to avoid double execution
  const completedRef = useRef(false);
  useEffect(() => {
    if (isCompleted && !completedRef.current) {
      completedRef.current = true;
      setCompletedSession(session);
      const result = getRoundCompletionResult(session);
      if (result) {
        onRoundComplete?.(result);
        onRapidFireComplete?.({
          attempts: result.attempts,
          totalScore: result.totalScore,
          accuracy: result.accuracy,
        });
        onDrillComplete?.({
          drillId: repList[0]?.drill.id ?? 'drill',
          format: 'Rapid_Fire',
          score: result.totalScore,
          accuracy: result.accuracy,
          streakDays: 1,
          steps: result.steps,
        });
      }
    } else if (!isCompleted && !completedSession) {
      completedRef.current = false;
    }
  }, [
    isCompleted,
    completedSession,
    session,
    onRoundComplete,
    onRapidFireComplete,
    onDrillComplete,
    repList,
  ]);

  const orderedOptions = useMemo(() => {
    if (!activeDrill || !currentStep) return [];
    return orderOptions(currentStep.options, optionSeed(activeDrill.id, currentStep.id));
  }, [activeDrill, currentStep]);

  const contrastPrinciple = useMemo(() => contrastPrincipleForRound(drillList), [drillList]);
  const isLastRep = currentStepIndex + 1 >= repList.length;
  const showContrastPrinciple = Boolean(isRevealed && isLastRep && contrastPrinciple);

  const progressPercent =
    repList.length > 0
      ? Math.round(((currentStepIndex + (isSubmitted ? 1 : 0)) / repList.length) * 100)
      : 0;

  const correctCitationUrl = currentStep?.options.find((o) => o.isCorrect)?.citationUrl;
  const correctCitationHref = safeCitationHref(correctCitationUrl);
  const correctCitationHost = citationHostname(correctCitationUrl);

  const handleSelectOption = (optionId: string) => {
    if (hypercorrectionActive) {
      if (optionId === excludedOptionId) return;
      dispatch({ type: 'RETRY_OPTION', optionId });
      return;
    }
    if (isSubmitted) return;
    dispatch({ type: 'SELECT_OPTION', optionId });
  };

  const handleSubmit = () => {
    if (!selectedOptionId || !selectedConfidence) return;
    const confidenceAnchor = (selectedConfidence / 100) as ConfidenceAnchor;
    dispatch({ type: 'COMMIT_CONFIDENCE', confidence: confidenceAnchor });
  };

  const handleSkipHypercorrection = () => {
    dispatch({ type: 'SKIP_HYPERCORRECTION' });
  };

  const handleNext = () => {
    setSelectedConfidence(null);
    dispatch({ type: 'ADVANCE_REP' });
  };

  const handleNextSet = () => {
    lastSessionKeyRef.current = sessionKey;
    setCompletedSession(null);
    setSelectedConfidence(null);
    setInspectDiagram(null);
    completedRef.current = false;
    dispatch({ type: 'RESET_SESSION', drills: drillList });
    onNextDrill?.();
  };

  const handleRestartCurrentSet = () => {
    const currentDrills = completedSession?.drills ?? drillList;
    setCompletedSession(null);
    setSelectedConfidence(null);
    setInspectDiagram(null);
    completedRef.current = false;
    dispatch({ type: 'RESET_SESSION', drills: currentDrills });
  };

  const isDisplayCompleted = Boolean(completedSession || isCompleted);
  const displaySession = completedSession ?? session;

  if (isDisplayCompleted) {
    const totalScore = displaySession.totalScore;
    const completionRepList = displaySession.reps;
    const correctCount = completionRepList.filter((r) => r.isCorrect).length;

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
            You committed all {completionRepList.length} architectural decision{' '}
            {completionRepList.length === 1 ? 'rep' : 'reps'}.
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
                {correctCount} / {completionRepList.length}
              </p>
            </div>
            <div>
              <span className="text-xs text-miro-slate font-medium">Avg confidence</span>
              <p className="text-2xl font-medium text-miro-primary mt-0.5">
                {completionRepList.length > 0
                  ? Math.round(
                      (completionRepList.reduce((acc, r) => acc + (r.committedConfidence ?? 0), 0) /
                        completionRepList.length) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-miro-slate">
              Decision breakdown ({completionRepList.length}{' '}
              {completionRepList.length === 1 ? 'rep' : 'reps'})
            </h4>
            {completionRepList.map((r, i) => {
              const repScore = r.score ?? 0;
              const repConf = Math.round((r.committedConfidence ?? 0) * 100);

              return (
                <div
                  key={`${r.drill.id}-${r.step.id}`}
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
                        {r.drill.domainLabel && (
                          <Badge variant="domain" className="text-[10px] py-0 px-2 shrink-0">
                            {r.drill.domainLabel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-miro-slate truncate mt-0.5">{r.drill.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <Badge variant={r.isCorrect ? 'success' : 'destructive'}>
                      {repConf}% confidence
                    </Badge>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        repScore >= 0 ? 'text-miro-successText' : 'text-miro-dangerText'
                      }`}
                    >
                      {repScore >= 0 ? `+${repScore}` : repScore} pts
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

          {!isAuthenticated && (onSignIn || onSignInGoogle || onSignInGithub) && (
            <div className="p-3.5 bg-miro-surfaceSoft border border-miro-hairline rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-miro-primary">
                  Save your streak across devices
                </span>
                <p className="text-miro-slate">
                  Sign in with Google or GitHub to sync your calibration telemetry and unlock
                  tomorrow's practice.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {(onSignInGoogle || onSignIn) && (
                  <Button
                    onClick={onSignInGoogle || onSignIn}
                    className="bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary text-xs font-semibold px-2.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <GoogleIcon className="h-3 w-3" />
                    <span>Google</span>
                  </Button>
                )}
                {onSignInGithub && (
                  <Button
                    onClick={onSignInGithub}
                    className="bg-miro-card border border-miro-hairline text-miro-primary hover:border-miro-hairlineStrong hover:bg-miro-surfaceSoft text-xs font-semibold px-2.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <GithubIcon className="h-3 w-3" />
                    <span>GitHub</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          <DrillFeedbackWidget drillId={completionRepList[0]?.drill.id ?? 'drill'} />

          <div className="flex flex-col gap-2.5 pt-1">
            {onNextDrill &&
              (isTrialExhausted && !isAuthenticated ? (
                <Button
                  onClick={onSignIn || onSignInGoogle}
                  className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium cursor-pointer"
                >
                  Sign in to unlock next set <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleNextSet}
                  className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
                >
                  Practice next Rapid Fire set <ArrowRight className="h-4 w-4" />
                </Button>
              ))}
            <Button onClick={handleRestartCurrentSet} variant="secondary" className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Practice this set again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeDrill || !currentStep || !currentRep) {
    return null;
  }

  const currentScore = currentRep.score;
  const matchedDistractor = hypercorrectionActive
    ? currentStep.options.find((o) => o.id === excludedOptionId)
    : undefined;

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
            const isExcluded = hypercorrectionActive && opt.id === excludedOptionId;
            const canRetry = hypercorrectionActive && !isExcluded;
            let containerStyle =
              'border-miro-hairline hover:border-miro-hairlineStrong bg-miro-card';

            if (hypercorrectionActive) {
              if (isExcluded) {
                containerStyle =
                  'border-2 border-miro-dangerText bg-miro-dangerLight text-miro-primary';
              } else {
                containerStyle =
                  'border-miro-hairline hover:border-miro-hairlineStrong bg-miro-card';
              }
            } else if (isRevealed) {
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

            const showAntipattern =
              (isRevealed && !opt.isCorrect && Boolean(opt.distractorAntipattern)) ||
              (isExcluded && Boolean(opt.distractorAntipattern));

            return (
              <div
                key={opt.id}
                className={`rounded-xl border ${containerStyle} flex items-stretch`}
              >
                <button
                  type="button"
                  disabled={isRevealed || isExcluded || (isSubmitted && !hypercorrectionActive)}
                  aria-pressed={isSelected}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`min-w-0 flex-1 text-left p-4 transition-all duration-150 cursor-pointer text-sm leading-normal flex items-start gap-3.5 disabled:cursor-default ${
                    opt.diagramUrl || showAntipattern ? 'pb-2.5' : ''
                  } ${canRetry ? 'hover:border-miro-primary' : ''}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isRevealed && opt.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-miro-successText" />
                    ) : (isRevealed && isSelected && !opt.isCorrect) || isExcluded ? (
                      <XCircle className="h-5 w-5 text-miro-dangerText" />
                    ) : (
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs font-semibold ${
                          isSelected && !hypercorrectionActive
                            ? 'border-miro-primary bg-miro-primary text-miro-onPrimary'
                            : 'border-miro-hairlineStrong text-miro-slate'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-normal text-miro-primary block">{opt.label}</span>

                    {showAntipattern && opt.distractorAntipattern && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-miro-surface border border-miro-hairlineSoft text-xs">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-miro-muted">
                          Antipattern:
                        </span>
                        <span className="font-medium text-miro-dangerText">
                          {opt.distractorAntipattern}
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                {opt.diagramUrl && (
                  <div className="shrink-0 flex items-start pt-3 pr-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInspectDiagram({
                          url: opt.diagramUrl as string,
                          label: `${String.fromCharCode(65 + index)}: ${opt.label}`,
                        });
                      }}
                      className="h-8 px-2 text-xs text-miro-slate hover:text-miro-primary flex items-center gap-1"
                    >
                      <Expand className="h-3.5 w-3.5" />
                      Inspect
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Universal Pre-Submit Confidence Gate or Auth Barrier */}
        {!isSubmitted && (
          <div className="pt-2">
            {isAuthenticated ? (
              <ConfidenceGate
                selectedConfidence={selectedConfidence}
                onSelectConfidence={setSelectedConfidence}
                onSubmit={handleSubmit}
                disabled={!selectedOptionId}
                hasSelectedAnswer={Boolean(selectedOptionId)}
              />
            ) : (
              <DrillAuthGate
                title="Sign in to commit your decision"
                description="Practice is 100% free. Sign in with Google or GitHub to submit your answer, unlock rationale and citations, and build your streak."
                onSignInGoogle={onSignInGoogle}
                onSignInGithub={onSignInGithub}
              />
            )}
          </div>
        )}

        {/* Hypercorrection Intercept: withhold correct option + rationale */}
        {hypercorrectionActive && matchedDistractor && (
          <div className="mt-6 pt-4 border-t border-miro-hairlineSoft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                  <XCircle className="h-3.5 w-3.5" /> Antipattern Detected
                </Badge>
                <span className="text-xs text-miro-slate">
                  Confidence: {Math.round((currentRep.committedConfidence ?? 0) * 100)}%
                </span>
              </div>
              <span className="text-sm font-mono font-semibold text-miro-primary">
                Score: {currentScore && currentScore > 0 ? '+' : ''}
                {currentScore} pts
              </span>
            </div>

            <div className="text-xs sm:text-sm text-miro-slate space-y-1.5">
              <p className="font-medium text-miro-primary">
                {matchedDistractor.distractorAntipattern}
              </p>
              <p className="leading-relaxed">{matchedDistractor.rationale}</p>
            </div>

            <div className="pt-3 border-t border-miro-hairlineSoft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-miro-slate">Choose another option, or skip.</p>
              <Button
                onClick={handleSkipHypercorrection}
                variant="secondary"
                className="w-full sm:w-auto gap-2 ml-auto"
              >
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Result & Architectural Rationale after reveal */}
        {isRevealed && (
          <div className="mt-6 pt-4 border-t border-miro-hairlineSoft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentRep.isCorrect ? (
                  <Badge variant="success" className="gap-1.5 px-3 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Well-Architected Choice
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                    <XCircle className="h-3.5 w-3.5" /> Antipattern Detected
                  </Badge>
                )}
                <span className="text-xs text-miro-slate">
                  Confidence: {Math.round((currentRep.committedConfidence ?? 0) * 100)}%
                </span>
              </div>
              <span className="text-sm font-mono font-semibold text-miro-primary">
                Score: {currentScore && currentScore > 0 ? '+' : ''}
                {currentScore} pts
              </span>
            </div>

            <div className="text-xs sm:text-sm text-miro-slate space-y-1.5">
              <p className="font-medium text-miro-primary">Architectural rationale:</p>
              <p className="leading-relaxed">
                {currentStep.options.find((o) => o.isCorrect)?.rationale}
              </p>
            </div>

            {showContrastPrinciple && contrastPrinciple && (
              <p className="text-sm text-miro-primary font-medium leading-relaxed border-l-2 border-miro-hairlineStrong pl-3">
                {contrastPrinciple}
              </p>
            )}

            <div className="pt-3 border-t border-miro-hairlineSoft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {correctCitationHref && correctCitationHost && (
                <a
                  href={correctCitationHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-miro-blue hover:text-miro-blueDeep font-medium flex items-center gap-1.5 underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View guidance on {correctCitationHost}
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
