import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import { DrillFormat, LessonDrillDefinition } from '@arcgym/drill-core';
import { CheckCircle2, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';

export const LessonStepper: React.FC<{
  drill: LessonDrillDefinition;
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
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [stageCorrect, setStageCorrect] = useState<boolean[]>([]);

  useEffect(() => {
    setCurrentStageIdx(0);
    setSelectedOptionId(null);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setIsCompleted(false);
    setStageCorrect([]);
  }, [drill.id]);

  const currentStage = drill.stages[currentStageIdx];
  const chosenOption = currentStage.options.find((o) => o.id === selectedOptionId);

  const handleSubmit = () => {
    if (!selectedOptionId || !selectedConfidence) return;
    const isCorrect = Boolean(chosenOption?.isCorrect);
    setStageCorrect((prev) => {
      const next = [...prev];
      next[currentStageIdx] = isCorrect;
      return next;
    });
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentStageIdx + 1 < drill.stages.length) {
      setCurrentStageIdx((prev) => prev + 1);
      setSelectedOptionId(null);
      setSelectedConfidence(null);
      setIsSubmitted(false);
    } else {
      const outcomes = [...stageCorrect];
      outcomes[currentStageIdx] = Boolean(chosenOption?.isCorrect);
      const correct = outcomes.filter(Boolean).length;
      const accuracy = correct / drill.stages.length;
      setIsCompleted(true);
      onDrillComplete?.({
        drillId: drill.id,
        format: 'Lesson',
        score: Math.round(accuracy * 100),
        accuracy,
        streakDays: 1,
      });
    }
  };

  const handleReset = () => {
    setCurrentStageIdx(0);
    setSelectedOptionId(null);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setIsCompleted(false);
    setStageCorrect([]);
  };

  if (isCompleted) {
    return (
      <Card className="border-miro-hairline bg-white shadow-xs">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-miro-successLight text-miro-successText">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-miro-primary">
            {drill.stages.length}-stage refactor complete
          </h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            You worked through a Well-Architected coaching path grounded in official platform guidance.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="p-5 bg-miro-surface rounded-2xl border border-miro-hairlineSoft space-y-2 text-xs text-slate-700">
            <p className="font-medium text-miro-primary">Stages completed:</p>
            {drill.stages.map((s) => (
              <p key={s.stageNumber}>✓ {s.stageName}</p>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleReset} variant="secondary" className="flex-1 gap-2">
              <RotateCcw className="h-4 w-4" /> Practice again
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
          <span className="text-xs text-slate-500 font-medium">{currentStage.stageName}</span>
        </div>

        <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: `repeat(${drill.stages.length}, minmax(0, 1fr))` }}>
          {drill.stages.map((s, idx) => (
            <div
              key={s.stageNumber}
              className={`h-1.5 rounded-full transition-all ${
                idx < currentStageIdx
                  ? 'bg-emerald-600'
                  : idx === currentStageIdx
                    ? 'bg-miro-primary'
                    : 'bg-miro-hairlineSoft'
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-medium text-miro-primary leading-relaxed">
            {currentStage.scenario}
          </h3>
        </div>

        <div className="space-y-3">
          {currentStage.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            let borderStyle = 'border-miro-hairline hover:border-slate-400 bg-white text-slate-800';

            if (isSubmitted) {
              if (opt.isCorrect) {
                borderStyle = 'border-2 border-emerald-600 bg-emerald-50/50 text-slate-900 font-medium';
              } else if (isSelected && !opt.isCorrect) {
                borderStyle = 'border-2 border-rose-500 bg-rose-50/60 text-slate-900';
              } else {
                borderStyle = 'border-miro-hairline opacity-45 bg-white';
              }
            } else if (isSelected) {
              borderStyle = 'border-2 border-miro-primary bg-slate-50/80 font-medium text-miro-primary';
            }

            return (
              <div
                key={opt.id}
                onClick={() => !isSubmitted && setSelectedOptionId(opt.id)}
                className={`p-4 rounded-xl border text-sm transition-all duration-150 cursor-pointer leading-normal ${borderStyle}`}
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
            submitLabel="Commit stage refactor"
          />
        ) : (
          <div className="mt-6 rounded-2xl border border-miro-hairline bg-miro-surface p-6 space-y-3">
            <div className="flex items-center gap-2">
              {chosenOption?.isCorrect ? (
                <Badge variant="success" className="gap-1.5 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Well-Architected choice
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Antipattern risk
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
              {chosenOption?.coachingFeedback}
            </p>
            <Button onClick={handleNext} className="w-full sm:w-auto gap-2 ml-auto">
              {currentStageIdx + 1 < drill.stages.length ? 'Advance to next stage' : 'Finish lesson'}{' '}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
