import * as fs from 'node:fs';
import type { WordingFinding } from '../lint/wording.js';

/** Editorial sidecar written beside a draft when ingest fails. Not learner-facing. */
export type IngestFindings = {
  drillId: string;
  failedAt: string;
  reasons: Array<'validation' | 'wording'>;
  wordingFindings?: WordingFinding[];
  buildError?: string;
};

/** `content/drills/<id>.json` → `content/drills/<id>.findings.json` */
export function findingsSidecarPath(drillJsonPath: string): string {
  if (drillJsonPath.endsWith('.json')) {
    return `${drillJsonPath.slice(0, -'.json'.length)}.findings.json`;
  }
  return `${drillJsonPath}.findings.json`;
}

/** Persist ingest failure findings next to the draft Drill (draft file left untouched). */
export function writeIngestFindings(drillJsonPath: string, findings: IngestFindings): void {
  fs.writeFileSync(
    findingsSidecarPath(drillJsonPath),
    `${JSON.stringify(findings, null, 2)}\n`,
    'utf-8',
  );
}

/** Remove a stale findings sidecar after a clean successful ingest. */
export function clearIngestFindings(drillJsonPath: string): void {
  const sidecar = findingsSidecarPath(drillJsonPath);
  if (fs.existsSync(sidecar)) {
    fs.unlinkSync(sidecar);
  }
}
