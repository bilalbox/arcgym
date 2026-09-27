/**
 * ArcGym Drill Builder & Validator
 * Reads content/drills/*.json, validates Format-discriminated payloads,
 * and compiles them for the React frontend and Cloudflare API endpoints.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const WEB_DATA_DIR = path.join(ROOT_DIR, 'apps/arcgym-web/src/data');
const WEB_PUBLIC_DIR = path.join(ROOT_DIR, 'apps/arcgym-web/public/api/drills');

const ARCHITECTURAL_DOMAINS = new Set([
  'Platform_Core',
  'Data_Architecture',
  'Security_And_Access',
  'Integration_Apis',
  'Ai_And_Automation',
  'Infrastructure',
  'Devops_Lifecycle',
]);

const FORMATS = new Set(['Lesson', 'Rapid_Fire', 'Currency', 'Scenario']);
const STATUSES = new Set(['draft', 'published']);

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
const draftDrills: any[] = [];
let errorCount = 0;

function err(file: string, message: string) {
  console.error(`  [ERROR] ${file}: ${message}`);
  errorCount++;
}

function validateRapidFire(file: string, drill: any) {
  if (!Array.isArray(drill.steps) || drill.steps.length === 0) {
    err(file, 'Rapid_Fire requires non-empty steps');
    return;
  }
  for (const step of drill.steps) {
    if (!step.prompt || !Array.isArray(step.options)) {
      err(file, `step ${step.id} has invalid prompt or options`);
    }
    if (!step.options?.some((o: any) => o.isCorrect)) {
      err(file, `step ${step.id} has NO correct option marked`);
    }
  }
}

function validateCurrency(file: string, drill: any) {
  if (!drill.prompt || typeof drill.totalPoints !== 'number') {
    err(file, 'Currency requires prompt and totalPoints');
  }
  if (!Array.isArray(drill.categories) || drill.categories.length === 0) {
    err(file, 'Currency requires categories[]');
  }
  if (!Array.isArray(drill.optimalRules) || drill.optimalRules.length === 0) {
    err(file, 'Currency requires optimalRules[]');
  }
  const catIds = new Set((drill.categories || []).map((c: any) => c.id));
  for (const rule of drill.optimalRules || []) {
    if (!catIds.has(rule.categoryId)) {
      err(file, `optimalRule references unknown categoryId ${rule.categoryId}`);
    }
    if (rule.op !== 'lte' && rule.op !== 'gte') {
      err(file, `optimalRule op must be lte|gte, got ${rule.op}`);
    }
  }
}

function validateScenario(file: string, drill: any) {
  if (!Array.isArray(drill.moves) || drill.moves.length === 0) {
    err(file, 'Scenario requires non-empty moves');
    return;
  }
  for (const move of drill.moves) {
    if (!move.dialogueText || !Array.isArray(move.options) || move.options.length === 0) {
      err(file, `move ${move.moveNumber} missing dialogue or options`);
    }
    if (!move.options?.some((o: any) => o.isOptimal)) {
      err(file, `move ${move.moveNumber} has no optimal option`);
    }
  }
}

function validateLesson(file: string, drill: any) {
  if (!Array.isArray(drill.stages) || drill.stages.length === 0) {
    err(file, 'Lesson requires non-empty stages');
    return;
  }
  for (const stage of drill.stages) {
    if (!stage.scenario || !Array.isArray(stage.options)) {
      err(file, `stage ${stage.stageNumber} missing scenario or options`);
    }
    if (!stage.options?.some((o: any) => o.isCorrect)) {
      err(file, `stage ${stage.stageNumber} has no correct option`);
    }
  }
}

for (const file of drillFiles) {
  const filePath = path.join(DRILLS_DIR, file);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const drill = JSON.parse(raw);

    if (!drill.id || !drill.title || !drill.domain || !drill.domainLabel || !Array.isArray(drill.pillars)) {
      err(file, 'missing required metadata (id, title, domain, domainLabel, pillars)');
      continue;
    }

    if (!ARCHITECTURAL_DOMAINS.has(drill.domain)) {
      err(file, `invalid Architectural Domain: ${drill.domain}`);
      continue;
    }

    if (!FORMATS.has(drill.format)) {
      err(file, `invalid Drill Format: ${drill.format}`);
      continue;
    }

    if (!STATUSES.has(drill.status)) {
      err(file, `invalid status: ${drill.status} (expected draft|published)`);
      continue;
    }

    switch (drill.format) {
      case 'Rapid_Fire':
        validateRapidFire(file, drill);
        break;
      case 'Currency':
        validateCurrency(file, drill);
        break;
      case 'Scenario':
        validateScenario(file, drill);
        break;
      case 'Lesson':
        validateLesson(file, drill);
        break;
    }

    if (drill.status === 'published') {
      allDrills.push(drill);
    } else {
      draftDrills.push(drill);
    }
  } catch (e: any) {
    err(file, `Failed to parse: ${e.message}`);
  }
}

if (errorCount > 0) {
  console.error(`\nValidation failed with ${errorCount} errors.`);
  process.exit(1);
}

allDrills.sort((a, b) => a.id.localeCompare(b.id));
draftDrills.sort((a, b) => a.id.localeCompare(b.id));

const bundlePath = path.join(WEB_DATA_DIR, 'canonicalDrills.json');
fs.writeFileSync(bundlePath, JSON.stringify(allDrills, null, 2), 'utf-8');
console.log(`Wrote ${allDrills.length} published drills → ${bundlePath}`);

const publicPath = path.join(WEB_PUBLIC_DIR, 'canonical-drills.json');
fs.writeFileSync(publicPath, JSON.stringify(allDrills, null, 2), 'utf-8');
console.log(`Wrote ${allDrills.length} published drills → ${publicPath}`);

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
