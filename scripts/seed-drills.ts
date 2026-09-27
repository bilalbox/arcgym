/**
 * ArcGym drill seeder
 * Syncs compiled drills into Cloudflare KV for edge API routes.
 *
 * Prerequisites:
 *   pnpm build   # compiles content/drills → apps/arcgym-web public + src data
 *
 * Usage:
 *   npx tsx scripts/seed-drills.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const WEB_PUBLIC_DRILLS = path.join(
  ROOT_DIR,
  'apps/arcgym-web/public/api/drills/canonical-drills.json'
);
const KV_PAYLOAD_PATH = path.join(ROOT_DIR, '.scratch/kv_drills.json');
const KV_NAMESPACE_ID = 'c1f903c9221b40c086115dd7fc7f43d7';

if (!fs.existsSync(WEB_PUBLIC_DRILLS)) {
  console.error(
    `Missing ${WEB_PUBLIC_DRILLS}\nRun \`pnpm build\` (or \`npx tsx scripts/build-drills.ts\`) first.`
  );
  process.exit(1);
}

const drills = JSON.parse(fs.readFileSync(WEB_PUBLIC_DRILLS, 'utf-8')) as Array<{
  id: string;
  domain?: string;
  steps?: Array<{ options?: Array<{ citationUrl?: string }> }>;
}>;

if (!Array.isArray(drills) || drills.length === 0) {
  console.error('canonical-drills.json is empty or invalid.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(KV_PAYLOAD_PATH), { recursive: true });

const kvEntries = [
  { key: 'drill:today', value: JSON.stringify(drills[0]) },
  ...drills.map((drill) => ({
    key: `drill:id:${drill.id}`,
    value: JSON.stringify(drill),
  })),
];

fs.writeFileSync(KV_PAYLOAD_PATH, JSON.stringify(kvEntries, null, 2), 'utf-8');
console.log(`Wrote KV bulk payload (${kvEntries.length} entries) → ${KV_PAYLOAD_PATH}`);

try {
  console.log(`Pushing drills to Cloudflare KV (namespace ${KV_NAMESPACE_ID})...`);
  execSync(
    `pnpm --filter @arcgym/web exec wrangler kv bulk put "${KV_PAYLOAD_PATH}" --namespace-id=${KV_NAMESPACE_ID} --remote`,
    { stdio: 'inherit' }
  );
  console.log('Cloudflare KV populated.');
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.warn(`Cloudflare KV sync skipped or failed: ${message}`);
}

const domainCounts = new Map<string, number>();
for (const drill of drills) {
  const domain = drill.domain ?? 'unknown';
  domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
}

console.log('\n--- Curriculum domain distribution ---');
for (const [domain, count] of domainCounts.entries()) {
  console.log(` • ${domain.padEnd(45)} : ${count}`);
}

const grounded = drills.filter((d) =>
  (d.steps ?? []).some((s) =>
    (s.options ?? []).some(
      (o) => o.citationUrl && o.citationUrl.includes('architect.salesforce.com')
    )
  )
).length;

console.log('\n--- Grounding ---');
console.log(` • Total drills: ${drills.length}`);
console.log(` • With architect.salesforce.com citations: ${grounded}`);
console.log('\nSeeding complete.\n');
