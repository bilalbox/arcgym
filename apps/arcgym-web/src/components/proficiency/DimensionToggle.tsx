import React from 'react';
import { ProficiencyDimension } from '@arcgym/drill-core';
import { LayoutGrid, ShieldCheck } from 'lucide-react';

interface DimensionToggleProps {
  value: ProficiencyDimension;
  onChange: (dimension: ProficiencyDimension) => void;
  measuredDomainsCount: number;
  measuredPillarsCount: number;
}

export const DimensionToggle: React.FC<DimensionToggleProps> = ({
  value,
  onChange,
  measuredDomainsCount,
  measuredPillarsCount,
}) => {
  return (
    <div className="inline-flex p-1 bg-slate-100 rounded-full border border-miro-hairline">
      <button
        type="button"
        onClick={() => onChange('domains')}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
          value === 'domains'
            ? 'bg-miro-primary text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>Architectural Domains</span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            value === 'domains' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
          }`}
        >
          {measuredDomainsCount}/7
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChange('pillars')}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
          value === 'pillars'
            ? 'bg-miro-primary text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Well-Architected Pillars</span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            value === 'pillars' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
          }`}
        >
          {measuredPillarsCount}/5
        </span>
      </button>
    </div>
  );
};
