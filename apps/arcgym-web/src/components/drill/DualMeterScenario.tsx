import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import { DrillFormat, ScenarioDrillDefinition } from '@arcgym/drill-core';
import { Users, Shield, ArrowRight, RotateCcw, AlertOctagon, CheckCircle2, Hourglass } from 'lucide-react';
import { DrillFeedbackWidget } from './DrillFeedbackWidget';

const DEFAULT_METER_LABELS = {
  primary: 'Stakeholder trust',
  secondary: 'Platform reliability',
} as const;

export const DualMeterScenario: React.FC<{
  drill: ScenarioDrillDefinition;
  isReviewMode?: boolean;
  onDrillComplete?: (result: {
    drillId: string;
    format: DrillFormat;
    score: number;
    accuracy: number;
    streakDays: number;
  }) => void;
  onNextDrill?: () => void;
}> = ({ drill, isReviewMode, onDrillComplete, onNextDrill }) => {
  const meterLabels = {
    primary: drill.meterLabels?.primary ?? DEFAULT_METER_LABELS.primary,
    secondary: drill.meterLabels?.secondary ?? DEFAULT_METER_LABELS.secondary,
  };
  const primaryIsSchedule =
    /schedule|timeline|scope|effort|delivery|headroom/i.test(meterLabels.primary);
  const PrimaryIcon = primaryIsSchedule ? Hourglass : Users;

  const [currentMoveIdx, setCurrentMoveIdx] = useState(0);
  const [trustScore, setTrustScore] = useState(drill.initialTrust);
  const [reliabilityScore, setReliabilityScore] = useState(drill.initialReliability);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hangoverLogs, setHangoverLogs] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setCurrentMoveIdx(0);
    setTrustScore(drill.initialTrust);
    setReliabilityScore(drill.initialReliability);
    setSelectedOptionId(null);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setHangoverLogs([]);
    setIsCompleted(false);
  }, [drill.id, drill.initialTrust, drill.initialReliability]);

  const currentMove = drill.moves[currentMoveIdx];

  const handleSubmit = () => {
    if (!selectedOptionId || !selectedConfidence) return;

    const chosen = currentMove.options.find((o) => o.id === selectedOptionId);
    if (!chosen) return;

    setTrustScore((prev) => Math.max(0, Math.min(100, prev + chosen.trustDelta)));
    setReliabilityScore((prev) => Math.max(0, Math.min(100, prev + chosen.reliabilityDelta)));
    setHangoverLogs((prev) => [
      ...prev,
      `${chosen.isOptimal ? '✓' : '⚠️'} Move ${currentMove.moveNumber}: ${chosen.techDebtImpact}`,
    ]);
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentMoveIdx + 1 < drill.moves.length) {
      setCurrentMoveIdx((prev) => prev + 1);
      setSelectedOptionId(null);
      setSelectedConfidence(null);
      setIsSubmitted(false);
    } else {
      setIsCompleted(true);
      const finalScore = Math.round((trustScore + reliabilityScore) / 2);
      onDrillComplete?.({
        drillId: drill.id,
        format: 'Scenario',
        score: finalScore,
        accuracy: trustScore >= 50 && reliabilityScore >= 50 ? 1.0 : 0.5,
        streakDays: 1,
      });
    }
  };

  const handleReset = () => {
    setCurrentMoveIdx(0);
    setTrustScore(drill.initialTrust);
    setReliabilityScore(drill.initialReliability);
    setSelectedOptionId(null);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setHangoverLogs([]);
    setIsCompleted(false);
  };

  if (isCompleted) {
    const isSuccess = trustScore >= 60 && reliabilityScore >= 60;
    return (
      <Card className="border-miro-hairline bg-white shadow-xs">
        <CardHeader className="text-center pb-4">
          <div
            className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
              isSuccess ? 'bg-miro-successLight text-miro-successText' : 'bg-miro-dangerLight text-miro-dangerText'
            }`}
          >
            {isSuccess ? <CheckCircle2 className="h-6 w-6" /> : <AlertOctagon className="h-6 w-6" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-miro-primary">
            {isSuccess ? 'Architectural crisis averted' : 'Technical debt hangover'}
          </h2>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            {isSuccess
              ? primaryIsSchedule
                ? 'You spent schedule where the model demanded it and kept platform reliability above the go-live bar.'
                : 'You successfully navigated stakeholder pressure while safeguarding Well-Architected integrity.'
              : primaryIsSchedule
                ? 'Shortcuts preserved the calendar but left platform reliability below operational thresholds.'
                : 'Short-term compromises degraded platform reliability below operational thresholds.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="grid grid-cols-2 gap-4 p-4 bg-miro-surface rounded-2xl border border-miro-hairlineSoft">
            <div>
              <span className="text-xs text-slate-600 font-medium">Final {meterLabels.primary.toLowerCase()}</span>
              <p className={`text-2xl font-medium mt-0.5 ${trustScore >= 60 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {trustScore}%
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-600 font-medium">{meterLabels.secondary}</span>
              <p
                className={`text-2xl font-medium mt-0.5 ${
                  reliabilityScore >= 60 ? 'text-miro-blue' : 'text-rose-600'
                }`}
              >
                {reliabilityScore}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-700">Architectural hangover report:</h4>
            <div className="p-4 bg-miro-surface rounded-2xl border border-miro-hairlineSoft space-y-2 text-xs font-mono text-slate-800">
              {hangoverLogs.map((log, i) => (
                <p key={i}>{log}</p>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleReset} variant="secondary" className="flex-1 gap-2">
              <RotateCcw className="h-4 w-4" /> Replay scenario
            </Button>
            {onNextDrill && (
              <Button onClick={onNextDrill} className="flex-1">
                Next drill
              </Button>
            )}
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
            <Badge variant="domain">{drill.domainLabel}</Badge>
            {drill.pillars.map((p) => (
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
          <div className="flex items-center gap-3">
            <DrillFeedbackWidget drillId={drill.id} />
            <span className="text-xs text-slate-600 font-medium">
              Move {currentMove.moveNumber} of {drill.moves.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-miro-hairlineSoft">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5 text-slate-700">
                <PrimaryIcon className="h-3.5 w-3.5 text-miro-blue" /> {meterLabels.primary}
              </span>
              <span className="font-mono text-miro-primary font-semibold">{trustScore}%</span>
            </div>
            <Progress
              value={trustScore}
              indicatorClassName={trustScore < 40 ? 'bg-rose-500' : trustScore < 70 ? 'bg-amber-500' : 'bg-emerald-600'}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Shield className="h-3.5 w-3.5 text-indigo-600" /> {meterLabels.secondary}
              </span>
              <span className="font-mono text-miro-primary font-semibold">{reliabilityScore}%</span>
            </div>
            <Progress
              value={reliabilityScore}
              indicatorClassName={reliabilityScore < 40 ? 'bg-rose-500' : 'bg-indigo-600'}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div className="p-5 bg-miro-surface rounded-2xl border border-miro-hairlineSoft space-y-2">
          <span className="text-xs font-semibold text-slate-800">
            Stakeholder transmission: {currentMove.stakeholderPersona}
          </span>
          <p className="text-sm font-normal text-slate-700 italic leading-relaxed">{currentMove.dialogueText}</p>
        </div>

        <div className="space-y-3">
          {currentMove.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            let containerStyle = 'border-miro-hairline hover:border-slate-400 bg-white text-slate-800';

            if (isSubmitted) {
              if (opt.isOptimal) {
                containerStyle = 'border-2 border-emerald-600 bg-emerald-50/50 text-slate-900 font-medium';
              } else if (isSelected && !opt.isOptimal) {
                containerStyle = 'border-2 border-rose-500 bg-rose-50/60 text-slate-900';
              } else {
                containerStyle = 'border-miro-hairline opacity-45 bg-white';
              }
            } else if (isSelected) {
              containerStyle = 'border-2 border-miro-primary bg-slate-50/80 font-medium text-miro-primary';
            }

            return (
              <div
                key={opt.id}
                onClick={() => !isSubmitted && setSelectedOptionId(opt.id)}
                className={`p-4 rounded-xl border text-sm transition-all duration-150 cursor-pointer leading-normal ${containerStyle}`}
              >
                <p>{opt.text}</p>
              </div>
            );
          })}
        </div>

        {!isSubmitted ? (
          <ConfidenceGate
            selectedConfidence={selectedConfidence}
            onSelectConfidence={setSelectedConfidence}
            onSubmit={handleSubmit}
            hasSelectedAnswer={!!selectedOptionId}
            submitLabel="Commit move decision"
          />
        ) : (
          <div className="mt-6 rounded-2xl border border-miro-hairline bg-miro-surface p-6 space-y-3">
            <p className="text-xs font-semibold text-slate-700">Immediate impact on systems:</p>
            <p className="text-xs text-slate-800 leading-relaxed font-mono">
              {currentMove.options.find((o) => o.id === selectedOptionId)?.techDebtImpact}
            </p>
            <Button onClick={handleNext} className="w-full sm:w-auto gap-2 ml-auto">
              {currentMoveIdx + 1 < drill.moves.length
                ? `Continue to move ${currentMove.moveNumber + 1}`
                : 'Finish scenario'}{' '}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
