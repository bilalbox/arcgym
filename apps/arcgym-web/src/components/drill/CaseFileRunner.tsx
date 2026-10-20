import {
  BOARD_DOMAIN_LABELS,
  type CaseFileDrillDefinition,
  type ConfidenceAnchor,
  caseSessionReducer,
  createCaseSessionState,
  type DrillAttemptRecord,
  type DrillFormat,
  getCurrentCaseStation,
  getEstablishedDecisions,
  optionSeed,
  orderOptions,
  type StepAttemptTelemetry,
  safeCitationHref,
} from '@arcgym/drill-core';
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, type ConfidenceLevel } from './ConfidenceGate';
import { DrillAuthGate } from './DrillAuthGate';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';
import { FirstCallPanel } from './FirstCallPanel';
import { ProbeBudgetPanel } from './ProbeBudgetPanel';

export interface CaseFileRunnerProps {
  drill: CaseFileDrillDefinition;
  isReviewMode?: boolean;
  previousAttempt?: DrillAttemptRecord;
  isAuthenticated?: boolean;
  onSignInGoogle?: (returnUrl?: string) => void;
  onSignInGithub?: (returnUrl?: string) => void;
  onDrillComplete?: (result: {
    drillId: string;
    format: DrillFormat;
    score: number;
    accuracy: number;
    streakDays: number;
    steps?: StepAttemptTelemetry[];
  }) => void;
  onNextDrill?: () => void;
}

