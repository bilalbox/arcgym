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
    <div className="inline-flex p-1 bg-miro-surface rounded-full border border-miro-hairline">
      <button
        type="button"
        onClick={() => onChange('domains')}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
          value === 'domains'
            ? 'bg-miro-primary text-miro-onPrimary shadow-xs'
            : 'text-miro-slate hover:text-miro-primary'
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>Architectural Domains</span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            value === 'domains' ? 'bg-miro-onPrimary/15 text-miro-onPrimary' : 'bg-miro-hairlineSoft text-miro-slate'
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
            ? 'bg-miro-primary text-miro-onPrimary shadow-xs'
            : 'text-miro-slate hover:text-miro-primary'
        }`}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Well-Architected Pillars</span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            value === 'pillars' ? 'bg-miro-onPrimary/15 text-miro-onPrimary' : 'bg-miro-hairlineSoft text-miro-slate'
          }`}
        >
          {measuredPillarsCount}/5
        </span>
      </button>
    </div>
  );
};
