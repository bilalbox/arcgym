/**
 * ArcGym drill seeder
 * Syncs compiled drills into Cloudflare KV for edge API routes.
 *
 * Prerequisites:
 *   pnpm build   # compiles content/drills → apps/arcgym-web public + src data
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

const ROOT_DIR = process.cwd();
const WEB_PUBLIC_DRILLS = path.join(
  ROOT_DIR,
  'apps/arcgym-web/public/api/drills/canonical-drills.json',
);
const KV_NAMESPACE_ID = 'c1f903c9221b40c086115dd7fc7f43d7';
const WEB_DIR = path.join(ROOT_DIR, 'apps/arcgym-web');

if (!fs.existsSync(WEB_PUBLIC_DRILLS)) {
  console.error(
    `Missing ${WEB_PUBLIC_DRILLS}\nRun \`pnpm build\` (or \`npx tsx scripts/build-drills.ts\`) first.`,
  );
  process.exit(1);
}

const drills = JSON.parse(fs.readFileSync(WEB_PUBLIC_DRILLS, 'utf-8')) as Array<{
  id: string;
  domain?: string;
  domainLabel?: string;
  format?: string;
  steps?: Array<{ options?: Array<{ citationUrl?: string }> }>;
}>;

if (!Array.isArray(drills) || drills.length === 0) {
  console.error('canonical-drills.json is empty or invalid.');
  process.exit(1);
}

const kvEntries = [
  { key: 'drill:today', value: JSON.stringify(drills[0]) },
  ...drills.map((drill) => ({
    key: `drill:id:${drill.id}`,
    value: JSON.stringify(drill),
  })),
];

const domainCounts = new Map<string, number>();
for (const drill of drills) {
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

  // Verify a published Troubleshooting drill is readable when present.
  const proof = drills.find((d) => d.format === 'Troubleshooting');
  if (proof) {
    const raw = execSync(
      `pnpm exec wrangler kv key get ${JSON.stringify(`drill:id:${proof.id}`)} --namespace-id=${KV_NAMESPACE_ID} --remote`,
      { cwd: WEB_DIR, encoding: 'utf-8' },
    );
    const parsed = JSON.parse(raw) as { id?: string; format?: string };
    if (parsed.id !== proof.id || parsed.format !== 'Troubleshooting') {
      throw new Error(`KV verify failed for ${proof.id}`);
    }
    console.log(`Verified KV readback for ${proof.id} (Troubleshooting).`);
  }

  console.log('Cloudflare KV populated.');
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.warn(`Cloudflare KV sync skipped or failed after ${putCount} puts: ${message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

const grounded = drills.filter((d) =>
  (d.steps ?? []).some((s) =>
    (s.options ?? []).some((o) => o.citationUrl?.includes('architect.salesforce.com')),
  ),
).length;

console.log('\n--- Grounding ---');
console.log(` • Total drills: ${drills.length}`);
console.log(` • With architect.salesforce.com citations: ${grounded}`);
console.log('\nSeeding complete.\n');
