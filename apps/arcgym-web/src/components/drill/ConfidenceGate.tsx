import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export type ConfidenceLevel = 50 | 70 | 85 | 95;

interface ConfidenceOption {
  level: ConfidenceLevel;
  label: string;
  sublabel: string;
  badgeVariant: 'outline' | 'teal' | 'lavender' | 'default';
}

const CONFIDENCE_LEVELS: ConfidenceOption[] = [
  {
    level: 50,
    label: '50% Speculative',
    sublabel: 'Low certainty / exploring',
    badgeVariant: 'outline',
  },
  {
    level: 70,
    label: '70% Plausible',
    sublabel: 'Calculated trade-off',
    badgeVariant: 'teal',
  },
  {
    level: 85,
    label: '85% High conviction',
    sublabel: 'Well-Architected pattern',
    badgeVariant: 'lavender',
  },
  {
    level: 95,
    label: '95% Architectural axiom',
    sublabel: 'Immutable platform law',
    badgeVariant: 'default',
  },
];

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
            Pre-submit confidence calibration
          </span>
        </div>
        <span className="text-xs text-slate-500">
          Overconfidence carries a 2.5× penalty
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        {CONFIDENCE_LEVELS.map((opt) => {
          const isSelected = selectedConfidence === opt.level;
          return (
            <button
              key={opt.level}
              type="button"
              disabled={disabled || !hasSelectedAnswer}
              onClick={() => onSelectConfidence(opt.level)}
              className={`flex flex-col text-left p-3.5 rounded-xl border text-sm transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? 'border-miro-primary bg-white shadow-xs ring-1 ring-miro-primary'
                  : 'border-miro-hairline bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs font-semibold ${isSelected ? 'text-miro-primary' : 'text-slate-800'}`}>
                  {opt.label}
                </span>
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-miro-blue" />}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                {opt.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-miro-hairlineSoft">
        <div className="text-xs text-slate-600 flex items-center gap-1.5">
          {!hasSelectedAnswer ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Select an architectural option first</span>
            </>
          ) : !selectedConfidence ? (
            <>
              <span className="h-2 w-2 rounded-full bg-miro-blue animate-pulse" />
              <span className="font-medium text-slate-700">Choose your conviction level to unlock commit</span>
            </>
          ) : (
            <span className="text-emerald-700 font-medium">
              Ready to commit with {selectedConfidence}% conviction
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
