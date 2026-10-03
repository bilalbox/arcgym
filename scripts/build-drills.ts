/**
 * ArcGym Drill Builder & Validator
 * Reads content/drills/*.json, validates Format-discriminated payloads via drill-core,
 * and compiles them for the React frontend and Cloudflare API endpoints.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  citationManifestUrlsFromExports,
  type DrillDefinitionDTO,
  type GroundingChunkExport,
  lintDrillWording,
  sanitizeDrillForClient,
  validateDrill,
} from '../packages/drill-core/src/index.js';

/** When true, wording findings on published drills fail the build; drafts only ever warn. */
const WORDING_ENFORCE = true;

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const WEB_DATA_DIR = path.join(ROOT_DIR, 'apps/arcgym-web/src/data');
const WEB_PUBLIC_DIR = path.join(ROOT_DIR, 'apps/arcgym-web/public/api/drills');
const WEB_PUBLIC_ROOT = path.join(ROOT_DIR, 'apps/arcgym-web/public');
/** Per-source grounding chunk exports; Citation Manifest is their URL union at build time. */
const GROUNDING_CHUNK_EXPORTS = [
  path.join(ROOT_DIR, 'data/architect_chunks.json'),
  path.join(ROOT_DIR, 'data/developer_chunks.json'),
  path.join(ROOT_DIR, 'data/help_chunks.json'),
];

[WEB_DATA_DIR, WEB_PUBLIC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('\n======================================================');
console.log('   ArcGym: Building & Validating Content Drills');
console.log('======================================================\n');

const drillFiles = fs
  .readdirSync(DRILLS_DIR)
  .filter((f) => f.endsWith('.json') && !f.endsWith('.findings.json'));
console.log(`Found ${drillFiles.length} drill JSON files in ${DRILLS_DIR}`);

const allDrills: DrillDefinitionDTO[] = [];
const draftDrills: DrillDefinitionDTO[] = [];
let errorCount = 0;
let wordingWarningCount = 0;

function err(file: string, message: string) {
  console.error(`  [ERROR] ${file}: ${message}`);
  errorCount++;
}

function lintWording(file: string, drill: DrillDefinitionDTO) {
  const enforced = WORDING_ENFORCE && drill.status === 'published';
  for (const finding of lintDrillWording(drill)) {
    const message = `wording ${finding.ruleId} at ${finding.where}: ${finding.message}`;
    if (enforced) {
      err(file, message);
    } else {
      console.warn(`  [WARN] ${file}: ${message}`);
      wordingWarningCount++;
    }
  }
}

function loadGroundingChunkExports(): GroundingChunkExport[][] {
  return GROUNDING_CHUNK_EXPORTS.filter((p) => fs.existsSync(p)).map(
    (p) => JSON.parse(fs.readFileSync(p, 'utf-8')) as GroundingChunkExport[],
  );
}

const citationManifestUrls = citationManifestUrlsFromExports(loadGroundingChunkExports());
console.log(
  `Citation Manifest: ${citationManifestUrls.size} URLs from ${GROUNDING_CHUNK_EXPORTS.filter((p) => fs.existsSync(p)).length} chunk export(s)`,
);

const assetExists = (url: string) => {
  if (!url.startsWith('/')) return false;
  const diagramPath = path.join(WEB_PUBLIC_ROOT, url.replace(/^\/+/, ''));
  return fs.existsSync(diagramPath);
};

for (const file of drillFiles) {
  const filePath = path.join(DRILLS_DIR, file);
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const res = validateDrill(raw, {
      citationManifest: citationManifestUrls,
      assetExists,
    });

    if (!res.ok) {
      for (const f of res.findings) {
        err(file, `validation ${f.ruleId} at ${f.where}: ${f.message}`);
      }
      continue;
    }

    const drill = res.drill;
    lintWording(file, drill);

    if (drill.status === 'published') {
      allDrills.push(drill);
    } else {
      draftDrills.push(drill);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    err(file, `Failed to parse: ${msg}`);
  }
}

if (wordingWarningCount > 0) {
  console.warn(`\n${wordingWarningCount} wording warnings (see [WARN] lines).`);
}

if (errorCount > 0) {
  console.error(`\nValidation failed with ${errorCount} errors.`);
  process.exit(1);
}

allDrills.sort((a, b) => a.id.localeCompare(b.id));
draftDrills.sort((a, b) => a.id.localeCompare(b.id));

const clientDrills = allDrills.map(sanitizeDrillForClient);

const bundlePath = path.join(WEB_DATA_DIR, 'canonicalDrills.json');
fs.writeFileSync(bundlePath, JSON.stringify(clientDrills, null, 2), 'utf-8');
console.log(`Wrote ${clientDrills.length} published drills → ${bundlePath}`);

const publicPath = path.join(WEB_PUBLIC_DIR, 'canonical-drills.json');
fs.writeFileSync(publicPath, JSON.stringify(clientDrills, null, 2), 'utf-8');
console.log(`Wrote ${clientDrills.length} published drills → ${publicPath}`);

const byFormat = allDrills.reduce((acc: Record<string, number>, d) => {
  acc[d.format] = (acc[d.format] || 0) + 1;
  return acc;
}, {});
const byDomain = allDrills.reduce((acc: Record<string, number>, d) => {
  acc[d.domain] = (acc[d.domain] || 0) + 1;
  return acc;
}, {});
console.log('\nPublished by Format:', byFormat);
console.log('Published by Domain:', byDomain);
console.log(`Drafts excluded from catalog: ${draftDrills.length}`);
if (draftDrills.length > 0) {
  console.log(`  ${draftDrills.map((d) => d.id).join(', ')}`);
}
console.log('\nBuild complete.\n');
