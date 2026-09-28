import { AlertCircle, ShieldCheck } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';

export type ConfidenceLevel = 50 | 70 | 85 | 95;

const CONFIDENCE_LEVELS: ConfidenceLevel[] = [50, 70, 85, 95];

interface ConfidenceGateProps {
  selectedConfidence: ConfidenceLevel | null;
  onSelectConfidence: (level: ConfidenceLevel) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitLabel?: string;
  hasSelectedAnswer: boolean;
}

export const ConfidenceGate: React.FC<ConfidenceGateProps> = ({
  selectedConfidence,
  onSelectConfidence,
  onSubmit,
  disabled = false,
  submitLabel = 'Commit decision',
  hasSelectedAnswer,
}) => {
  return (
    <div className="mt-4 sm:mt-5 rounded-xl border border-miro-hairline/80 bg-miro-surfaceSoft/60 p-3.5 sm:p-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-miro-blue/80" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-miro-slate">
            Confidence
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {CONFIDENCE_LEVELS.map((level) => {
          const isSelected = selectedConfidence === level;
          return (
            <button
              key={level}
              type="button"
              disabled={disabled || !hasSelectedAnswer}
              onClick={() => onSelectConfidence(level)}
              className={`flex items-center justify-center py-1.5 px-2 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? 'border-miro-primary bg-miro-card shadow-2xs ring-1 ring-miro-primary text-miro-primary font-semibold'
                  : 'border-miro-hairline/80 bg-miro-card hover:border-miro-hairlineStrong text-miro-slate'
              }`}
            >
              <span>{level}%</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2.5 border-t border-miro-hairlineSoft/80">
        <div className="text-[11px] text-miro-muted flex items-center gap-1.5">
          {!hasSelectedAnswer ? (
            <>
              <AlertCircle className="h-3 w-3 text-miro-yellowText shrink-0" />
              <span>Select an option first</span>
            </>
          ) : !selectedConfidence ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-miro-blue animate-pulse" />
              <span className="font-medium text-miro-slate">Select confidence to commit</span>
            </>
          ) : (
            <span className="text-miro-successText font-medium">
              Ready ({selectedConfidence}% confidence)
            </span>
          )}
        </div>

        <Button
          size="sm"
          onClick={onSubmit}
          disabled={disabled || !hasSelectedAnswer || !selectedConfidence}
          className="w-full sm:w-auto h-8 px-4 text-xs font-medium"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
