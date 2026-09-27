import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfidenceGate, ConfidenceLevel } from './ConfidenceGate';
import { Users, Shield, ArrowRight, RotateCcw, AlertOctagon, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScenarioMove {
  moveNumber: number;
  stakeholderPersona: string;
  dialogueText: string;
  options: {
    id: string;
    text: string;
    trustDelta: number;
    reliabilityDelta: number;
    techDebtImpact: string;
    isOptimal: boolean;
  }[];
}

const SCENARIO_MOVES: ScenarioMove[] = [
  {
    moveNumber: 1,
    stakeholderPersona: 'Chief Technology Officer (CTO)',
    dialogueText:
      '"We have 48 hours until Dreamforce keynotes. The CEO wants to demo an autonomous Agentforce agent that issues full refunds directly to customers up to $5,000 without human approval. Can we skip prompt defense testing to hit the demo window?"',
    options: [
      {
        id: 'm1_a',
        text: 'Agree to bypass prompt defense and deploy directly to production sandbox for speed.',
        trustDelta: 15,
        reliabilityDelta: -35,
        techDebtImpact: 'Severe vulnerability: Prompt injection can trigger unlimited fraudulent refund loops.',
        isOptimal: false,
      },
      {
        id: 'm1_b',
        text: 'Firmly counter with a Well-Architected Guardrail: Enforce a $100 autonomous cap and route >$100 to Human-in-the-Loop Omni-Channel with Trust Layer PII masking active.',
        trustDelta: 5,
        reliabilityDelta: 20,
        techDebtImpact: 'Minimal: Establishes safe boundary pattern while delivering full keynote demo capability.',
        isOptimal: true,
      },
    ],
  },
  {
    moveNumber: 2,
    stakeholderPersona: 'VP of Customer Experience',
    dialogueText:
      '"Our agent seems slow when fetching customer history. The dev team wants to query the entire 20M Account history table synchronously on every single user turn."',
    options: [
      {
        id: 'm2_a',
        text: 'Allow unindexed synchronous queries on every turn to maximize conversational context.',
        trustDelta: -10,
        reliabilityDelta: -30,
        techDebtImpact: 'Catastrophic: Triggers 10,000ms CPU timeouts and locks user sessions during peak hours.',
        isOptimal: false,
      },
      {
        id: 'm2_b',
        text: 'Ground the agent via Data Cloud Unified Profile with pre-computed Calculated Insights instead of live SOQL scans.',
        trustDelta: 10,
        reliabilityDelta: 15,
        techDebtImpact: 'Zero: Decouples analytics from core transaction engine with sub-200ms grounding retrieval.',
        isOptimal: true,
      },
    ],
  },
  {
    moveNumber: 3,
    stakeholderPersona: 'Lead Security Auditor',
    dialogueText:
      '"Our compliance review shows customer Social Security Numbers and credit cards are entering prompt logs in plaintext. We must shut down the agent unless we can guarantee zero retention."',
    options: [
      {
        id: 'm3_a',
        text: 'Activate the Einstein Trust Layer Zero Data Retention and PII Masking policy immediately.',
        trustDelta: 20,
        reliabilityDelta: 10,
        techDebtImpact: 'Resolved: 100% compliance with GDPR/HIPAA with contractual LLM zero data retention.',
        isOptimal: true,
      },
      {
        id: 'm3_b',
        text: 'Write a custom regex trigger in Apex to scrub plaintext logs after they are saved to disk.',
        trustDelta: -25,
        reliabilityDelta: -15,
        techDebtImpact: 'Regulatory violation: Scrubbing after save still violates zero-retention mandates during inference.',
        isOptimal: false,
      },
    ],
  },
];

export const DualMeterScenario: React.FC<{
  onDrillComplete?: (result: { streakDays: number; brierScore: number }) => void;
}> = ({ onDrillComplete }) => {
  const [currentMoveIdx, setCurrentMoveIdx] = useState(0);
  const [trustScore, setTrustScore] = useState(65);
  const [reliabilityScore, setReliabilityScore] = useState(70);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hangoverLogs, setHangoverLogs] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentMove = SCENARIO_MOVES[currentMoveIdx];

  const handleSubmit = () => {
    if (!selectedOptionId || !selectedConfidence) return;

    const chosen = currentMove.options.find((o) => o.id === selectedOptionId);
    if (!chosen) return;

    setTrustScore((prev) => Math.max(0, Math.min(100, prev + chosen.trustDelta)));
    setReliabilityScore((prev) => Math.max(0, Math.min(100, prev + chosen.reliabilityDelta)));
    setHangoverLogs((prev) => [...prev, `${chosen.isOptimal ? '✓' : '⚠️'} Move ${currentMove.moveNumber}: ${chosen.techDebtImpact}`]);

    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentMoveIdx + 1 < SCENARIO_MOVES.length) {
      setCurrentMoveIdx((prev) => prev + 1);
      setSelectedOptionId(null);
      setSelectedConfidence(null);
      setIsSubmitted(false);
    } else {
      setIsCompleted(true);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onDrillComplete?.({ streakDays: 1, brierScore: 90 });
    }
  };

  const handleReset = () => {
    setCurrentMoveIdx(0);
    setTrustScore(65);
    setReliabilityScore(70);
    setSelectedOptionId(null);
    setSelectedConfidence(null);
    setIsSubmitted(false);
    setHangoverLogs([]);
    setIsCompleted(false);
  };

  if (isCompleted) {
    const isSuccess = trustScore >= 60 && reliabilityScore >= 60;
    return (
      <Card className="border-slate-200/90 shadow-md">
        <CardHeader className="text-center pb-2">
          <div className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {isSuccess ? <CheckCircle2 className="h-8 w-8" /> : <AlertOctagon className="h-8 w-8" />}
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {isSuccess ? 'Architectural Crisis Averted!' : 'Technical Debt Hangover!'}
          </h3>
          <p className="text-sm text-slate-500">
            {isSuccess
              ? 'You successfully navigated stakeholder pressure while safeguarding Well-Architected integrity.'
              : 'Short-term compromises degraded platform reliability below operational thresholds.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">Final Stakeholder Trust</span>
              <p className={`text-2xl font-bold ${trustScore >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>{trustScore}%</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">Platform Reliability</span>
              <p className={`text-2xl font-bold ${reliabilityScore >= 60 ? 'text-blue-600' : 'text-rose-600'}`}>{reliabilityScore}%</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800">Architectural Hangover Report:</h4>
            <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-2 text-xs font-mono text-slate-800">
              {hangoverLogs.map((log, i) => (
                <p key={i}>{log}</p>
              ))}
            </div>
          </div>

          <Button onClick={handleReset} variant="outline" className="w-full gap-2">
            <RotateCcw className="h-4 w-4" /> Replay Scenario
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/90 shadow-sm">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="domain">Agentic Enterprise Governance</Badge>
            <Badge variant="pillar">Trust</Badge>
            <Badge variant="pillar">Reliability</Badge>
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Move {currentMove.moveNumber} of {SCENARIO_MOVES.length}
          </span>
        </div>

        {/* Dual Meters */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Users className="h-3.5 w-3.5 text-blue-600" /> Stakeholder Trust
              </span>
              <span className="font-mono text-blue-700">{trustScore}%</span>
            </div>
            <Progress value={trustScore} className="h-2" indicatorClassName={trustScore < 40 ? 'bg-rose-500' : trustScore < 70 ? 'bg-amber-500' : 'bg-emerald-600'} />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Shield className="h-3.5 w-3.5 text-indigo-600" /> Platform Reliability
              </span>
              <span className="font-mono text-indigo-700">{reliabilityScore}%</span>
            </div>
            <Progress value={reliabilityScore} className="h-2" indicatorClassName={reliabilityScore < 40 ? 'bg-rose-500' : 'bg-indigo-600'} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
            Incoming Stakeholder Transmission: {currentMove.stakeholderPersona}
          </span>
          <p className="text-sm font-medium text-blue-950 italic leading-relaxed">
            {currentMove.dialogueText}
          </p>
        </div>

        <div className="space-y-3">
          {currentMove.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => !isSubmitted && setSelectedOptionId(opt.id)}
                className={`p-4 rounded-xl border text-sm transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-2 border-blue-600 bg-blue-50/60 font-medium text-blue-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                } ${isSubmitted && !opt.isOptimal && isSelected ? 'border-rose-400 bg-rose-50/70' : ''}`}
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
            submitLabel="Commit Move Decision"
          />
        ) : (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 animate-in fade-in-50 duration-200">
            <p className="text-xs font-semibold text-slate-700">Immediate Impact on Systems:</p>
            <p className="text-xs text-slate-800 leading-relaxed font-mono">
              {currentMove.options.find((o) => o.id === selectedOptionId)?.techDebtImpact}
            </p>
            <Button onClick={handleNext} className="w-full sm:w-auto gap-2 ml-auto">
              Continue to Move {currentMove.moveNumber + 1} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
