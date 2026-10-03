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

/** Kind of repair hint derived from a `build-drills` `[ERROR]` line. */
export type BuildErrorKind =
  | 'citation_manifest'
  | 'missing_rationale'
  | 'missing_distractor_antipattern'
  | 'missing_correct_option'
  | 'unknown';

/** Structured hint for agents repairing a soft-ingest failure from `buildError` text. */
export type BuildErrorRepairHint = {
  kind: BuildErrorKind;
  /** False when the draft alone cannot satisfy Citation Manifest / grounding. */
  surgicallyFixable: boolean;
  message: string;
  optionId?: string;
  citedUrl?: string;
};

const ERROR_LINE = /^\s*\[ERROR\]\s+[^:]+:\s*(.+)$/;
const CITATION_MANIFEST =
  /^correct option (\S+) must cite an exact Citation Manifest URL from grounding chunk exports \(got (.+)\)$/;
const MISSING_RATIONALE = /^option (\S+) is missing rationale$/;
const MISSING_DISTRACTOR = /^incorrect option (\S+) is missing distractorAntipattern$/;
const MISSING_CORRECT = /\bhas NO correct option marked$/;

/**
 * Parse soft-ingest `buildError` text into structured repair hints.
 * Citation Manifest mismatches are marked not surgically fixable.
 */
export function parseBuildErrorHints(buildError: string): BuildErrorRepairHint[] {
  if (!buildError.trim()) return [];

  const hints: BuildErrorRepairHint[] = [];
  for (const line of buildError.split(/\r?\n/)) {
    const match = ERROR_LINE.exec(line);
    if (!match) continue;
    const message = match[1]!;

    const citation = CITATION_MANIFEST.exec(message);
    if (citation) {
      hints.push({
        kind: 'citation_manifest',
        surgicallyFixable: false,
        optionId: citation[1],
        citedUrl: citation[2] === 'none' ? undefined : citation[2],
        message,
      });
      continue;
    }

    const rationale = MISSING_RATIONALE.exec(message);
    if (rationale) {
      hints.push({
        kind: 'missing_rationale',
        surgicallyFixable: true,
        optionId: rationale[1],
        message,
      });
      continue;
    }

    const distractor = MISSING_DISTRACTOR.exec(message);
    if (distractor) {
      hints.push({
        kind: 'missing_distractor_antipattern',
        surgicallyFixable: true,
        optionId: distractor[1],
        message,
      });
      continue;
    }

    if (MISSING_CORRECT.test(message)) {
      hints.push({
        kind: 'missing_correct_option',
        surgicallyFixable: true,
        message,
      });
      continue;
    }

    // Truncated or reformatted Citation Manifest errors still require grounding handoff.
    if (message.includes('Citation Manifest')) {
      hints.push({
        kind: 'citation_manifest',
        surgicallyFixable: false,
        message,
      });
      continue;
    }

    hints.push({
      kind: 'unknown',
      surgicallyFixable: true,
      message,
    });
  }
  return hints;
}

/**
 * True when findings include a Citation Manifest / missing-grounding mismatch
 * that cannot be fixed by editing the draft alone — hand off to generating-drills.
 */
export function findingsRequireGroundingHandoff(findings: IngestFindings): boolean {
  if (!findings.buildError) return false;
  return parseBuildErrorHints(findings.buildError).some((h) => !h.surgicallyFixable);
}

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
