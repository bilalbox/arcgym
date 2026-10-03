/**
 * ArcGym drill seeder
 * Syncs full authored drills into Cloudflare KV for edge API routes.
 *
 * Usage:
 *   npx tsx scripts/seed-drills.ts
 *
 * Uses per-key `wrangler kv key put --path` (bulk put has been observed to list
 * keys without readable values for new Troubleshoot Incidents).
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { DrillDefinitionDTO } from '../packages/drill-core/src/index.js';

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const KV_NAMESPACE_ID = 'c1f903c9221b40c086115dd7fc7f43d7';
const WEB_DIR = path.join(ROOT_DIR, 'apps/arcgym-web');

if (!fs.existsSync(DRILLS_DIR)) {
  console.error(`Missing drills directory: ${DRILLS_DIR}`);
  process.exit(1);
}

const drillFiles = fs
  .readdirSync(DRILLS_DIR)
  .filter((f) => f.endsWith('.json') && !f.endsWith('.findings.json'));

const publishedDrills: DrillDefinitionDTO[] = [];

for (const file of drillFiles) {
  const filePath = path.join(DRILLS_DIR, file);
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DrillDefinitionDTO;
    if (raw.status === 'published') {
      publishedDrills.push(raw);
    }
  } catch (e: unknown) {
    console.warn(`Failed to parse ${file}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

if (publishedDrills.length === 0) {
  console.error('No published drills found in content/drills/');
  process.exit(1);
}

publishedDrills.sort((a, b) => a.id.localeCompare(b.id));

const kvEntries = [
  { key: 'drill:today', value: JSON.stringify(publishedDrills[0]) },
  ...publishedDrills.map((drill) => ({
    key: `drill:id:${drill.id}`,
    value: JSON.stringify(drill),
  })),
];

const domainCounts = new Map<string, number>();
for (const drill of publishedDrills) {
  const domain = drill.domain ?? 'unknown';
  domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
}

console.log('\n--- Curriculum Architectural Domain distribution ---');
for (const [domain, count] of domainCounts.entries()) {
  console.log(` • ${domain.padEnd(45)} : ${count}`);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arcgym-kv-'));
let putCount = 0;

try {
  console.log(
    `Pushing ${kvEntries.length} keys to Cloudflare KV (namespace ${KV_NAMESPACE_ID})...`,
  );
  for (const entry of kvEntries) {
    const filePath = path.join(tmpDir, `${putCount}.json`);
    fs.writeFileSync(filePath, entry.value, 'utf-8');
    execSync(
      `pnpm exec wrangler kv key put ${JSON.stringify(entry.key)} --path=${JSON.stringify(filePath)} --namespace-id=${KV_NAMESPACE_ID} --remote`,
      { stdio: 'inherit', cwd: WEB_DIR },
    );
    putCount += 1;
  }

  // Verify a published Troubleshooting drill is readable and includes goldCause when present.
  const proof = publishedDrills.find((d) => d.format === 'Troubleshooting');
  if (proof) {
    const raw = execSync(
      `pnpm exec wrangler kv key get ${JSON.stringify(`drill:id:${proof.id}`)} --namespace-id=${KV_NAMESPACE_ID} --remote`,
      { cwd: WEB_DIR, encoding: 'utf-8' },
    );
    const parsed = JSON.parse(raw) as { id?: string; format?: string; goldCause?: unknown };
    if (parsed.id !== proof.id || parsed.format !== 'Troubleshooting' || !parsed.goldCause) {
      throw new Error(`KV verify failed for ${proof.id}`);
    }
    console.log(`Verified KV readback for ${proof.id} (Troubleshooting with goldCause).`);
  }

  console.log('Cloudflare KV populated.');
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.warn(`Cloudflare KV sync skipped or failed after ${putCount} puts: ${message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

const grounded = publishedDrills.filter((d) =>
  d.format === 'Rapid_Fire'
    ? (d.steps ?? []).some((s) =>
        (s.options ?? []).some((o) => o.citationUrl?.includes('architect.salesforce.com')),
      )
    : false,
).length;

console.log('\n--- Grounding ---');
console.log(` • Total published drills: ${publishedDrills.length}`);
console.log(` • Rapid Fire with architect.salesforce.com citations: ${grounded}`);
console.log('\nSeeding complete.\n');
