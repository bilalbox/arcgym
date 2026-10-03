import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearIngestFindings,
  findingsRequireGroundingHandoff,
  findingsSidecarPath,
  type IngestFindings,
  parseBuildErrorHints,
  writeIngestFindings,
} from '../index.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tempDrillPath(id: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arcgym-ingest-'));
  tempDirs.push(dir);
  const drillPath = path.join(dir, `${id}.json`);
  fs.writeFileSync(drillPath, `${JSON.stringify({ id, status: 'draft' }, null, 2)}\n`);
  return drillPath;
}

describe('soft ingest findings sidecar', () => {
  it('writes findings next to the draft and leaves the draft in place', () => {
    const drillPath = tempDrillPath('AGD-00999');
    const findings: IngestFindings = {
      drillId: 'AGD-00999',
      failedAt: '2026-10-03T00:00:00.000Z',
      reasons: ['wording'],
      wordingFindings: [
        {
          ruleId: 'length-tell',
          where: 'steps[0].options[0].rationale',
          message: 'too long',
        },
      ],
    };

    writeIngestFindings(drillPath, findings);

    expect(fs.existsSync(drillPath)).toBe(true);
    const sidecar = findingsSidecarPath(drillPath);
    expect(fs.existsSync(sidecar)).toBe(true);
    expect(JSON.parse(fs.readFileSync(sidecar, 'utf-8'))).toEqual(findings);
  });

  it('clears a prior findings sidecar on successful ingest', () => {
    const drillPath = tempDrillPath('AGD-00998');
    writeIngestFindings(drillPath, {
      drillId: 'AGD-00998',
      failedAt: '2026-10-03T00:00:00.000Z',
      reasons: ['validation'],
      buildError: 'citation missing',
    });

    clearIngestFindings(drillPath);

    expect(fs.existsSync(drillPath)).toBe(true);
    expect(fs.existsSync(findingsSidecarPath(drillPath))).toBe(false);
  });
});

describe('parseBuildErrorHints', () => {
  it('marks Citation Manifest mismatches as not surgically fixable', () => {
    const hints = parseBuildErrorHints(
      '  [ERROR] AGD-00997.json: correct option opt-a must cite an exact Citation Manifest URL from grounding chunk exports (got https://trailhead.salesforce.com/content/learn/modules/x)',
    );

    expect(hints).toEqual([
      {
        kind: 'citation_manifest',
        surgicallyFixable: false,
        optionId: 'opt-a',
        citedUrl: 'https://trailhead.salesforce.com/content/learn/modules/x',
        message:
          'correct option opt-a must cite an exact Citation Manifest URL from grounding chunk exports (got https://trailhead.salesforce.com/content/learn/modules/x)',
      },
    ]);
  });

  it('extracts surgically fixable option-field errors', () => {
    const hints = parseBuildErrorHints(
      [
        '  [ERROR] AGD-00996.json: option opt-b is missing rationale',
        '  [ERROR] AGD-00996.json: incorrect option opt-c is missing distractorAntipattern',
        '  [ERROR] AGD-00996.json: step st-1 has NO correct option marked',
      ].join('\n'),
    );

    expect(hints).toEqual([
      {
        kind: 'missing_rationale',
        surgicallyFixable: true,
        optionId: 'opt-b',
        message: 'option opt-b is missing rationale',
      },
      {
        kind: 'missing_distractor_antipattern',
        surgicallyFixable: true,
        optionId: 'opt-c',
        message: 'incorrect option opt-c is missing distractorAntipattern',
      },
      {
        kind: 'missing_correct_option',
        surgicallyFixable: true,
        message: 'step st-1 has NO correct option marked',
      },
    ]);
  });

  it('returns empty for blank buildError and unknown for unmatched ERROR lines', () => {
    expect(parseBuildErrorHints('')).toEqual([]);
    expect(parseBuildErrorHints('  [ERROR] AGD-00995.json: pillars must not be empty')).toEqual([
      {
        kind: 'unknown',
        surgicallyFixable: true,
        message: 'pillars must not be empty',
      },
    ]);
  });

  it('treats truncated Citation Manifest errors as not surgically fixable', () => {
    expect(
      parseBuildErrorHints('  [ERROR] AGD-00991.json: Citation Manifest URL missing for opt-a'),
    ).toEqual([
      {
        kind: 'citation_manifest',
        surgicallyFixable: false,
        message: 'Citation Manifest URL missing for opt-a',
      },
    ]);
  });
});

describe('findingsRequireGroundingHandoff', () => {
  it('is true when buildError includes a Citation Manifest mismatch', () => {
    const findings: IngestFindings = {
      drillId: 'AGD-00994',
      failedAt: '2026-10-03T00:00:00.000Z',
      reasons: ['validation'],
      buildError:
        '  [ERROR] AGD-00994.json: correct option opt-a must cite an exact Citation Manifest URL from grounding chunk exports (got none)',
    };
    expect(findingsRequireGroundingHandoff(findings)).toBe(true);
  });

  it('is false for wording-only or surgically fixable validation findings', () => {
    expect(
      findingsRequireGroundingHandoff({
        drillId: 'AGD-00993',
        failedAt: '2026-10-03T00:00:00.000Z',
        reasons: ['wording'],
        wordingFindings: [
          { ruleId: 'length-tell', where: 'steps[0].options[0].rationale', message: 'too long' },
        ],
      }),
    ).toBe(false);
    expect(
      findingsRequireGroundingHandoff({
        drillId: 'AGD-00992',
        failedAt: '2026-10-03T00:00:00.000Z',
        reasons: ['validation'],
        buildError: '  [ERROR] AGD-00992.json: option opt-b is missing rationale',
      }),
    ).toBe(false);
  });
});
