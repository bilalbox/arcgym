import type React from 'react';

export const StudioBanner: React.FC = () => (
  <div
    role="status"
    className="border-b border-miro-hairlineStrong bg-miro-primary text-miro-onPrimary"
  >
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wider">Studio</span>
      <span className="text-[11px] text-miro-onPrimary/70">Local DEV · writes content/drills</span>
    </div>
  </div>
);
