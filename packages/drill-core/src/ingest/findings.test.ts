import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearIngestFindings,
  findingsSidecarPath,
  type IngestFindings,
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
