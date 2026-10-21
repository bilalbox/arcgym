import {
  type ClientTroubleshootingDrillDefinition,
  type ConfidenceAnchor,
  createTroubleshootSessionState,
  type DrillAttemptRecord,
  type DrillFormat,
  optionSeed,
  orderOptions,
  type StepAttemptTelemetry,
  safeCitationHref,
  troubleshootSessionReducer,
} from '@arcgym/drill-core';
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { gradeCauseViaApi } from '@/lib/gradeCauseApi';
import { ConfidenceGate, type ConfidenceLevel } from './ConfidenceGate';
import { DrillAuthGate } from './DrillAuthGate';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';
import { ProbeBudgetPanel } from './ProbeBudgetPanel';

export interface TroubleshootRunnerProps {
  drill: ClientTroubleshootingDrillDefinition;
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

export const TroubleshootRunner: React.FC<TroubleshootRunnerProps> = ({
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
  const [selectedFixConfidence, setSelectedFixConfidence] = useState<ConfidenceLevel | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [session, dispatch] = useReducer(
    troubleshootSessionReducer,
    drill,
    createTroubleshootSessionState,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset when drill id changes
  useEffect(() => {
    dispatch({ type: 'RESET_SESSION' });
    setSelectedConfidence(null);
    setSelectedFixConfidence(null);
    setGradeError(null);
  }, [drill.id]);

  const completedRef = useRef(false);

  useEffect(() => {
    if (session.isCompleted && session.attempt && !completedRef.current) {
      completedRef.current = true;
      const causeCorrect = session.isCorrect ? 1 : 0;
      const fixCorrect = session.isFixCorrect ? 1 : 0;
      const accuracy = (causeCorrect + fixCorrect) / 2;
      onDrillComplete?.({
        drillId: drill.id,
        format: 'Troubleshooting',
        score: session.totalScore,
        accuracy,
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
    session.isCorrect,
    session.isFixCorrect,
    drill.id,
    onDrillComplete,
  ]);

  const orderedProbes = useMemo(
    () => orderOptions(drill.probes, optionSeed(drill.id, 'probes')),
    [drill],
  );

  const orderedFixOptions = useMemo(() => {
    if (!session.fix) return [];
    return orderOptions(session.fix.options, optionSeed(drill.id, 'fix'));
  }, [session.fix, drill.id]);

  const causeCitationHref = safeCitationHref(session.grade?.goldCitationUrl);
  const goldFixOption = session.fix?.options.find((o) => o.isCorrect);
  const fixCitationHref = safeCitationHref(goldFixOption?.citationUrl);

  const commitCause = async () => {
    if (!selectedConfidence || grading) return;
    setGrading(true);
    setGradeError(null);
    try {
      const response = await gradeCauseViaApi(drill.id, session.causeText);
      const { fix, ...grade } = response;
      dispatch({
        type: 'RECEIVE_CAUSE_GRADE',
        confidence: (selectedConfidence / 100) as ConfidenceAnchor,
        grade,
        fix,
      });
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : 'Grading failed');
    } finally {
      setGrading(false);
    }
  };

  if (session.phase === 'brief') {
    return (
      <Card className="border-miro-hairline bg-miro-card shadow-xs">
        <CardContent className="space-y-5 pt-6">
          <div className="rounded-xl border border-miro-hairline bg-miro-surface p-4 text-sm text-miro-primary leading-relaxed whitespace-pre-wrap">
            {drill.architecture.synopsis}
          </div>
          <figure className="rounded-xl border border-miro-hairline bg-miro-surface overflow-hidden">
            <img
              src={drill.architecture.diagramUrl}
              alt={drill.architecture.diagramLabel ?? 'Architecture diagram'}
              className="w-full h-auto"
            />
          </figure>
          <div className="rounded-xl border border-miro-hairline p-4 text-sm text-miro-slate leading-relaxed">
            {drill.issue}
          </div>
          {isAuthenticated ? (
            <Button
              onClick={() => dispatch({ type: 'BEGIN_DRILL' })}
              className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
            >
              Begin <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <DrillAuthGate
              title="Sign in to investigate this incident"
              description="Inspect system logs, run diagnostic probes, and diagnose the architectural root cause with Workers AI feedback. Free with an account."
              onSignInGoogle={onSignInGoogle}
              onSignInGithub={onSignInGithub}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  if (session.isCompleted) {
    return (
      <Card className="border-miro-hairline bg-miro-card shadow-xs">
        <CardHeader className="text-center pb-4">
          <div
            className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
              session.isCorrect
                ? 'bg-miro-successLight text-miro-successText'
                : 'bg-miro-dangerLight text-miro-dangerText'
            }`}
          >
            {session.isCorrect ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <XCircle className="h-6 w-6" />
            )}
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
              <span className="text-xs text-miro-slate font-medium">Cause</span>
              <p
                className={`text-sm font-medium mt-1.5 ${
                  session.isCorrect ? 'text-miro-successText' : 'text-miro-dangerText'
                }`}
              >
                {session.isCorrect ? 'Correct' : 'Incorrect'}
              </p>
            </div>
            <div>
              <span className="text-xs text-miro-slate font-medium">Fix</span>
              <p
                className={`text-sm font-medium mt-1.5 ${
                  session.isFixCorrect ? 'text-miro-successText' : 'text-miro-dangerText'
                }`}
              >
                {session.isFixCorrect ? 'Correct' : 'Incorrect'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-miro-hairline p-3 text-xs text-miro-slate flex flex-wrap justify-between items-center gap-2">
            <span>
              Probe {session.probeScore ?? 0} · Cause {session.causeScore ?? 0} · Fix{' '}
              {session.fixScore ?? 0}
            </span>
            {session.missedAllPivotal && (
              <Badge variant="destructive" className="text-[10px]">
                Missed pivotal
              </Badge>
            )}
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
                dispatch({ type: 'RESET_SESSION' });
                setSelectedConfidence(null);
                setSelectedFixConfidence(null);
                setGradeError(null);
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

  return (
    <Card className="border-miro-hairline bg-miro-card shadow-xs">
      <CardContent className="space-y-5 pt-6">
        {(session.phase === 'probes' || session.probesLocked) && (
          <ProbeBudgetPanel
            probes={orderedProbes}
            selectedProbeIds={session.selectedProbeIds}
            probesLocked={session.probesLocked}
            probeBudget={drill.probeBudget}
            onToggleProbe={(probeId) => dispatch({ type: 'TOGGLE_PROBE', probeId })}
            onLockProbes={() => dispatch({ type: 'LOCK_PROBES' })}
          />
        )}

        {session.phase === 'cause' && (
          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-miro-slate">
                Diagnostic Finding
              </span>
              <textarea
                value={session.causeText}
                onChange={(e) => dispatch({ type: 'SET_CAUSE_TEXT', text: e.target.value })}
                placeholder="Synthesize the architectural root cause based on uncovered probe evidence…"
                className="w-full min-h-[120px] rounded-xl border border-miro-hairline bg-miro-card px-3.5 py-3 text-sm text-miro-primary resize-y"
              />
            </label>
            <Button
              onClick={() => dispatch({ type: 'BEGIN_COMMIT_CAUSE' })}
              disabled={!session.causeText.trim()}
              className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary"
            >
              Commit Cause <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {session.phase === 'commit_cause' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-miro-hairline bg-miro-surface p-4 text-sm text-miro-primary leading-relaxed whitespace-pre-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-miro-slate block mb-1">
                Your Root Cause Diagnosis
              </span>
              {session.causeText}
            </div>

            {gradeError && (
              <p className="text-sm text-miro-dangerText border border-miro-dangerBorder rounded-md px-3 py-2">
                {gradeError}
              </p>
            )}

            <ConfidenceGate
              selectedConfidence={selectedConfidence}
              onSelectConfidence={setSelectedConfidence}
              hasSelectedAnswer={Boolean(session.causeText.trim())}
              disabled={grading}
              onSubmit={() => void commitCause()}
              submitLabel={grading ? 'Evaluating Diagnosis…' : 'Submit Cause Diagnosis'}
            />
          </div>
        )}

        {session.phase === 'cause_reveal' && session.grade && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 ${
                session.isCorrect
                  ? 'border-miro-successBorder bg-miro-successLight'
                  : 'border-miro-dangerBorder bg-miro-dangerLight'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-miro-primary">
                  {session.grade.verdict === 'correct'
                    ? 'Root Cause Identified'
                    : session.grade.verdict === 'incorrect_distractor'
                      ? (session.distractorAntipattern ?? 'Incorrect Distractor')
                      : 'Incorrect Diagnosis'}
                </span>
                <span className="text-xs font-mono font-medium">{session.causeScore ?? 0} pts</span>
              </div>
              {session.grade.matchedDistractor && (
                <p className="text-xs text-miro-slate mt-2 leading-relaxed">
                  {session.grade.matchedDistractor.rationale}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-miro-hairline bg-miro-surface p-4 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-miro-slate block">
                Gold Architectural Cause
              </span>
              <p className="text-sm font-medium text-miro-primary">{session.grade.goldText}</p>
              <p className="text-xs text-miro-slate leading-relaxed">
                {session.grade.goldRationale}
              </p>
              {causeCitationHref && (
                <div className="pt-1">
                  <a
                    href={causeCitationHref}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-miro-blue hover:underline inline-flex items-center gap-1"
                  >
                    <span>{new URL(causeCitationHref).hostname}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              )}
            </div>

            {session.fix ? (
              <Button
                onClick={() => dispatch({ type: 'PROCEED_TO_FIX' })}
                className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
              >
                Proceed to Architectural Fix <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <p className="text-sm text-miro-danger">
                This Incident is missing a Fix definition and cannot continue.
              </p>
            )}
          </div>
        )}

        {session.phase === 'fix' && session.fix && (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-miro-slate block mb-1">
                Step 2: Architectural Fix
              </span>
              <p className="text-sm font-medium text-miro-primary">{session.fix.prompt}</p>
            </div>

            <div className="space-y-2">
              {orderedFixOptions.map((option) => {
                const selected = session.selectedFixOptionId === option.id;
                let className =
                  'w-full text-left rounded-xl border px-3.5 py-3 text-sm transition-colors cursor-pointer ';
                if (selected) {
                  className += 'border-miro-primary bg-miro-surface text-miro-primary';
                } else {
                  className +=
                    'border-miro-hairline bg-miro-card text-miro-slate hover:border-miro-hairlineStrong';
                }
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => dispatch({ type: 'SELECT_FIX_OPTION', optionId: option.id })}
                    className={className}
                  >
                    <span className="font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <ConfidenceGate
              selectedConfidence={selectedFixConfidence}
              onSelectConfidence={setSelectedFixConfidence}
              hasSelectedAnswer={Boolean(session.selectedFixOptionId)}
              onSubmit={() => {
                if (!selectedFixConfidence || !session.selectedFixOptionId) return;
                dispatch({
                  type: 'COMMIT_FIX',
                  optionId: session.selectedFixOptionId,
                  confidence: (selectedFixConfidence / 100) as ConfidenceAnchor,
                });
              }}
              submitLabel="Commit Fix Recommendation"
            />
          </div>
        )}

        {session.phase === 'feedback' && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 ${
                session.isFixCorrect
                  ? 'border-miro-successBorder bg-miro-successLight'
                  : 'border-miro-dangerBorder bg-miro-dangerLight'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-miro-primary">
                  {session.isFixCorrect ? 'Fix Correct' : 'Fix Antipattern Selected'}
                </span>
                <span className="text-xs font-mono font-medium">{session.fixScore ?? 0} pts</span>
              </div>
              {!session.isFixCorrect && session.fixDistractorAntipattern && (
                <Badge variant="destructive" className="mt-2 text-[10px]">
                  {session.fixDistractorAntipattern}
                </Badge>
              )}
            </div>

            {goldFixOption && (
              <div className="rounded-xl border border-miro-hairline bg-miro-surface p-4 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-miro-slate block">
                  Gold Architectural Fix
                </span>
                <p className="text-sm font-medium text-miro-primary">{goldFixOption.label}</p>
                <p className="text-xs text-miro-slate leading-relaxed">{goldFixOption.rationale}</p>
                {fixCitationHref && (
                  <div className="pt-1">
                    <a
                      href={fixCitationHref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-miro-blue hover:underline inline-flex items-center gap-1"
                    >
                      <span>{new URL(fixCitationHref).hostname}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-miro-hairline p-3 text-sm text-miro-slate flex flex-wrap justify-between items-center gap-3">
              <span className="font-mono text-xs">
                Probe {session.probeScore ?? 0} · Cause {session.causeScore ?? 0} · Fix{' '}
                {session.fixScore ?? 0}
              </span>
              <span className="font-mono font-semibold text-miro-primary">
                Total {session.totalScore} pts
              </span>
            </div>

            <Button
              onClick={() => dispatch({ type: 'FINISH' })}
              className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
            >
              Finish Incident Review <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
