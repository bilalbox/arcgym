import type { ConfidenceAnchor } from '@arcgym/drill-core';
import type React from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ConfidenceGate, type ConfidenceLevel } from './ConfidenceGate';

export interface FirstCallPanelProps {
  label?: string;
  placeholder?: string;
  rows?: number;
  submitLabel: string;
  skipLabel?: string;
  canSkip: boolean;
  hypothesis: string;
  onHypothesisChange: (value: string) => void;
  confidence: ConfidenceLevel | null;
  onConfidenceChange: (value: ConfidenceLevel | null) => void;
  onSubmit: (hypothesis: string, confidence?: ConfidenceAnchor) => void;
  onSkip: () => void;
  children?: ReactNode;
}

export const FirstCallPanel: React.FC<FirstCallPanelProps> = ({
  label = 'First Call',
  placeholder = 'One-line hypothesis',
  rows = 2,
  submitLabel,
  skipLabel = 'Skip',
  canSkip,
  hypothesis,
  onHypothesisChange,
  confidence,
  onConfidenceChange,
  onSubmit,
  onSkip,
  children,
}) => {
  return (
    <div className="space-y-3">
      {children}
      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-miro-slate">
          {label}
        </span>
        <textarea
          value={hypothesis}
          onChange={(e) => onHypothesisChange(e.target.value)}
          rows={rows}
          maxLength={280}
          placeholder={placeholder}
          className="w-full rounded-xl border border-miro-hairline bg-miro-card px-3.5 py-3 text-sm text-miro-primary placeholder:text-miro-muted focus:outline-none focus:border-miro-hairlineStrong resize-none"
        />
      </label>
      <ConfidenceGate
        selectedConfidence={confidence}
        onSelectConfidence={onConfidenceChange}
        hasSelectedAnswer={hypothesis.trim().length > 0}
        requireConfidence={false}
        confidenceLabel="Confidence"
        answerRequiredHint="Write a hypothesis first"
        submitLabel={submitLabel}
        onSubmit={() => {
          const trimmed = hypothesis.trim();
          if (!trimmed) return;
          onSubmit(trimmed, confidence ? ((confidence / 100) as ConfidenceAnchor) : undefined);
        }}
      />
      {canSkip && (
        <Button variant="secondary" className="w-full" onClick={onSkip}>
          {skipLabel}
        </Button>
      )}
    </div>
  );
};