export const CaseFileRunner: React.FC<CaseFileRunnerProps> = ({
  drill,
  isReviewMode = false,
  previousAttempt,
  isAuthenticated = true,
  onSignInGoogle,
  onSignInGithub,
  onDrillComplete,
  onNextDrill,
}) => {
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [firstCallHypothesis, setFirstCallHypothesis] = useState('');
  const [firstCallConfidence, setFirstCallConfidence] = useState<ConfidenceLevel | null>(null);
  const [session, dispatch] = useReducer(caseSessionReducer, drill, createCaseSessionState);
  const canSkipFirstCall = drill.difficulty === 'Associate_Domain_Architect';

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset when drill id changes
  useEffect(() => {
    dispatch({ type: 'RESET_SESSION' });
    setSelectedConfidence(null);
    setFirstCallHypothesis('');
    setFirstCallConfidence(null);
  }, [drill.id]);

  const current = getCurrentCaseStation(session);
  const completedRef = useRef(false);

  useEffect(() => {
    if (session.isCompleted && session.attempt && !completedRef.current) {
      completedRef.current = true;
      onDrillComplete?.({
        drillId: drill.id,
        format: 'Case_File',
        score: session.totalScore,
        accuracy: session.accuracy,
        streakDays: 0,
        steps: session.attempt.steps,
      });
    } else if (!session.isCompleted) {
      completedRef.current = false;
    }
  }, [
    session.isCompleted,
    session.attempt,
    session.totalScore,
    session.accuracy,
    drill.id,
    onDrillComplete,
  ]);

  const orderedOptions = useMemo(() => {
    if (!current) return [];
    return orderOptions(current.station.options, optionSeed(drill.id, current.station.id));
  }, [current, drill.id]);

  const orderedProbes = useMemo(() => {
    if (!current) return [];
    return orderOptions(
      current.station.probes,
      optionSeed(drill.id, `probes:${current.station.id}`),
    );
  }, [current, drill.id]);

  const stationCount = session.stations.length;
  const progressPercent = Math.round(
    ((session.currentStationIndex + (current?.isSubmitted ? 1 : 0)) / Math.max(stationCount, 1)) *
      100,
  );

  if (session.phase === 'brief') {
    return (
      <Card className="border-miro-hairline bg-miro-card shadow-xs">
        <CardHeader className="space-y-2 pb-3">
          <h2 className="text-xl font-medium text-miro-primary tracking-tight">
            {drill.brief.title}
          </h2>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-miro-hairline bg-miro-surface p-4 text-sm text-miro-primary leading-relaxed whitespace-pre-wrap">
            {drill.brief.synopsis}
          </div>
          {isAuthenticated ? (
            <Button
              onClick={() => dispatch({ type: 'BEGIN_STATIONS' })}
              className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
            >
              Begin <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <DrillAuthGate
              title="Sign in to begin this CTA Case File"
              description="Review architecture stations, uncover facts with your probe budget, and commit board recommendations. Free with an account."
              onSignInGoogle={onSignInGoogle}
              onSignInGithub={onSignInGithub}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  if (session.isCompleted) {
    const correctCount = session.stations.filter((s) => s.isCorrect).length;
    return (
      <Card className="border-miro-hairline bg-miro-card shadow-xs">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-miro-successLight text-miro-successText">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-miro-primary">Complete</h2>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="grid grid-cols-3 gap-3 text-center p-4 bg-miro-surface rounded-2xl border border-miro-hairlineSoft">
            <div>
              <span className="text-xs text-miro-slate font-medium">Score</span>
              <p className="text-2xl font-medium text-miro-primary mt-0.5">{session.totalScore}</p>
            </div>
            <div>
              <span className="text-xs text-miro-slate font-medium">Correct</span>
              <p className="text-2xl font-medium text-miro-successText mt-0.5">
                {correctCount} / {stationCount}
              </p>
            </div>
            <div>
              <span className="text-xs text-miro-slate font-medium">Discovery</span>
              <p
                className={`text-sm font-medium mt-1.5 ${
                  session.discoveryFailure ? 'text-miro-dangerText' : 'text-miro-successText'
                }`}
              >
                {session.discoveryFailure ? 'Missed pivotal' : 'Pivotal hit'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {session.stations.map((s, i) => (
              <div
                key={s.station.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-miro-hairline bg-miro-card text-sm gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {s.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-miro-successText shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-miro-dangerText shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-miro-primary text-xs">
                        Station {i + 1}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-2">
                        {BOARD_DOMAIN_LABELS[s.station.boardDomain]}
                      </Badge>
                      {s.missedAllPivotal && (
                        <Badge variant="destructive" className="text-[10px] py-0 px-2">
                          Discovery miss
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-miro-slate mt-0.5">
                      Probe {s.probeScore ?? 0} · Rec {s.recommendationScore ?? 0}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-xs font-semibold ${
                    (s.stationScore ?? 0) >= 0 ? 'text-miro-successText' : 'text-miro-dangerText'
                  }`}
                >
                  {(s.stationScore ?? 0) >= 0 ? `+${s.stationScore}` : s.stationScore} pts
                </span>
              </div>
            ))}
          </div>

          {isReviewMode && previousAttempt && (
            <div className="p-3 bg-miro-yellowLight border border-miro-yellowBorder rounded-xl text-xs text-miro-yellowText flex items-center justify-between">
              <span>
                Previously completed on {new Date(previousAttempt.completedAt).toLocaleDateString()}
              </span>
              <span className="font-semibold">Prior score: +{previousAttempt.score} pts</span>
            </div>
          )}

          <DrillFeedbackWidget drillId={drill.id} />

          <div className="flex flex-col gap-2.5 pt-1">
            {onNextDrill && (
              <Button
                onClick={onNextDrill}
                className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={() => {
                setSelectedConfidence(null);
                setFirstCallHypothesis('');
                setFirstCallConfidence(null);
                dispatch({ type: 'RESET_SESSION' });
              }}
              variant="secondary"
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Practice again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!current) return null;

  const establishedDecisions = getEstablishedDecisions(session);

  const correctCitationHref = safeCitationHref(
    current.station.options.find((o) => o.isCorrect)?.citationUrl,
  );

  return (
    <Card className="border-miro-hairline bg-miro-card shadow-xs">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[11px]">
              Station {session.currentStationIndex + 1} / {stationCount}
            </Badge>
            <Badge variant="domain" className="text-[11px]">
              {BOARD_DOMAIN_LABELS[current.station.boardDomain]}
            </Badge>
          </div>
          <span className="text-xs font-mono text-miro-muted">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
        <h2 className="text-base sm:text-lg font-medium text-miro-primary leading-snug">
          {current.station.prompt}
        </h2>
      </CardHeader>

      <CardContent className="space-y-5">
        {establishedDecisions.length > 0 && (
          <div className="rounded-xl border border-miro-hairline bg-miro-surfaceSoft p-3.5 text-xs space-y-1.5">
            <div className="font-semibold uppercase tracking-wider text-miro-slate text-[11px]">
              Decisions so far
            </div>
            <ul className="space-y-1 text-miro-primary">
              {establishedDecisions.map((decisionLabel, idx) => (
                <li key={decisionLabel} className="flex items-start gap-1.5">
                  <span className="text-miro-muted font-mono shrink-0">Station {idx + 1}:</span>
                  <span>{decisionLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {current.station.exhibits && current.station.exhibits.length > 0 && (
          <div className="space-y-3">
            {current.station.exhibits.map((exhibit) => (
              <figure
                key={exhibit.diagramUrl}
                className="rounded-xl border border-miro-hairline bg-miro-surface overflow-hidden"
              >
                <img src={exhibit.diagramUrl} alt={exhibit.label} className="w-full h-auto" />
                <figcaption className="px-3.5 py-2 text-xs text-miro-slate border-t border-miro-hairline bg-miro-card">
                  {exhibit.label}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {session.phase === 'first_call' && (
          <FirstCallPanel
            submitLabel="Lock"
            canSkip={canSkipFirstCall}
            hypothesis={firstCallHypothesis}
            onHypothesisChange={setFirstCallHypothesis}
            confidence={firstCallConfidence}
            onConfidenceChange={setFirstCallConfidence}
            onSubmit={(hypothesis, confidence) => {
              dispatch({ type: 'SUBMIT_FIRST_CALL', hypothesis, confidence });
              setFirstCallHypothesis('');
              setFirstCallConfidence(null);
            }}
            onSkip={() => {
              dispatch({ type: 'SKIP_FIRST_CALL' });
              setFirstCallHypothesis('');
              setFirstCallConfidence(null);
            }}
          />
        )}

        {(session.phase === 'probes' || current.probesLocked) && (
          <ProbeBudgetPanel
            probes={orderedProbes}
            selectedProbeIds={current.selectedProbeIds}
            probesLocked={current.probesLocked}
            probeBudget={current.station.probeBudget}
            onToggleProbe={(probeId) => dispatch({ type: 'TOGGLE_PROBE', probeId })}
            onLockProbes={() => dispatch({ type: 'LOCK_PROBES' })}
          />
        )}

        {(session.phase === 'commit' || session.phase === 'feedback') && (
          <div className="space-y-3">
            <div className="space-y-2">
              {orderedOptions.map((option) => {
                const selected = current.selectedOptionId === option.id;
                const showResult = current.isSubmitted;
                const isCorrect = option.isCorrect;
                let className =
                  'w-full text-left rounded-xl border px-3.5 py-3 text-sm transition-colors cursor-pointer ';
                if (showResult && isCorrect) {
                  className += 'border-miro-successBorder bg-miro-successLight text-miro-primary';
                } else if (showResult && selected && !isCorrect) {
                  className += 'border-miro-dangerBorder bg-miro-dangerLight text-miro-primary';
                } else if (selected) {
                  className += 'border-miro-primary bg-miro-surface text-miro-primary';
                } else {
                  className +=
                    'border-miro-hairline bg-miro-card text-miro-slate hover:border-miro-hairlineStrong';
                }
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={current.isSubmitted}
                    onClick={() => dispatch({ type: 'SELECT_OPTION', optionId: option.id })}
                    className={className}
                  >
                    <span className="font-medium">{option.label}</span>
                    {showResult && selected && (
                      <p className="text-xs text-miro-slate mt-1.5">{option.rationale}</p>
                    )}
                    {showResult && selected && !isCorrect && option.distractorAntipattern && (
                      <Badge variant="destructive" className="mt-2 text-[10px]">
                        {option.distractorAntipattern}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {session.phase === 'commit' && (
              <ConfidenceGate
                selectedConfidence={selectedConfidence}
                onSelectConfidence={setSelectedConfidence}
                hasSelectedAnswer={Boolean(current.selectedOptionId)}
                onSubmit={() => {
                  if (!selectedConfidence || !current.selectedOptionId) return;
                  dispatch({
                    type: 'COMMIT_CONFIDENCE',
                    confidence: (selectedConfidence / 100) as ConfidenceAnchor,
                  });
                }}
                submitLabel="Commit"
              />
            )}

            {session.phase === 'feedback' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-miro-hairline bg-miro-surface p-3.5 text-sm space-y-1.5">
                  <p className="font-medium text-miro-primary">
                    {current.stationScore ?? 0} pts · probe {current.probeScore ?? 0} · rec{' '}
                    {current.recommendationScore ?? 0}
                  </p>
                  {current.missedAllPivotal && (
                    <p className="text-miro-dangerText text-xs">Missed pivotal probes</p>
                  )}
                  {correctCitationHref && (
                    <a
                      href={correctCitationHref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-miro-blue hover:underline"
                    >
                      Citation
                    </a>
                  )}
                </div>

                {(() => {
                  const first = current.firstCall;
                  if (!first) return null;
                  const firstLabel = first.skipped ? 'Skipped' : first.hypothesis?.trim() || '—';
                  const finalLabel =
                    current.station.options.find((o) => o.id === current.selectedOptionId)?.label ??
                    '—';
                  const discoveryProbe = current.flippingProbeId
                    ? current.station.probes.find((p) => p.id === current.flippingProbeId)
                    : null;
                  return (
                    <div className="rounded-xl border border-miro-hairline bg-miro-card p-3.5 text-sm space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-miro-slate">
                        First Call → Final
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[11px] text-miro-muted font-medium">
                            First Call
                          </span>
                          <p className="text-miro-primary mt-0.5">{firstLabel}</p>
                        </div>
                        <div>
                          <span className="text-[11px] text-miro-muted font-medium">Final</span>
                          <p className="text-miro-primary mt-0.5">{finalLabel}</p>
                        </div>
                      </div>
                      {discoveryProbe && (
                        <div className="rounded-lg border border-miro-blue/30 bg-miro-blue/5 px-3 py-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-miro-blue">
                            Discovery
                          </span>
                          <p className="text-miro-primary mt-0.5">{discoveryProbe.label}</p>
                          <p className="text-xs text-miro-slate mt-1">{discoveryProbe.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <Button
                  onClick={() => {
                    setSelectedConfidence(null);
                    setFirstCallHypothesis('');
                    setFirstCallConfidence(null);
                    dispatch({ type: 'ADVANCE_STATION' });
                  }}
                  className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary"
                >
                  {session.currentStationIndex + 1 >= stationCount ? 'Finish' : 'Next'}{' '}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
