import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  citationManifestUrlsFromExports,
  type GroundingChunkExport,
  validateDrill,
} from '../index.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../');
const DRILLS_DIR = path.join(REPO_ROOT, 'content/drills');
const WEB_PUBLIC_DIR = path.join(REPO_ROOT, 'apps/arcgym-web/public');

const CHUNK_EXPORTS = [
  path.join(REPO_ROOT, 'data/architect_chunks.json'),
  path.join(REPO_ROOT, 'data/developer_chunks.json'),
  path.join(REPO_ROOT, 'data/help_chunks.json'),
];

function loadChunkExports(): GroundingChunkExport[][] {
  return CHUNK_EXPORTS.filter((p) => fs.existsSync(p)).map(
    (p) => JSON.parse(fs.readFileSync(p, 'utf-8')) as GroundingChunkExport[],
  );
}

describe('validator corpus test for content/drills', () => {
  const citationManifest = citationManifestUrlsFromExports(loadChunkExports());
  const assetExists = (url: string) => {
    if (!url.startsWith('/')) return false;
    const absPath = path.join(WEB_PUBLIC_DIR, url.replace(/^\/+/, ''));
    return fs.existsSync(absPath);
  };

  const drillFiles = fs
    .readdirSync(DRILLS_DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.findings.json'));

  it('validates every committed drill cleanly against real Citation Manifest and asset checks', () => {
    expect(drillFiles.length).toBeGreaterThan(0);
    const failures: Array<{ file: string; findings: unknown }> = [];

    for (const file of drillFiles) {
      const filePath = path.join(DRILLS_DIR, file);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const res = validateDrill(raw, { citationManifest, assetExists });
      if (!res.ok) {
        failures.push({ file, findings: res.findings });
      }
    }

    expect(failures).toEqual([]);
  });
});
