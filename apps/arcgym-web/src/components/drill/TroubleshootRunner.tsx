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
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
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
    setGradeError(null);
  }, [drill.id]);

  const completedRef = useRef(false);

  useEffect(() => {
    if (session.isCompleted && session.attempt && !completedRef.current) {
      completedRef.current = true;
      onDrillComplete?.({
        drillId: drill.id,
        format: 'Troubleshooting',
        score: session.totalScore,
        accuracy: session.isCorrect ? 1 : 0,
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
    drill.id,
    onDrillComplete,
  ]);

  const orderedProbes = useMemo(
    () => orderOptions(drill.probes, optionSeed(drill.id, 'probes')),
    [drill],
  );

  const citationHref = safeCitationHref(session.grade?.goldCitationUrl);

  const commitCause = async () => {
    if (!selectedConfidence || grading) return;
    setGrading(true);
    setGradeError(null);
    try {
      const grade = await gradeCauseViaApi(drill.id, session.causeText);
      dispatch({
        type: 'COMMIT_CONFIDENCE',
        confidence: (selectedConfidence / 100) as ConfidenceAnchor,
        grade,
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
              onClick={() => dispatch({ type: 'BEGIN_PROBES' })}
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
              <span className="text-xs text-miro-slate font-medium">Discovery</span>
              <p
                className={`text-sm font-medium mt-1.5 ${
                  session.missedAllPivotal ? 'text-miro-dangerText' : 'text-miro-successText'
                }`}
              >
                {session.missedAllPivotal ? 'Missed pivotal' : 'Pivotal hit'}
              </p>
            </div>
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

          {onNextDrill && (
            <div className="pt-1">
              <Button
                onClick={onNextDrill}
                className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary font-medium"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
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
            <textarea
              value={session.causeText}
              onChange={(e) => dispatch({ type: 'SET_CAUSE_TEXT', text: e.target.value })}
              placeholder="Likely root cause…"
              className="w-full min-h-[120px] rounded-xl border border-miro-hairline bg-miro-card px-3.5 py-3 text-sm text-miro-primary resize-y"
            />
            <Button
              onClick={() => dispatch({ type: 'BEGIN_COMMIT' })}
              disabled={!session.causeText.trim()}
              className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary"
            >
              Commit
            </Button>
          </div>
        )}

        {session.phase === 'commit' && (
          <div className="space-y-4">
            <p className="text-sm text-miro-slate whitespace-pre-wrap">{session.causeText}</p>
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
              submitLabel={grading ? 'Grading…' : 'Submit'}
            />
          </div>
        )}

        {session.phase === 'feedback' && session.grade && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 ${
                session.isCorrect
                  ? 'border-miro-successBorder bg-miro-successLight'
                  : 'border-miro-dangerBorder bg-miro-dangerLight'
              }`}
            >
              <p className="text-sm font-medium text-miro-primary">
                {session.grade.verdict === 'correct'
                  ? 'Correct'
                  : session.grade.verdict === 'incorrect_distractor'
                    ? (session.distractorAntipattern ?? 'Incorrect')
                    : 'Incorrect'}
              </p>
              {session.grade.matchedDistractor && (
                <p className="text-sm text-miro-slate mt-2">
                  {session.grade.matchedDistractor.rationale}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-miro-hairline bg-miro-surface p-4 space-y-2">
              <p className="text-sm font-medium text-miro-primary">{session.grade.goldText}</p>
              <p className="text-sm text-miro-slate">{session.grade.goldRationale}</p>
              {citationHref && (
                <a
                  href={citationHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-miro-blue hover:underline"
                >
                  {new URL(citationHref).hostname}
                </a>
              )}
            </div>

            {session.grade.goldRemediations && session.grade.goldRemediations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-miro-slate">
                  Architectural Remediation
                </p>
                <div className="space-y-2">
                  {session.grade.goldRemediations.map((rem, idx) => (
                    <div
                      key={rem.title}
                      className="rounded-xl border border-miro-hairline bg-miro-surface p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-mono">
                          Solution {idx + 1}
                        </Badge>
                        <span className="text-sm font-medium text-miro-primary">{rem.title}</span>
                      </div>
                      <p className="text-xs text-miro-slate leading-relaxed">{rem.description}</p>
                      {rem.citationUrl && (
                        <div className="pt-1">
                          <a
                            href={rem.citationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-miro-blue hover:underline inline-flex items-center gap-1"
                          >
                            <span>{new URL(rem.citationUrl).hostname}</span>
                            <span aria-hidden="true">↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-miro-hairline p-3 text-sm text-miro-slate flex flex-wrap gap-3">
              <span className="font-mono">Probe {session.probeScore ?? 0}</span>
              <span className="font-mono">Cause {session.causeScore ?? 0}</span>
              <span className="font-mono">Total {session.totalScore}</span>
              {session.missedAllPivotal && (
                <Badge variant="destructive" className="text-[10px]">
                  Missed pivotal
                </Badge>
              )}
            </div>

            <Button
              onClick={() => dispatch({ type: 'FINISH' })}
              className="w-full gap-2 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary"
            >
              Finish
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
