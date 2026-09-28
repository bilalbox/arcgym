import React from 'react';
import { DimensionProficiency } from '@arcgym/drill-core';

interface CollectingDataSectionProps {
  items: DimensionProficiency[];
  dimensionLabel: string;
  onReviewDrills: (id: string) => void;
}

export const CollectingDataSection: React.FC<CollectingDataSectionProps> = ({
  items,
  dimensionLabel,
  onReviewDrills,
}) => {
  if (items.length === 0) return null;

  return (
    <details id="collecting" className="group border-b border-miro-hairline first:border-t">
      <summary className="flex items-center gap-3 cursor-pointer list-none py-3.5 min-h-[44px] text-[15px] font-medium text-miro-primary hover:text-miro-slate transition-colors">
        <span
          aria-hidden="true"
          className="text-miro-blue text-[20px] leading-none w-4 text-center shrink-0 transition-transform group-open:rotate-45"
        >
          +
        </span>
        <span>Still collecting data</span>
        <span className="ml-auto text-[12.5px] font-normal text-miro-muted">
          {items.length} {items.length === 1 ? dimensionLabel : `${dimensionLabel}s`}
        </span>
      </summary>

      <div className="pb-5 pl-7">
        <p className="text-[12.5px] text-miro-slate mb-3">
          You've answered fewer than four questions, so no scores are showing yet. Complete drills in these areas to activate on your radar.
        </p>

        <div className="bg-miro-card border border-miro-hairline rounded-2xl shadow-xs px-4 py-1 divide-y divide-miro-hairlineSoft">
          {items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[14px] text-miro-primary leading-tight truncate">
                  {item.label}
                </p>
                <p className="text-[12px] text-miro-muted mt-0.5">
                  {item.totalQuestions} of 4 answered so far
                </p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => onReviewDrills(item.id)}
                  className="text-[12.5px] font-medium text-miro-blue hover:text-miro-blueDeep cursor-pointer transition-colors"
                >
                  Practice drills
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
};
