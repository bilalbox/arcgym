import React from 'react';
import { DimensionProficiency } from '@arcgym/drill-core';
import { ArrowRight } from 'lucide-react';

interface WhereToStartSectionProps {
  items: DimensionProficiency[];
  dimensionLabel: string;
  onReviewDrills: (id: string) => void;
}

export const WhereToStartSection: React.FC<WhereToStartSectionProps> = ({
  items,
  dimensionLabel,
  onReviewDrills,
}) => {
  if (items.length === 0) return null;

  return (
    <details id="start" open className="group border-b border-miro-hairline first:border-t">
      <summary className="flex items-center gap-3 cursor-pointer list-none py-3.5 min-h-[44px] text-[15px] font-medium text-miro-primary hover:text-slate-600 transition-colors">
        <span
          aria-hidden="true"
          className="text-miro-blue text-[20px] leading-none w-4 text-center shrink-0 transition-transform group-open:rotate-45"
        >
          +
        </span>
        <span>Where to start</span>
        <span className="ml-auto text-[12.5px] font-normal text-slate-400">
          {items.length} {items.length === 1 ? dimensionLabel : `${dimensionLabel}s`}
        </span>
      </summary>

      <div className="pb-5 pl-7">
        <p className="text-[12.5px] text-slate-600 mb-3">
          Your lowest results so far. A few more drills in these will move your radar the most.
        </p>

        <div className="grid gap-3 sm:grid-cols-3 items-start">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-miro-hairline rounded-2xl shadow-xs p-4 flex flex-col justify-between"
            >
              <div>
                <p className="font-medium text-[15px] text-miro-primary leading-tight mb-1">
                  {item.label}
                </p>
                <p className="text-[12px] mb-2 text-slate-600">
                  <span className="font-semibold text-miro-primary">{item.accuracy}%</span>{' '}
                  <span className="text-slate-400">
                    ({item.correctQuestions}/{item.totalQuestions}) of questions right
                  </span>
                </p>

                {/* Meter Bar */}
                <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-miro-blue transition-all duration-300"
                    style={{ width: `${item.accuracy}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-miro-hairlineSoft">
                <button
                  type="button"
                  onClick={() => onReviewDrills(item.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 font-medium cursor-pointer transition-colors text-xs px-3 py-2 rounded-full border border-miro-hairlineStrong text-miro-primary hover:bg-slate-100 hover:border-slate-400"
                >
                  Review your drills <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
};
