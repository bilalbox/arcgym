import {
  ArcGymScoringEngine,
  type ConfidenceAnchor,
  type DiagramCompareOptionDTO,
  type DiagramDrillDefinition,
  type DiagramHotspotDTO,
  type DrillAttemptRecord,
  type DrillFormat,
  type DrillOptionDTO,
  isDiagramCompareStep,
  isDiagramHotspotStep,
  optionSeed,
  orderOptions,
  safeCitationHref,
} from '@arcgym/drill-core';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, type ConfidenceLevel } from './ConfidenceGate';
import { DiagramCanvas } from './DiagramCanvas';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';

type Phase = 'pick' | 'result';

interface DecisionResult {
  stepId: string;
  selectedOptionId: string;
  confidence: number;
  isCorrect: boolean;
  score: number;
  distractorAntipattern?: string;
  hotspotId?: string;
  hotspotCorrect?: boolean;
  optionCorrect?: boolean;
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
}> = ({
  drill,
  isReviewMode = false,
  previousAttempt: _previousAttempt,
  onDrillComplete,
  onNextDrill,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [decisionResults, setDecisionResults] = useState<DecisionResult[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [lightboxDiagram, setLightboxDiagram] = useState<{
    url: string;
    title: string;
    isSubmitted?: boolean;
    isCorrect?: boolean;
    distractorAntipattern?: string;
    rationale?: string;
    isSelected?: boolean;
  } | null>(null);

  useEffect(() => {
    setCurrentStepIndex(0);
    setPhase('pick');
    setConfidence(null);
    setSelectedHotspotId(null);
    setSelectedOptionId(null);
    setDecisionResults([]);
    setIsCompleted(false);
    setLightboxDiagram(null);
  }, []);

  const currentStep = drill.steps[currentStepIndex];
  const isHotspotMode = isDiagramHotspotStep(currentStep);
  const isCompareMode = isDiagramCompareStep(currentStep);

  const orderedHotspotOptions = useMemo(() => {
    if (!isHotspotMode) return [];
    return orderOptions(currentStep.options, optionSeed(drill.id, currentStep.id));
  }, [drill.id, currentStep, isHotspotMode]);

  const orderedCompareOptions = useMemo(() => {
    if (!isCompareMode) return [];
    return orderOptions(currentStep.options, optionSeed(drill.id, currentStep.id));
  }, [drill.id, currentStep, isCompareMode]);

  const correctCitationHref = useMemo(() => {
    const correctOpt = currentStep.options.find((o) => o.isCorrect);
    return safeCitationHref(correctOpt?.citationUrl);
  }, [currentStep]);

  const sourceHref = safeCitationHref(currentStep.sourceDiagramUrl);

  const progressPercent = Math.round(
    ((currentStepIndex + (phase === 'result' ? 1 : 0)) / drill.steps.length) * 100,
  );

  const hotspotById = useMemo(() => {
    const map = new Map<string, DiagramHotspotDTO>();
    if (isHotspotMode) {
      for (const h of currentStep.hotspots) map.set(h.id, h);
    }
    return map;
  }, [currentStep, isHotspotMode]);

  const correctHotspot = useMemo(() => {
    if (!isHotspotMode) return null;
    return currentStep.hotspots.find((h) => h.isCorrect) ?? null;
  }, [currentStep, isHotspotMode]);

  const selectedHotspotLabel = useMemo(() => {
    if (!selectedHotspotId || !isHotspotMode) return 'none yet';
    const node = currentStep.graph.nodes.find((n) => n.id === selectedHotspotId);
    if (node) return node.label || `[${node.kind} placeholder]`;
    const edge = currentStep.graph.edges.find((e) => e.id === selectedHotspotId);
    if (edge) return edge.label || `${edge.source} → ${edge.target}`;
    return selectedHotspotId;
  }, [selectedHotspotId, isHotspotMode, currentStep]);

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

  const advanceToNextStep = (results: DecisionResult[]) => {
    if (currentStepIndex + 1 < drill.steps.length) {
      setCurrentStepIndex((i) => i + 1);
      setPhase('pick');
      setConfidence(null);
      setSelectedHotspotId(null);
      setSelectedOptionId(null);
      setLightboxDiagram(null);
    } else {
      finishDrill(results);
    }
  };

  const commitCompoundDecision = () => {
    if (!confidence) return;
    const confidenceAnchor = (confidence / 100) as ConfidenceAnchor;

    if (isHotspotMode) {
      if (!selectedHotspotId || !selectedOptionId) return;
      const hotspot = hotspotById.get(selectedHotspotId);
      const option = currentStep.options.find((o) => o.id === selectedOptionId);
      if (!hotspot || !option) return;

      const hotspotCorrect = hotspot.isCorrect;
      const optionCorrect = option.isCorrect;
      const isCompoundCorrect = hotspotCorrect && optionCorrect;

      const brier = ArcGymScoringEngine.calculateDecisionScore(confidenceAnchor, isCompoundCorrect);

      let antipattern: string | undefined;
      if (!hotspotCorrect) {
        antipattern = hotspot.distractorAntipattern ?? 'Off-Target Hotspot';
      } else if (!optionCorrect) {
        antipattern = option.distractorAntipattern;
      }

      const result: DecisionResult = {
        stepId: currentStep.id,
        selectedOptionId,
        confidence,
        isCorrect: isCompoundCorrect,
        score: brier.pointsAwarded,
        distractorAntipattern: antipattern,
        hotspotId: selectedHotspotId,
        hotspotCorrect,
        optionCorrect,
      };

      const nextResults = [...decisionResults, result];
      setDecisionResults(nextResults);
      setPhase('result');
      return;
    }

    if (isCompareMode) {
      if (!selectedOptionId) return;
      const option = currentStep.options.find((o) => o.id === selectedOptionId);
      if (!option) return;

      const isCorrect = option.isCorrect;
      const brier = ArcGymScoringEngine.calculateDecisionScore(confidenceAnchor, isCorrect);

      const result: DecisionResult = {
        stepId: currentStep.id,
        selectedOptionId,
        confidence,
        isCorrect,
        score: brier.pointsAwarded,
        distractorAntipattern: isCorrect ? undefined : option.distractorAntipattern,
      };

      const nextResults = [...decisionResults, result];
      setDecisionResults(nextResults);
      setPhase('result');
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setPhase('pick');
    setConfidence(null);
    setSelectedHotspotId(null);
    setSelectedOptionId(null);
    setDecisionResults([]);
    setIsCompleted(false);
    setLightboxDiagram(null);
  };

  const totalScore = decisionResults.reduce((acc, r) => acc + r.score, 0);
  const currentResult = decisionResults[currentStepIndex];

  if (isCompleted) {
    return (
      <Card className="border-miro-hairline bg-miro-card shadow-xs">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-miro-successLight text-miro-successText">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-medium text-miro-primary">Drill completed</h2>
          <p className="text-sm text-miro-slate mt-1">
            You committed {decisionResults.length} architectural decision
            {decisionResults.length === 1 ? '' : 's'} across {drill.steps.length} topology problem
            {drill.steps.length === 1 ? '' : 's'}.
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
                {decisionResults.filter((r) => r.isCorrect).length} / {decisionResults.length}
              </p>
            </div>
            <div>
              <span className="text-xs text-miro-slate font-medium">Avg confidence</span>
              <p className="text-2xl font-medium text-miro-primary mt-0.5">
                {Math.round(
                  decisionResults.reduce((acc, r) => acc + r.confidence, 0) /
                    decisionResults.length,
                )}
                %
              </p>
            </div>
          </div>

          <DrillFeedbackWidget drillId={drill.id} />

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

  const modeBadgeLabel =
    currentStep.mode === 'compare' ? 'Compare' : currentStep.mode === 'fault' ? 'Fault' : 'Compose';

  return (
    <>
      <Card className="border-miro-hairline bg-miro-card shadow-xs">
        <CardHeader className="pb-4 border-b border-miro-hairlineSoft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="domain">{drill.domainLabel}</Badge>
              <Badge variant="outline">{modeBadgeLabel}</Badge>
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
              <span className="text-xs text-miro-slate font-medium">
                Step {currentStepIndex + 1} of {drill.steps.length}
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

          {/* MODE: Hotspot Canvas */}
          {isHotspotMode && (
            <div className="space-y-4">
              <DiagramCanvas
                graph={currentStep.graph}
                layout={currentStep.layout}
                hotspots={currentStep.hotspots}
                selectedHotspotId={selectedHotspotId}
                correctHotspotId={correctHotspot?.id}
                isSubmitted={phase === 'result'}
                interactive={phase === 'pick'}
                onSelectHotspot={setSelectedHotspotId}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-miro-hairline/80 bg-miro-surfaceSoft/60">
                <p className="text-xs text-miro-slate">
                  Selected target:{' '}
                  <span className="font-semibold text-miro-primary">{selectedHotspotLabel}</span>
                </p>
                {phase === 'pick' && !selectedHotspotId && (
                  <span className="text-xs text-miro-slate italic">
                    Click a node, connection, or placeholder above
                  </span>
                )}
                {phase === 'pick' && selectedHotspotId && (
                  <span className="text-xs text-miro-successText font-medium">
                    Target selected — choose repair below
                  </span>
                )}
              </div>

              {/* Hotspot Result Breakdown Banner */}
              {phase === 'result' && currentResult && (
                <div className="space-y-3">
                  {!currentResult.hotspotCorrect && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-miro-dangerText/30 bg-miro-dangerLight text-miro-primary">
                      <XCircle className="h-5 w-5 text-miro-dangerText shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-miro-primary">
                            Diagnostic Antipattern:
                          </span>
                          <Badge variant="destructive">
                            {currentResult.distractorAntipattern ?? 'Off-Target Hotspot'}
                          </Badge>
                        </div>
                        <p className="text-miro-slate">
                          {hotspotById.get(selectedHotspotId || '')?.missRationale ??
                            currentStep.genericMissCopy ??
                            'That element is not the fault locus for this symptom.'}
                        </p>
                        <p className="text-miro-muted italic">
                          Because the root fault was misdiagnosed, the repair choice was moot.
                        </p>
                      </div>
                    </div>
                  )}

                  {currentResult.hotspotCorrect && !currentResult.optionCorrect && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-miro-yellowBorder bg-miro-yellowLight text-miro-primary">
                      <AlertTriangle className="h-5 w-5 text-miro-yellowText shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-miro-primary">
                          Hotspot correctly diagnosed, but repair prescription failed.
                        </p>
                        <p className="text-miro-slate">
                          You identified the exact fault locus on the topology, but chose an invalid
                          remediation.
                        </p>
                      </div>
                    </div>
                  )}

                  {currentResult.isCorrect && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-miro-successText/30 bg-miro-successLight text-miro-primary">
                      <CheckCircle2 className="h-5 w-5 text-miro-successText shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-miro-primary">
                          Full architectural solution verified (+{currentResult.score} pts)
                        </p>
                        <p className="text-miro-slate">
                          Accurately localized the fault and selected the Well-Architected repair.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Repair MCQ Section */}
              {(selectedHotspotId || phase === 'result') && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs uppercase tracking-wider text-miro-muted font-semibold">
                    {phase === 'result' ? 'Prescribed repair:' : 'Select Well-Architected repair:'}
                  </p>
                  {orderedHotspotOptions.map((opt: DrillOptionDTO, index: number) => {
                    const isSelected = selectedOptionId === opt.id;
                    const submitted = phase === 'result';
                    let containerStyle =
                      'border-miro-hairline hover:border-miro-hairlineStrong bg-miro-card';
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
                      containerStyle =
                        'border-2 border-miro-primary bg-miro-surfaceSoft text-miro-primary';
                    }
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        disabled={phase !== 'pick'}
                        onClick={() => {
                          if (phase !== 'pick') return;
                          setSelectedOptionId(opt.id);
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 text-sm leading-normal flex items-start gap-3.5 ${containerStyle} ${
                          phase === 'pick' ? 'cursor-pointer' : ''
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
                          {submitted &&
                            isSelected &&
                            !opt.isCorrect &&
                            opt.distractorAntipattern && (
                              <Badge variant="destructive" className="mt-2">
                                {opt.distractorAntipattern}
                              </Badge>
                            )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MODE: Comparative Topologies */}
          {isCompareMode && (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wider text-miro-muted font-semibold">
                Compare candidate architectures:
              </p>

              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                role="radiogroup"
                aria-label="Candidate architectures"
              >
                {orderedCompareOptions.map((opt: DiagramCompareOptionDTO, index: number) => {
                  const isSelected = selectedOptionId === opt.id;
                  const submitted = phase === 'result';
                  let cardBorder =
                    'border-miro-hairline hover:border-miro-hairlineStrong bg-miro-card';
                  if (submitted) {
                    if (opt.isCorrect) {
                      cardBorder = 'border-2 border-miro-successText bg-miro-successLight/30';
                    } else if (isSelected && !opt.isCorrect) {
                      cardBorder = 'border-2 border-miro-dangerText bg-miro-dangerLight/30';
                    } else {
                      cardBorder = 'border-miro-hairline opacity-65 bg-miro-card';
                    }
                  } else if (isSelected) {
                    cardBorder = 'border-2 border-miro-primary bg-miro-surfaceSoft shadow-xs';
                  }

                  return (
                    <label
                      key={opt.id}
                      className={`relative flex flex-col p-4 rounded-2xl border transition-all ${cardBorder} ${
                        phase === 'pick' ? 'cursor-pointer' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="diagram-architecture-choice"
                        value={opt.id}
                        checked={isSelected}
                        disabled={phase !== 'pick'}
                        onChange={() => setSelectedOptionId(opt.id)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between pb-2 border-b border-miro-hairlineSoft">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 ${
                              isSelected
                                ? 'border-miro-primary bg-miro-primary text-miro-onPrimary'
                                : 'border-miro-hairlineStrong text-miro-muted'
                            }`}
                          >
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-xs font-semibold text-miro-primary">
                            {opt.label}
                          </span>
                        </div>
                        {submitted && opt.isCorrect && (
                          <Badge
                            variant="outline"
                            className="bg-miro-successLight text-miro-successText border-miro-successText/40"
                          >
                            Valid Architecture
                          </Badge>
                        )}
                        {submitted && !opt.isCorrect && (
                          <Badge
                            variant={isSelected ? 'destructive' : 'outline'}
                            className={
                              !isSelected
                                ? 'bg-miro-surface text-miro-slate border-miro-hairline'
                                : ''
                            }
                          >
                            {opt.distractorAntipattern ?? 'Invalid Pattern'}
                          </Badge>
                        )}
                      </div>

                      {/* SVG Diagram with Superimposed Feedback (only after submission) */}
                      <div
                        className={`relative group my-3 rounded-xl overflow-hidden border flex items-center justify-center min-h-[170px] ${
                          submitted
                            ? opt.isCorrect
                              ? 'border-emerald-300/80 bg-emerald-50/20'
                              : isSelected
                                ? 'border-red-300/80 bg-red-50/20'
                                : 'border-miro-hairline bg-slate-50/40'
                            : 'border-miro-hairline bg-white'
                        }`}
                      >
                        <img
                          src={opt.diagramUrl}
                          alt={opt.label}
                          className="max-h-48 w-full object-contain p-2"
                        />

                        {/* Superimposed Feedback Badge over SVG (Visible ONLY after submission) */}
                        {submitted && (
                          <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                            {opt.isCorrect ? (
                              <div className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm backdrop-blur-xs">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                <span>Well-Architected</span>
                              </div>
                            ) : (
                              <div
                                className={`flex items-center gap-1.5 ${
                                  isSelected ? 'bg-red-600' : 'bg-slate-700/90'
                                } text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm backdrop-blur-xs`}
                              >
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  Antipattern: {opt.distractorAntipattern ?? 'Invalid Pattern'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Superimposed Selection Tag over SVG (Visible ONLY after submission) */}
                        {submitted && isSelected && (
                          <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
                            <span
                              className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md shadow-xs ${
                                opt.isCorrect
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-red-100 text-red-800 border border-red-300'
                              }`}
                            >
                              Your Choice
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxDiagram({
                              url: opt.diagramUrl,
                              title: opt.label,
                              isSubmitted: submitted,
                              isCorrect: opt.isCorrect,
                              distractorAntipattern: opt.distractorAntipattern,
                              rationale: opt.rationale,
                              isSelected,
                            });
                          }}
                          className="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs font-medium bg-miro-card/95 hover:bg-white text-miro-primary px-2.5 py-1 rounded-lg border border-miro-hairline shadow-xs cursor-pointer z-10"
                        >
                          <Maximize2 className="h-3.5 w-3.5" /> Inspect
                        </button>
                      </div>

                      {submitted && (opt.isCorrect || isSelected) && (
                        <p className="text-xs text-miro-slate mt-1 leading-relaxed">
                          {opt.rationale}
                        </p>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single Unified Confidence Gate */}
          {phase === 'pick' && (
            <div className="pt-2">
              <ConfidenceGate
                selectedConfidence={confidence}
                onSelectConfidence={setConfidence}
                onSubmit={commitCompoundDecision}
                hasSelectedAnswer={
                  isHotspotMode ? !!selectedHotspotId && !!selectedOptionId : !!selectedOptionId
                }
                submitLabel={
                  isHotspotMode ? 'Commit diagnosis and repair' : 'Commit architecture selection'
                }
              />
            </div>
          )}

          {/* Result Phase Navigation & Citations */}
          {phase === 'result' && (
            <div className="space-y-4 pt-2">
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
                onClick={() => advanceToNextStep(decisionResults)}
                className="w-full bg-miro-primary text-miro-onPrimary"
              >
                {currentStepIndex + 1 < drill.steps.length ? 'Next step' : 'See results'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox Zoom Modal */}
      {lightboxDiagram && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            className="fixed inset-0 bg-black/75 backdrop-blur-xs cursor-pointer"
            onClick={() => setLightboxDiagram(null)}
            aria-label="Close modal preview"
          />
          <div className="relative z-10 max-w-5xl w-full max-h-[92vh] bg-white rounded-2xl p-5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-miro-hairlineSoft">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-miro-primary">{lightboxDiagram.title}</h3>
                {lightboxDiagram.isSubmitted && lightboxDiagram.isCorrect && (
                  <Badge
                    variant="outline"
                    className="bg-miro-successLight text-miro-successText border-miro-successText/40"
                  >
                    Valid Architecture
                  </Badge>
                )}
                {lightboxDiagram.isSubmitted && !lightboxDiagram.isCorrect && (
                  <Badge variant={lightboxDiagram.isSelected ? 'destructive' : 'outline'}>
                    {lightboxDiagram.distractorAntipattern ?? 'Invalid Pattern'}
                  </Badge>
                )}
                {lightboxDiagram.isSubmitted && lightboxDiagram.isSelected && (
                  <span className="text-xs text-miro-slate font-medium">(Your Selection)</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxDiagram(null)}
                className="p-1.5 rounded-lg text-miro-slate hover:bg-miro-surface transition-colors cursor-pointer"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex-1 overflow-auto flex items-center justify-center p-4 bg-miro-surface/40 rounded-xl mt-3">
              <img
                src={lightboxDiagram.url}
                alt={lightboxDiagram.title}
                className="max-h-[65vh] max-w-full object-contain"
              />
              {lightboxDiagram.isSubmitted && (
                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                  {lightboxDiagram.isCorrect ? (
                    <div className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md backdrop-blur-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Well-Architected Pattern</span>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-2 ${
                        lightboxDiagram.isSelected ? 'bg-red-600' : 'bg-slate-800/90'
                      } text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md backdrop-blur-xs`}
                    >
                      <XCircle className="h-4 w-4" />
                      <span>
                        Antipattern: {lightboxDiagram.distractorAntipattern ?? 'Invalid Pattern'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {lightboxDiagram.isSubmitted && lightboxDiagram.rationale && (
              <div className="mt-3 p-3 rounded-xl bg-miro-surface border border-miro-hairlineSoft text-xs text-miro-slate leading-relaxed">
                <span className="font-semibold text-miro-primary mr-1">Architectural Review:</span>
                {lightboxDiagram.rationale}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
