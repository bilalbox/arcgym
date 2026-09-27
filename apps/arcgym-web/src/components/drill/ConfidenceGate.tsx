import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertCircle } from 'lucide-react';

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
    <div className="mt-8 rounded-2xl border border-miro-hairline bg-miro-surface p-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-miro-blue" />
          <span className="text-xs font-semibold text-miro-primary">
            Confidence
          </span>
        </div>
        <span className="text-xs text-slate-600">
          Overconfidence carries a 2.5× penalty
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {CONFIDENCE_LEVELS.map((level) => {
          const isSelected = selectedConfidence === level;
          return (
            <button
              key={level}
              type="button"
              disabled={disabled || !hasSelectedAnswer}
              onClick={() => onSelectConfidence(level)}
              className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? 'border-miro-primary bg-white shadow-xs ring-1 ring-miro-primary text-miro-primary'
                  : 'border-miro-hairline bg-white hover:border-slate-300 text-slate-700'
              }`}
            >
              <span>{level}%</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-miro-hairlineSoft">
        <div className="text-xs text-slate-600 flex items-center gap-1.5">
          {!hasSelectedAnswer ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Select an option first</span>
            </>
          ) : !selectedConfidence ? (
            <>
              <span className="h-2 w-2 rounded-full bg-miro-blue animate-pulse" />
              <span className="font-medium text-slate-700">Select confidence to continue</span>
            </>
          ) : (
            <span className="text-emerald-700 font-medium">
              Ready to submit with {selectedConfidence}% confidence
            </span>
          )}
        </div>

        <Button
          onClick={onSubmit}
          disabled={disabled || !hasSelectedAnswer || !selectedConfidence}
          className="w-full sm:w-auto font-medium"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
