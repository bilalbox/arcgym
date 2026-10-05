/**
 * ArcGym drill seeder
 * Syncs full authored drills into Cloudflare KV for edge API routes.
 *
 * Usage:
 *   npx tsx scripts/seed-drills.ts            # Smart diff-sync (only modified/new keys)
 *   npx tsx scripts/seed-drills.ts --force    # Force re-upload all published drills
 *   npx tsx scripts/seed-drills.ts --clear    # Wipe KV namespace before seeding
 *
 * Uses per-key `wrangler kv key put --path` (bulk put has been observed to list
 * keys without readable values for new Troubleshoot Incidents).
 */

import { execSync } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { DrillDefinitionDTO } from '../packages/drill-core/src/index.js';

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const KV_NAMESPACE_ID = 'c1f903c9221b40c086115dd7fc7f43d7';
const WEB_DIR = path.join(ROOT_DIR, 'apps/arcgym-web');

interface DrillManifest {
  version: 1;
  updatedAt: string;
  todayId: string;
  todayHash: string;
  drills: Record<string, string>; // drillId -> sha256
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getRemoteManifest(): DrillManifest | null {
  try {
    const raw = execSync(
      `pnpm exec wrangler kv key get "drill:manifest" --namespace-id=${KV_NAMESPACE_ID} --remote`,
      { cwd: WEB_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] },
    );
    return JSON.parse(raw) as DrillManifest;
  } catch {
    return null;
  }
}

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

const localHashes: Record<string, string> = {};
const localDrillEntries = new Map<
  string,
  { drill: DrillDefinitionDTO; json: string; hash: string }
>();

for (const drill of publishedDrills) {
  const json = JSON.stringify(drill);
  const hash = hashContent(json);
  localHashes[drill.id] = hash;
  localDrillEntries.set(drill.id, { drill, json, hash });
}

const todayDrill = publishedDrills[0];
const todayJson = JSON.stringify(todayDrill);
const todayHash = hashContent(todayJson);

const domainCounts = new Map<string, number>();
for (const drill of publishedDrills) {
  const domain = drill.domain ?? 'unknown';
  domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
}

const args = process.argv.slice(2);
const shouldClear = args.includes('--clear') || args.includes('--wipe');
const isForce = args.includes('--force');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arcgym-kv-'));
let putCount = 0;

