import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import {
  ArcGymScoringEngine,
  ConfidenceAnchor,
  DiagramDrillDefinition,
  DiagramHotspotDTO,
  DrillFormat,
  DrillAttemptRecord,
  safeCitationHref,
  orderOptions,
  optionSeed,
} from '@arcgym/drill-core';
import { CheckCircle2, XCircle, ExternalLink, ArrowRight, RotateCcw } from 'lucide-react';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';
import { DiagramCanvas } from './DiagramCanvas';

type Phase = 'hotspot_gate' | 'hotspot_pick' | 'hotspot_miss' | 'mcq_pick' | 'mcq_result';

interface DecisionResult {
  stepId: string;
  selectedOptionId: string;
  confidence: number;
  isCorrect: boolean;
  score: number;
  distractorAntipattern?: string;
}

export const DiagramRunner: React.FC<{
  drill: DiagramDrillDefinition;
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
}> = ({ drill, isReviewMode = false, previousAttempt, onDrillComplete, onNextDrill }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('hotspot_gate');
  const [hotspotConfidence, setHotspotConfidence] = useState<ConfidenceLevel | null>(null);
  const [mcqConfidence, setMcqConfidence] = useState<ConfidenceLevel | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [missedHotspot, setMissedHotspot] = useState<DiagramHotspotDTO | null>(null);
  const [decisionResults, setDecisionResults] = useState<DecisionResult[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setCurrentStepIndex(0);
    setPhase('hotspot_gate');
    setHotspotConfidence(null);
    setMcqConfidence(null);
    setSelectedHotspotId(null);
    setSelectedOptionId(null);
    setMissedHotspot(null);
    setDecisionResults([]);
    setIsCompleted(false);
  }, [drill.id]);

  const currentStep = drill.steps[currentStepIndex];
  const orderedOptions = useMemo(
    () => orderOptions(currentStep.options, optionSeed(drill.id, currentStep.id)),
    [drill.id, currentStep]
  );
  const correctCitationHref = safeCitationHref(
    currentStep.options.find((o) => o.isCorrect)?.citationUrl
  );
  const sourceHref = safeCitationHref(currentStep.sourceDiagramUrl);
  const progressPercent = Math.round(
    ((currentStepIndex + (phase === 'mcq_result' || phase === 'hotspot_miss' ? 1 : 0)) /
      drill.steps.length) *
      100
  );

  const hotspotById = useMemo(() => {
    const map = new Map<string, DiagramHotspotDTO>();
    for (const h of currentStep.hotspots) map.set(h.id, h);
    return map;
  }, [currentStep]);

  const finishDrill = (results: DecisionResult[]) => {
    setIsCompleted(true);
    const totalPts = results.reduce((acc, r) => acc + r.score, 0);
    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy = results.length > 0 ? correctCount / results.length : 0;
    onDrillComplete?.({
      drillId: drill.id,
      format: 'Diagram',
      score: totalPts,
      accuracy,
      streakDays: 1,
      steps: results.map((r) => ({
        stepId: r.stepId,
        confidence: (r.confidence / 100) as ConfidenceAnchor,
        isCorrect: r.isCorrect,
        score: r.score,
        selectedOptionId: r.selectedOptionId,
        distractorAntipattern: r.distractorAntipattern,
      })),
    });
  };

  const advanceAfterStepResolved = (results: DecisionResult[]) => {
    if (currentStepIndex + 1 < drill.steps.length) {
      setCurrentStepIndex((i) => i + 1);
      setPhase('hotspot_gate');
      setHotspotConfidence(null);
      setMcqConfidence(null);
      setSelectedHotspotId(null);
      setSelectedOptionId(null);
      setMissedHotspot(null);
    } else {
      finishDrill(results);
    }
  };

  const commitHotspot = () => {
    if (!selectedHotspotId || !hotspotConfidence) return;
    const hotspot = hotspotById.get(selectedHotspotId);
    if (!hotspot) return;

    const confidenceAnchor = (hotspotConfidence / 100) as ConfidenceAnchor;
    const isCorrect = hotspot.isCorrect;
    const brier = ArcGymScoringEngine.calculateDecisionScore(confidenceAnchor, isCorrect);
    const hotspotResult: DecisionResult = {
      stepId: `${currentStep.id}:hotspot`,
      selectedOptionId: selectedHotspotId,
      confidence: hotspotConfidence,
      isCorrect,
      score: brier.pointsAwarded,
      distractorAntipattern: isCorrect
        ? undefined
        : hotspot.distractorAntipattern ?? 'Off-Target Hotspot',
    };
    const nextResults = [...decisionResults, hotspotResult];
    setDecisionResults(nextResults);

    if (!isCorrect) {
      setMissedHotspot(hotspot);
      setPhase('hotspot_miss');
      return;
    }
    setPhase('mcq_pick');
  };

  const commitMcq = () => {
    if (!selectedOptionId || !mcqConfidence) return;
    const option = currentStep.options.find((o) => o.id === selectedOptionId);
    if (!option) return;
    const confidenceAnchor = (mcqConfidence / 100) as ConfidenceAnchor;
    const brier = ArcGymScoringEngine.calculateDecisionScore(confidenceAnchor, option.isCorrect);
    const mcqResult: DecisionResult = {
      stepId: `${currentStep.id}:mcq`,
      selectedOptionId,
      confidence: mcqConfidence,
      isCorrect: option.isCorrect,
      score: brier.pointsAwarded,
      distractorAntipattern: option.isCorrect ? undefined : option.distractorAntipattern,
    };
    const nextResults = [...decisionResults, mcqResult];
    setDecisionResults(nextResults);
    setPhase('mcq_result');
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setPhase('hotspot_gate');
    setHotspotConfidence(null);
    setMcqConfidence(null);
    setSelectedHotspotId(null);
    setSelectedOptionId(null);
    setMissedHotspot(null);
    setDecisionResults([]);
    setIsCompleted(false);
  };

  const totalScore = decisionResults.reduce((acc, r) => acc + r.score, 0);
  const canPickHotspot = phase === 'hotspot_pick';
  const showMcq = phase === 'mcq_pick' || phase === 'mcq_result';

  if (isCompleted) {
    return (
      <Card className="border-miro-hairline bg-miro-card shadow-xs">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-miro-successLight text-miro-successText">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-miro-primary">Drill completed</h2>
          <p className="text-sm text-miro-slate mt-1">
            You committed {decisionResults.length} diagram decisions across {drill.steps.length}{' '}
            topology problem{drill.steps.length === 1 ? '' : 's'}.
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
                {decisionResults.filter((r) => r.isCorrect).length} / {decisionResults.length}
              </p>
            </div>
            <div>
              <span className="text-xs text-miro-slate font-medium">Avg confidence</span>
              <p className="text-2xl font-medium text-miro-primary mt-0.5">
                {Math.round(
                  decisionResults.reduce((acc, r) => acc + r.confidence, 0) / decisionResults.length
                )}
                %
              </p>
            </div>
          </div>

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
            <Badge variant="outline">{currentStep.mode === 'fault' ? 'Fault' : 'Compose'}</Badge>
            {(drill.pillars || []).map((p) => (
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
          <div className="flex items-center gap-3">
            <DrillFeedbackWidget drillId={drill.id} />
            <span className="text-xs text-miro-slate font-medium">
              Canvas {currentStepIndex + 1} of {drill.steps.length}
            </span>
          </div>
        </div>
        <Progress
          value={progressPercent}
          className="mt-3 h-1 bg-miro-hairlineSoft"
          indicatorClassName="bg-miro-primary"
        />
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        <h2 className="text-base sm:text-lg font-medium text-miro-primary leading-relaxed">
          {currentStep.prompt}
        </h2>

        {sourceHref && (
          <a
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-miro-blue hover:underline"
          >
            Based on official reference <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <DiagramCanvas
          graph={currentStep.graph}
          layout={currentStep.layout}
          hotspots={currentStep.hotspots}
          selectedHotspotId={selectedHotspotId}
          interactive={canPickHotspot}
          onSelectHotspot={setSelectedHotspotId}
        />

        {phase === 'hotspot_gate' && (
          <ConfidenceGate
            selectedConfidence={hotspotConfidence}
            onSelectConfidence={setHotspotConfidence}
            onSubmit={() => setPhase('hotspot_pick')}
            hasSelectedAnswer={true}
            submitLabel="Ready to locate the hotspot"
          />
        )}

        {phase === 'hotspot_pick' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-miro-hairline/80 bg-miro-surfaceSoft/60">
            <p className="text-xs text-miro-slate">
              Selected target:{' '}
              <span className="font-semibold text-miro-primary">
                {selectedHotspotId
                  ? currentStep.graph.nodes.find((n) => n.id === selectedHotspotId)?.label ||
                    currentStep.graph.edges.find((e) => e.id === selectedHotspotId)?.label ||
                    selectedHotspotId
                  : 'none yet'}
              </span>
            </p>
            <Button
              size="sm"
              disabled={!selectedHotspotId}
              onClick={commitHotspot}
              className="w-full sm:w-auto h-8 px-4 text-xs font-medium"
            >
              Commit hotspot
            </Button>
          </div>
        )}

        {phase === 'hotspot_miss' && missedHotspot && (
          <div className="space-y-4 rounded-2xl border border-miro-dangerText/30 bg-miro-dangerLight p-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-miro-dangerText shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-miro-primary">
                  {missedHotspot.distractorAntipattern ?? 'Off-target hotspot'}
                </p>
                <p className="text-sm text-miro-slate mt-1">
                  {missedHotspot.missRationale ??
                    currentStep.genericMissCopy ??
                    'That element is not the fault locus for this symptom. The correct hotspot was elsewhere on the canvas.'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => advanceAfterStepResolved(decisionResults)}
              className="w-full bg-miro-primary text-miro-onPrimary"
            >
              {currentStepIndex + 1 < drill.steps.length ? 'Next canvas' : 'See results'}
            </Button>
          </div>
        )}

        {showMcq && (
          <div className="space-y-3">
            <p className="text-sm text-miro-successText font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Hotspot located — now choose the repair.
            </p>
            {orderedOptions.map((opt, index) => {
              const isSelected = selectedOptionId === opt.id;
              const submitted = phase === 'mcq_result';
              let containerStyle = 'border-miro-hairline hover:border-miro-hairlineStrong bg-miro-card';
              if (submitted) {
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
                <div
                  key={opt.id}
                  onClick={() => {
                    if (phase !== 'mcq_pick') return;
                    setSelectedOptionId(opt.id);
                  }}
                  className={`p-4 rounded-xl border transition-all duration-150 text-sm leading-normal flex items-start gap-3.5 ${containerStyle} ${
                    phase === 'mcq_pick' ? 'cursor-pointer' : ''
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 ${
                      isSelected
                        ? 'border-miro-primary bg-miro-primary text-miro-onPrimary'
                        : 'border-miro-hairlineStrong text-miro-muted'
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-1">
                    <p className="font-normal text-miro-primary">{opt.label}</p>
                    {submitted && (opt.isCorrect || isSelected) && (
                      <p className="text-xs text-miro-slate mt-2">{opt.rationale}</p>
                    )}
                    {submitted && isSelected && !opt.isCorrect && opt.distractorAntipattern && (
                      <Badge variant="destructive" className="mt-2">
                        {opt.distractorAntipattern}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            {phase === 'mcq_pick' && (
              <ConfidenceGate
                selectedConfidence={mcqConfidence}
                onSelectConfidence={setMcqConfidence}
                onSubmit={commitMcq}
                hasSelectedAnswer={!!selectedOptionId}
                submitLabel="Commit repair"
              />
            )}

            {phase === 'mcq_result' && (
              <div className="space-y-3">
                {correctCitationHref && (
                  <a
                    href={correctCitationHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-miro-blue hover:underline"
                  >
                    Well-Architected citation <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <Button
                  onClick={() => advanceAfterStepResolved(decisionResults)}
                  className="w-full bg-miro-primary text-miro-onPrimary"
                >
                  {currentStepIndex + 1 < drill.steps.length ? 'Next canvas' : 'See results'}
                </Button>
              </div>
            )}
          </div>
        )}

        {isReviewMode && previousAttempt && (
          <div className="p-3 bg-miro-yellowLight border border-miro-yellowBorder rounded-xl text-xs text-miro-yellowText">
            Review Practice: Previously completed on{' '}
            {new Date(previousAttempt.completedAt).toLocaleDateString()} — prior score +
            {previousAttempt.score} pts
          </div>
        )}
      </CardContent>
    </Card>
  );
};
