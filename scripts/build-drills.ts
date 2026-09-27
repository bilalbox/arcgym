/**
 * ArcGym Drill Builder & Validator
 * Reads all drills from content/drills/*.json, validates structure and citations,
 * and compiles them for the React frontend and Cloudflare API endpoints.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const WEB_DATA_DIR = path.join(ROOT_DIR, 'apps/arcgym-web/src/data');
const WEB_PUBLIC_DIR = path.join(ROOT_DIR, 'apps/arcgym-web/public/api/drills');

[WEB_DATA_DIR, WEB_PUBLIC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('\n======================================================');
console.log('   ArcGym: Building & Validating Content Drills');
console.log('======================================================\n');

const drillFiles = fs.readdirSync(DRILLS_DIR).filter((f) => f.endsWith('.json'));
console.log(`Found ${drillFiles.length} drill JSON files in ${DRILLS_DIR}`);

const allDrills: any[] = [];
let errorCount = 0;

for (const file of drillFiles) {
  const filePath = path.join(DRILLS_DIR, file);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const drill = JSON.parse(raw);

    // Validate required fields
    if (!drill.id || !drill.title || !drill.domain || !Array.isArray(drill.pillars)) {
      console.error(`  [ERROR] ${file} is missing required metadata (id, title, domain, pillars)`);
      errorCount++;
      continue;
    }

    if (!Array.isArray(drill.steps) || drill.steps.length === 0) {
      console.error(`  [ERROR] ${file} has no steps defined`);
      errorCount++;
      continue;
    }

    // Validate steps & citations
    for (const step of drill.steps) {
      if (!step.prompt || !Array.isArray(step.options)) {
        console.error(`  [ERROR] ${file} step ${step.id} has invalid prompt or options`);
        errorCount++;
      }
      const hasCorrect = step.options.some((o: any) => o.isCorrect);
      if (!hasCorrect) {
        console.error(`  [ERROR] ${file} step ${step.id} has NO correct option marked`);
        errorCount++;
      }
    }

    allDrills.push(drill);
  } catch (e: any) {
    console.error(`  [ERROR] Failed to parse ${file}: ${e.message}`);
    errorCount++;
  }
}

if (errorCount > 0) {
  console.error(`\nValidation failed with ${errorCount} errors.`);
  process.exit(1);
}

// Sort drills by ID
allDrills.sort((a, b) => a.id.localeCompare(b.id));

// Write compiled JSON bundles
const bundlePath = path.join(WEB_DATA_DIR, 'canonicalDrills.json');
fs.writeFileSync(bundlePath, JSON.stringify(allDrills, null, 2), 'utf-8');
console.log(`✓ Compiled frontend bundle: ${bundlePath}`);

const publicApiPath = path.join(WEB_PUBLIC_DIR, 'canonical-drills.json');
fs.writeFileSync(publicApiPath, JSON.stringify(allDrills, null, 2), 'utf-8');
console.log(`✓ Generated static API endpoint: ${publicApiPath}`);

console.log(`\n✓ All ${allDrills.length} drills validated and built successfully!\n`);
