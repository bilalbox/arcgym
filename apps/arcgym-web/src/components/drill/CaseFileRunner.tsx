import {
  BOARD_DOMAIN_LABELS,
  type CaseFileDrillDefinition,
  type ConfidenceAnchor,
  caseSessionReducer,
  createCaseSessionState,
  type DrillAttemptRecord,
  type DrillFormat,
  getCurrentCaseStation,
  optionSeed,
  orderOptions,
  type StepAttemptTelemetry,
  safeCitationHref,
} from '@arcgym/drill-core';
import { ArrowRight, CheckCircle2, Lock, RotateCcw, XCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, type ConfidenceLevel } from './ConfidenceGate';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';

export interface CaseFileRunnerProps {
  drill: CaseFileDrillDefinition;
  isReviewMode?: boolean;
  previousAttempt?: DrillAttemptRecord;
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
  onDrillComplete,
  onNextDrill,
}) => {
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [session, dispatch] = useReducer(caseSessionReducer, drill, createCaseSessionState);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset when drill id changes
  useEffect(() => {
    dispatch({ type: 'RESET_SESSION' });
    setSelectedConfidence(null);
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
          <Button
            onClick={() => dispatch({ type: 'BEGIN_STATIONS' })}
            className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
          >
            Begin <ArrowRight className="h-4 w-4" />
          </Button>
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

  const budgetLeft = current.station.probeBudget - current.selectedProbeIds.length;
  const unlocked = current.station.probes.filter((p) => current.selectedProbeIds.includes(p.id));
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
        {(session.phase === 'probes' || current.probesLocked) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-miro-slate">
                Probes
              </h3>
              <Badge variant="outline" className="text-[11px] font-mono">
                {budgetLeft} / {current.station.probeBudget}
              </Badge>
            </div>
            <div className="space-y-2">
              {orderedProbes.map((probe) => {
                const selected = current.selectedProbeIds.includes(probe.id);
                const disabled = current.probesLocked || (!selected && budgetLeft <= 0);
                return (
                  <button
                    key={probe.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => dispatch({ type: 'TOGGLE_PROBE', probeId: probe.id })}
                    className={`w-full text-left rounded-xl border px-3.5 py-3 text-sm transition-colors ${
                      selected
                        ? 'border-miro-primary bg-miro-surface text-miro-primary'
                        : 'border-miro-hairline bg-miro-card text-miro-slate hover:border-miro-hairlineStrong'
                    } ${disabled && !selected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="font-medium">{probe.label}</span>
                  </button>
                );
              })}
            </div>
            {session.phase === 'probes' && (
              <Button
                onClick={() => dispatch({ type: 'LOCK_PROBES' })}
                disabled={current.selectedProbeIds.length === 0}
                className="w-full gap-2"
              >
                <Lock className="h-4 w-4" /> Lock probes
              </Button>
            )}
          </div>
        )}

        {current.probesLocked && unlocked.length > 0 && (
          <div className="rounded-xl border border-miro-hairline bg-miro-surface p-3.5 space-y-2.5">
            {unlocked.map((probe) => (
              <div key={probe.id} className="text-sm">
                <p className="font-medium text-miro-primary">{probe.label}</p>
                <p className="text-miro-slate mt-0.5">{probe.answer}</p>
              </div>
            ))}
          </div>
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
                <Button
                  onClick={() => {
                    setSelectedConfidence(null);
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
