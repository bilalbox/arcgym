/**
 * ArcGym Drill Builder & Validator
 * Reads content/drills/*.json, validates Format-discriminated payloads,
 * and compiles them for the React frontend and Cloudflare API endpoints.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type DrillDefinitionDTO,
  lintDrillWording,
  type RapidFireDrillDefinition,
} from '../packages/drill-core/src/index.js';

/** When true, wording findings on published drills fail the build; drafts only ever warn. */
const WORDING_ENFORCE = true;

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const WEB_DATA_DIR = path.join(ROOT_DIR, 'apps/arcgym-web/src/data');
const WEB_PUBLIC_DIR = path.join(ROOT_DIR, 'apps/arcgym-web/public/api/drills');
const ARCHITECT_CHUNKS_PATH = path.join(ROOT_DIR, 'data/architect_chunks.json');

const ARCHITECTURAL_DOMAINS = new Set([
  'Platform_Core',
  'Data_Architecture',
  'Security_And_Access',
  'Integration_Apis',
  'Ai_And_Automation',
  'Infrastructure',
  'Devops_Lifecycle',
]);

const FORMATS = new Set(['Rapid_Fire']);
const STATUSES = new Set(['draft', 'published']);
const DIFFICULTIES = new Set(['Associate_Domain_Architect', 'Lead_CTA']);
const PILLARS = new Set([
  'Trust',
  'Reliability',
  'Operational_Excellence',
  'Cost_Optimization',
  'Fairness',
]);
const CARD_ID_PATTERN = /^FC-[A-Za-z0-9]+$/;

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

const crawledCitationUrls = new Set<string>(
  JSON.parse(fs.readFileSync(ARCHITECT_CHUNKS_PATH, 'utf-8')).map(
    (c: { metadata: { url: string } }) => c.metadata.url,
  ),
);

/** A citation must be the exact (anchored) URL of a crawled chunk, so learners land on the governing section. */
function isOfficialCitation(url: unknown): boolean {
  return typeof url === 'string' && crawledCitationUrls.has(url);
}

function validateOptionIds(file: string, where: string, options: Array<{ id: string }>) {
  const ids = options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) {
    err(file, `${where} has duplicate option ids`);
  }
}

function validateMetadata(file: string, drill: DrillDefinitionDTO) {
  if (!DIFFICULTIES.has(drill.difficulty)) {
    err(file, `invalid difficulty: ${drill.difficulty} (expected ${[...DIFFICULTIES].join('|')})`);
  }
  if (drill.pillars.length === 0) {
    err(file, 'pillars must not be empty');
  }
  for (const pillar of drill.pillars) {
    if (!PILLARS.has(pillar)) {
      err(file, `invalid Well-Architected pillar: ${pillar}`);
    }
  }
  if (drill.sourceCardIds !== undefined) {
    const valid =
      Array.isArray(drill.sourceCardIds) &&
      drill.sourceCardIds.every(
        (id: unknown) => typeof id === 'string' && CARD_ID_PATTERN.test(id),
      );
    if (!valid) {
      err(file, 'sourceCardIds must be an array of Friction Card ids (FC-<discussion_id>)');
    }
  }
}

function validateRapidFire(file: string, drill: RapidFireDrillDefinition) {
  if (!Array.isArray(drill.steps) || drill.steps.length === 0) {
    err(file, 'Rapid_Fire requires non-empty steps');
    return;
  }
  for (const step of drill.steps) {
    if (!step.prompt || !Array.isArray(step.options)) {
      err(file, `step ${step.id} has invalid prompt or options`);
      continue;
    }
    if (!step.options.some((o) => o.isCorrect)) {
      err(file, `step ${step.id} has NO correct option marked`);
    }
    validateOptionIds(file, `step ${step.id}`, step.options);
    for (const option of step.options) {
      if (!option.rationale) {
        err(file, `option ${option.id} is missing rationale`);
      }
      if (!option.isCorrect && !option.distractorAntipattern) {
        err(file, `incorrect option ${option.id} is missing distractorAntipattern`);
      }
      if (option.isCorrect && !isOfficialCitation(option.citationUrl)) {
        err(
          file,
          `correct option ${option.id} must cite a crawled chunk URL from ${ARCHITECT_CHUNKS_PATH} (got ${option.citationUrl ?? 'none'})`,
        );
      }
      if (option.diagramUrl !== undefined) {
        if (typeof option.diagramUrl !== 'string' || !option.diagramUrl.startsWith('/')) {
          err(file, `option ${option.id} diagramUrl must be an absolute path (e.g. /diagrams/...)`);
        }
      }
    }
  }
}

for (const file of drillFiles) {
  const filePath = path.join(DRILLS_DIR, file);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const drill = JSON.parse(raw);

    if (
      !drill.id ||
      !drill.title ||
      !drill.domain ||
      !drill.domainLabel ||
      !Array.isArray(drill.pillars)
    ) {
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

    validateMetadata(file, drill);

    validateRapidFire(file, drill as RapidFireDrillDefinition);

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
