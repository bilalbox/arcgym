import React from 'react';
import { DimensionProficiency } from '@arcgym/drill-core';

interface StrengthsSectionProps {
  items: DimensionProficiency[];
  dimensionLabel: string;
}

export const StrengthsSection: React.FC<StrengthsSectionProps> = ({
  items,
  dimensionLabel,
}) => {
  if (items.length === 0) return null;

  return (
    <details id="strengths" className="group border-b border-miro-hairline first:border-t">
      <summary className="flex items-center gap-3 cursor-pointer list-none py-3.5 min-h-[44px] text-[15px] font-medium text-miro-primary hover:text-slate-600 transition-colors">
        <span
          aria-hidden="true"
          className="text-miro-blue text-[20px] leading-none w-4 text-center shrink-0 transition-transform group-open:rotate-45"
        >
          +
        </span>
        <span>Your strengths</span>
        <span className="ml-auto text-[12.5px] font-normal text-slate-400">
          {items.length} {items.length === 1 ? dimensionLabel : `${dimensionLabel}s`}
        </span>
      </summary>

      <div className="pb-5 pl-7">
        <p className="text-[12.5px] text-slate-500 mb-3">
          80% or better across at least four questions.
        </p>

        <div className="bg-white border border-miro-hairline rounded-2xl shadow-xs px-4 py-1 max-w-3xl divide-y divide-miro-hairlineSoft">
          {items.map((item) => (
            <div
              key={item.id}
              className="py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_minmax(120px,180px)_7.5rem] items-center gap-x-4 gap-y-1.5"
            >
              <p className="font-medium text-[14px] text-miro-primary leading-tight col-span-2 sm:col-span-1">
                {item.label}
              </p>

              <div className="w-full">
                <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${item.accuracy}%` }}
                  />
                </div>
              </div>

              <p className="text-[12.5px] whitespace-nowrap text-right sm:text-left text-slate-600">
                <span className="font-semibold text-emerald-700">{item.accuracy}%</span>{' '}
                <span className="text-slate-400">
                  ({item.correctQuestions}/{item.totalQuestions})
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
};
