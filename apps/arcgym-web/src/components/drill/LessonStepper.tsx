import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import { CheckCircle2, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LessonStage {
  stageNumber: number;
  stageName: string;
  scenario: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    coachingFeedback: string;
  }[];
}

const LESSON_STAGES: LessonStage[] = [
  {
    stageNumber: 1,
    stageName: 'Stage 1: Forensic Diagnosis',
    scenario:
      'A 14-element record-triggered Flow on Case runs after-save. Under a bulk update of 200 cases via Data Loader, the transaction crashes with Apex CPU time limit exceeded (10,001 ms). What is the root architectural bottleneck?',
    options: [
      {
        id: 'st1_a',
        text: 'The Flow contains a loop with an embedded Get Records and Update Records element executing queries inside the iteration.',
        isCorrect: true,
        coachingFeedback: 'Correct! Loops with data operations inside Flows violate bulkification, executing 200 distinct SOQL and DML statements.',
      },
      {
        id: 'st1_b',
        text: 'Salesforce record-triggered Flows cannot process more than 5 records per batch.',
        isCorrect: false,
        coachingFeedback: 'False assumption: Flows are automatically bulkified by the platform engine unless loops contain DML/SOQL operations.',
      },
    ],
  },
  {
    stageNumber: 2,
    stageName: 'Stage 2: Target Architecture Pattern',
    scenario:
      'To refactor this high-volume Case processing pipeline into a Well-Architected Operational Excellence standard, what is the recommended target architecture?',
    options: [
      {
        id: 'st2_a',
        text: 'Migrate the heavy calculations into an Apex Trigger Handler framework utilizing Maps and Set collections for bulk single-query lookups.',
        isCorrect: true,
        coachingFeedback: 'Correct! The Automation Decision Guide explicitly recommends Apex for complex looping, math, and high-frequency bulkification.',
      },
      {
        id: 'st2_b',
        text: 'Split the single Flow into 5 separate record-triggered Flows on Case without an entry condition.',
        isCorrect: false,
        coachingFeedback: 'Antipattern: Multiple uncontrolled Flows trigger recursion, multiply CPU time, and have non-deterministic execution order.',
      },
    ],
  },
  {
    stageNumber: 3,
    stageName: 'Stage 3: Migration & Cutover Strategy',
    scenario:
      'How should you safely cut over from the legacy Flow monolith to the new Apex trigger handler in an active 24/7 enterprise production org?',
    options: [
      {
        id: 'st3_a',
        text: 'Deploy an org-wide Custom Permission or Custom Metadata feature toggle allowing instant zero-downtime rollback if needed.',
        isCorrect: true,
        coachingFeedback: 'Correct! Well-Architected Operational Excellence mandates feature toggles for high-impact automation cutovers.',
      },
      {
        id: 'st3_b',
        text: 'Deactivate the Flow directly in Production during business hours and deploy the trigger via Change Set.',
        isCorrect: false,
        coachingFeedback: 'Risky! Direct deactivation without fallback causes race conditions and dropped transaction updates during cutover.',
      },
    ],
  },
  {
    stageNumber: 4,
    stageName: 'Stage 4: Telemetry & Observability',
    scenario:
      'What observability tool should be configured to proactively monitor whether the new Apex handler is staying within healthy CPU thresholds?',
    options: [
      {
        id: 'st4_a',
        text: 'Subscribe to ApexExecution and FlowExecution Event Monitoring Real-Time Event Streams with CRM Analytics dashboards.',
        isCorrect: true,
        coachingFeedback: 'Correct! Event Monitoring provides sub-second transaction observability across CPU, SOQL, and DB time.',
      },
      {
        id: 'st4_b',
        text: 'Wait for users to report email error notifications when limit exceptions occur.',
        isCorrect: false,
        coachingFeedback: 'Antipattern: Reactive user reports indicate failed operational governance and unmonitored production debt.',
      },
    ],
  },
];

export const LessonStepper: React.FC<{
  onDrillComplete?: (result: { streakDays: number; brierScore: number }) => void;
}> = ({ onDrillComplete }) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentStage = LESSON_STAGES[currentStageIdx];

  const handleSubmit = () => {
    if (!selectedOptionId || !selectedConfidence) return;
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentStageIdx + 1 < LESSON_STAGES.length) {
      setCurrentStageIdx((prev) => prev + 1);
      setSelectedOptionId(null);
      setSelectedConfidence(null);
      setIsSubmitted(false);
    } else {
      setIsCompleted(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onDrillComplete?.({ streakDays: 1, brierScore: 95 });
    }
  };

  const handleReset = () => {
    setCurrentStageIdx(0);
    setSelectedOptionId(null);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setIsCompleted(false);
  };

  const chosenOption = currentStage.options.find((o) => o.id === selectedOptionId);

  if (isCompleted) {
    return (
      <Card className="border-miro-hairline bg-white shadow-xs">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-miro-successLight text-miro-successText">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-miro-primary">4-stage refactor complete</h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            You successfully refactored a failing legacy automation monolith into a production-grade Well-Architected solution.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="p-5 bg-miro-surface rounded-2xl border border-miro-hairlineSoft space-y-2 text-xs text-slate-700">
            <p className="font-medium text-miro-primary">Refactoring milestones achieved:</p>
            <p>✓ Stage 1: Identified SOQL-in-loop CPU bottleneck</p>
            <p>✓ Stage 2: Mapped to bulkified Apex Trigger Handler pattern</p>
            <p>✓ Stage 3: Engineered zero-downtime feature toggle cutover</p>
            <p>✓ Stage 4: Deployed Real-Time Event Monitoring observability</p>
          </div>
          <Button onClick={handleReset} variant="secondary" className="w-full gap-2">
            <RotateCcw className="h-4 w-4" /> Practice another refactor
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-miro-hairline bg-white shadow-xs">
      <CardHeader className="pb-4 border-b border-miro-hairlineSoft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="domain">Automation Governance</Badge>
            <Badge variant="pillar">Operational_Excellence</Badge>
            <Badge variant="pillar">Reliability</Badge>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {currentStage.stageName}
          </span>
        </div>

        {/* 4-Stage Stepper Pills */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {LESSON_STAGES.map((s, idx) => (
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
              Advance to next stage <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
