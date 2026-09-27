import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export type ConfidenceLevel = 50 | 70 | 85 | 95;

interface ConfidenceOption {
  level: ConfidenceLevel;
  label: string;
  sublabel: string;
  colorClass: string;
}

const CONFIDENCE_LEVELS: ConfidenceOption[] = [
  {
    level: 50,
    label: '50% Speculative',
    sublabel: 'Low conviction / Exploring',
    colorClass: 'hover:border-slate-400 data-[selected=true]:border-slate-600 data-[selected=true]:bg-slate-50',
  },
  {
    level: 70,
    label: '70% Plausible',
    sublabel: 'Reasonable trade-off',
    colorClass: 'hover:border-sky-400 data-[selected=true]:border-sky-600 data-[selected=true]:bg-sky-50',
  },
  {
    level: 85,
    label: '85% Conviction',
    sublabel: 'Well-Architected pattern',
    colorClass: 'hover:border-blue-400 data-[selected=true]:border-blue-600 data-[selected=true]:bg-blue-50',
  },
  {
    level: 95,
    label: '95% Axiom',
    sublabel: 'Immutable platform law',
    colorClass: 'hover:border-emerald-400 data-[selected=true]:border-emerald-600 data-[selected=true]:bg-emerald-50',
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
  submitLabel = 'Commit Architectural Decision',
  hasSelectedAnswer,
}) => {
  return (
    <div className="mt-6 rounded-xl border border-slate-200/90 bg-slate-50/70 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Universal Pre-Submit Confidence Gate
          </span>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Asymmetric Brier Scoring: Overconfidence error has a 2.5× penalty
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        {CONFIDENCE_LEVELS.map((opt) => {
          const isSelected = selectedConfidence === opt.level;
          return (
            <button
              key={opt.level}
              type="button"
              disabled={disabled || !hasSelectedAnswer}
              onClick={() => onSelectConfidence(opt.level)}
              data-selected={isSelected}
              className={`flex flex-col text-left p-3 rounded-lg border text-sm transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? 'border-2 border-blue-600 bg-white shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white/90 hover:bg-white hover:border-slate-300'
              }`}
            >
              <span className={`font-semibold text-xs sm:text-sm ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                {opt.label}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                {opt.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          {!hasSelectedAnswer ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>Select an architectural option first</span>
            </>
          ) : !selectedConfidence ? (
            <>
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="font-medium text-slate-700">Select your conviction level to unlock commit</span>
            </>
          ) : (
            <span className="text-emerald-700 font-medium">
              ✓ Ready to commit with {selectedConfidence}% confidence
            </span>
          )}
        </div>

        <Button
          onClick={onSubmit}
          disabled={disabled || !hasSelectedAnswer || !selectedConfidence}
          className="w-full sm:w-auto font-semibold px-6 shadow-sm"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
