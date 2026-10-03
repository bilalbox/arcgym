import type { ValidationFinding } from '@arcgym/drill-core';
import type React from 'react';

interface ValidationFindingsProps {
  findings: ValidationFinding[];
}

export const ValidationFindings: React.FC<ValidationFindingsProps> = ({ findings }) => {
  if (findings.length === 0) {
    return <p className="text-xs text-miro-slate">No validation findings</p>;
  }

  return (
    <ul className="space-y-1.5">
      {findings.map((f) => (
        <li
          key={`${f.ruleId}:${f.where}:${f.message}`}
          className="text-xs text-miro-slate border border-red-200 dark:border-red-950 rounded-md px-2.5 py-1.5 bg-red-50/50 dark:bg-red-950/20"
        >
          <span className="font-mono text-red-700 dark:text-red-400 font-medium">{f.ruleId}</span>
          {f.where && (
            <>
              <span className="text-miro-muted"> · </span>
              <span className="font-mono">{f.where}</span>
            </>
          )}
          <span className="block mt-0.5 text-miro-primary">{f.message}</span>
        </li>
      ))}
    </ul>
  );
};