try {
  if (shouldClear) {
    console.log(`\n--- Clearing Cloudflare KV namespace ${KV_NAMESPACE_ID} ---`);
    const rawKeys = execSync(
      `pnpm exec wrangler kv key list --namespace-id=${KV_NAMESPACE_ID} --remote`,
      { cwd: WEB_DIR, encoding: 'utf-8' },
    );
    const parsedKeys = JSON.parse(rawKeys) as Array<{ name: string }>;
    const keyNames = parsedKeys.map((k) => k.name);
    if (keyNames.length > 0) {
      console.log(`Deleting ${keyNames.length} existing key(s) from KV...`);
      const bulkDeleteFile = path.join(tmpDir, 'keys-to-delete.json');
      fs.writeFileSync(bulkDeleteFile, JSON.stringify(keyNames), 'utf-8');
      execSync(
        `pnpm exec wrangler kv bulk delete ${JSON.stringify(bulkDeleteFile)} --namespace-id=${KV_NAMESPACE_ID} --remote -f`,
        { stdio: 'inherit', cwd: WEB_DIR },
      );
      console.log(`KV namespace cleared (${keyNames.length} key(s) removed).\n`);
    } else {
      console.log('KV namespace is already empty.\n');
    }
  }

  const remoteManifest = shouldClear || isForce ? null : getRemoteManifest();

  const toPut: Array<{ key: string; value: string; reason: string }> = [];
  const toDelete: string[] = [];

  if (remoteManifest) {
    // Check which drills are new or modified
    for (const [id, entry] of localDrillEntries.entries()) {
      const remoteHash = remoteManifest.drills?.[id];
      if (!remoteHash) {
        toPut.push({ key: `drill:id:${id}`, value: entry.json, reason: 'new' });
      } else if (remoteHash !== entry.hash) {
        toPut.push({ key: `drill:id:${id}`, value: entry.json, reason: 'modified' });
      }
    }

    // Check if today drill changed
    if (remoteManifest.todayId !== todayDrill.id || remoteManifest.todayHash !== todayHash) {
      toPut.push({ key: 'drill:today', value: todayJson, reason: 'today-updated' });
    }

    // Check for deleted / unpublished drills
    if (remoteManifest.drills) {
      for (const remoteId of Object.keys(remoteManifest.drills)) {
        if (!localDrillEntries.has(remoteId)) {
          toDelete.push(`drill:id:${remoteId}`);
        }
      }
    }
  } else {
    // Initial or forced seed: upload all published drills + today
    toPut.push({
      key: 'drill:today',
      value: todayJson,
      reason: isForce ? 'forced' : 'initial',
    });
    for (const [id, entry] of localDrillEntries.entries()) {
      toPut.push({
        key: `drill:id:${id}`,
        value: entry.json,
        reason: isForce ? 'forced' : 'initial',
      });
    }
  }

  if (remoteManifest && toPut.length === 0 && toDelete.length === 0) {
    console.log(
      `\n[seed] Cloudflare KV is already up to date with published drills (${publishedDrills.length} drills, 0 changes). Skipping.\n`,
    );
  } else {
    console.log('\n--- Curriculum Architectural Domain distribution ---');
    for (const [domain, count] of domainCounts.entries()) {
      console.log(` • ${domain.padEnd(45)} : ${count}`);
    }

    if (toDelete.length > 0) {
      console.log(`\nPruning ${toDelete.length} stale drill key(s) from Cloudflare KV...`);
      if (toDelete.length === 1) {
        execSync(
          `pnpm exec wrangler kv key delete ${JSON.stringify(toDelete[0])} --namespace-id=${KV_NAMESPACE_ID} --remote`,
          { stdio: 'inherit', cwd: WEB_DIR },
        );
      } else {
        const deleteFile = path.join(tmpDir, 'to-delete.json');
        fs.writeFileSync(deleteFile, JSON.stringify(toDelete), 'utf-8');
        execSync(
          `pnpm exec wrangler kv bulk delete ${JSON.stringify(deleteFile)} --namespace-id=${KV_NAMESPACE_ID} --remote -f`,
          { stdio: 'inherit', cwd: WEB_DIR },
        );
      }
      console.log(`Pruned ${toDelete.length} key(s).`);
    }

    if (toPut.length > 0) {
      console.log(
        `\nPushing ${toPut.length} key(s) to Cloudflare KV (namespace ${KV_NAMESPACE_ID})...`,
      );
      for (const entry of toPut) {
        console.log(` • ${entry.key} (${entry.reason})`);
        const filePath = path.join(tmpDir, `${putCount}.json`);
        fs.writeFileSync(filePath, entry.value, 'utf-8');
        execSync(
          `pnpm exec wrangler kv key put ${JSON.stringify(entry.key)} --path=${JSON.stringify(filePath)} --namespace-id=${KV_NAMESPACE_ID} --remote`,
          { stdio: 'inherit', cwd: WEB_DIR },
        );
        putCount += 1;
      }
    }

    // Update manifest in KV
    const updatedManifest: DrillManifest = {
      version: 1,
      updatedAt: new Date().toISOString(),
      todayId: todayDrill.id,
      todayHash,
      drills: localHashes,
    };
    const manifestPath = path.join(tmpDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest), 'utf-8');
    execSync(
      `pnpm exec wrangler kv key put "drill:manifest" --path=${JSON.stringify(manifestPath)} --namespace-id=${KV_NAMESPACE_ID} --remote`,
      { stdio: 'inherit', cwd: WEB_DIR },
    );
    console.log('Updated drill:manifest in Cloudflare KV.');

    // Verify a published Troubleshooting drill is readable and includes goldCause when present.
    const proof = publishedDrills.find((d) => d.format === 'Troubleshooting');
    if (proof) {
      const raw = execSync(
        `pnpm exec wrangler kv key get ${JSON.stringify(`drill:id:${proof.id}`)} --namespace-id=${KV_NAMESPACE_ID} --remote`,
        { cwd: WEB_DIR, encoding: 'utf-8' },
      );
      const parsed = JSON.parse(raw) as {
        id?: string;
        format?: string;
        goldCause?: unknown;
      };
      if (parsed.id !== proof.id || parsed.format !== 'Troubleshooting' || !parsed.goldCause) {
        throw new Error(`KV verify failed for ${proof.id}`);
      }
      console.log(`Verified KV readback for ${proof.id} (Troubleshooting with goldCause).`);
    }

    const agd01001 = publishedDrills.find((d) => d.id === 'AGD-01001');
    if (agd01001 && 'goldCause' in agd01001) {
      const raw = execSync(
        `pnpm exec wrangler kv key get "drill:id:AGD-01001" --namespace-id=${KV_NAMESPACE_ID} --remote`,
        { cwd: WEB_DIR, encoding: 'utf-8' },
      );
      const parsed = JSON.parse(raw) as { goldCause?: { rationale?: string } };
      const expectedRationale = (agd01001 as { goldCause: { rationale: string } }).goldCause
        .rationale;
      if (parsed.goldCause?.rationale !== expectedRationale) {
        throw new Error('KV verify failed: AGD-01001 goldCause rationale mismatch');
      }
      console.log('Verified AGD-01001 rationale matches latest authored content in KV.');
    }

    console.log('Cloudflare KV populated.');
  }
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
