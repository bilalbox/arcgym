/**
 * ArcGym Drill Builder & Validator
 * Reads content/drills/*.json, validates Format-discriminated payloads,
 * and compiles them for the React frontend and Cloudflare API endpoints.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type CaseFileDrillDefinition,
  citationManifestUrlsFromExports,
  type DrillDefinitionDTO,
  type DrillOptionDTO,
  type GroundingChunkExport,
  isEligibleCorrectOptionCitation,
  lintDrillWording,
  type RapidFireDrillDefinition,
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

const ARCHITECTURAL_DOMAINS = new Set([
  'Platform_Core',
  'Data_Architecture',
  'Security_And_Access',
  'Integration_Apis',
  'Ai_And_Automation',
  'Infrastructure',
  'Devops_Lifecycle',
]);

const BOARD_DOMAINS = new Set([
  'System_Architecture',
  'Security',
  'Data',
  'Solution_Architecture',
  'Integration',
  'Development_Lifecycle',
  'Communication',
]);

const PROBE_TIERS = new Set(['pivotal', 'useful', 'distractor']);
const FORMATS = new Set(['Rapid_Fire', 'Case_File']);
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
const DEFAULT_PIVOTAL_COUNT = 2;

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

function validateOptionIds(file: string, where: string, options: Array<{ id: string }>) {
  const ids = options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) {
    err(file, `${where} has duplicate option ids`);
  }
}

function validateDiagramUrl(file: string, where: string, diagramUrl: unknown) {
  if (diagramUrl === undefined) return;
  if (typeof diagramUrl !== 'string' || !diagramUrl.startsWith('/')) {
    err(file, `${where} diagramUrl must be an absolute path (e.g. /diagrams/...)`);
    return;
  }
  const diagramPath = path.join(WEB_PUBLIC_ROOT, diagramUrl.replace(/^\/+/, ''));
  if (!fs.existsSync(diagramPath)) {
    err(
      file,
      `${where} diagramUrl references missing asset: ${diagramUrl} (expected at ${diagramPath})`,
    );
  }
}

function validateMcqOptions(file: string, where: string, options: DrillOptionDTO[]) {
  if (!Array.isArray(options) || options.length < 2) {
    err(file, `${where} requires at least 2 options`);
    return;
  }
  if (!options.some((o) => o.isCorrect)) {
    err(file, `${where} has NO correct option marked`);
  }
  validateOptionIds(file, where, options);
  for (const option of options) {
    if (!option.rationale) {
      err(file, `option ${option.id} is missing rationale`);
    }
    if (!option.isCorrect && !option.distractorAntipattern) {
      err(file, `incorrect option ${option.id} is missing distractorAntipattern`);
    }
    if (
      option.isCorrect &&
      !isEligibleCorrectOptionCitation(option.citationUrl, citationManifestUrls)
    ) {
      err(
        file,
        `correct option ${option.id} must cite an exact Citation Manifest URL from grounding chunk exports (got ${option.citationUrl ?? 'none'})`,
      );
    }
    validateDiagramUrl(file, `option ${option.id}`, option.diagramUrl);
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
    validateMcqOptions(file, `step ${step.id}`, step.options);
  }
}

function validateCaseFile(file: string, drill: CaseFileDrillDefinition) {
  if (!drill.brief || typeof drill.brief.title !== 'string' || !drill.brief.title) {
    err(file, 'Case_File requires brief.title');
  }
  if (!drill.brief || typeof drill.brief.synopsis !== 'string' || !drill.brief.synopsis) {
    err(file, 'Case_File requires brief.synopsis');
  }
  if (drill.brief?.exhibits) {
    for (const [i, exhibit] of drill.brief.exhibits.entries()) {
      if (!exhibit.label || !exhibit.diagramUrl) {
        err(file, `brief.exhibits[${i}] requires label and diagramUrl`);
      } else {
        validateDiagramUrl(file, `brief.exhibits[${i}]`, exhibit.diagramUrl);
      }
    }
  }

  if (!Array.isArray(drill.stations) || drill.stations.length === 0) {
    err(file, 'Case_File requires non-empty stations');
    return;
  }
  if (drill.stations.length < 3) {
    err(file, `Case_File requires at least 3 stations; got ${drill.stations.length}`);
  }

  const stationIds = drill.stations.map((s) => s.id);
  if (new Set(stationIds).size !== stationIds.length) {
    err(file, 'Case_File has duplicate station ids');
  }

  for (const station of drill.stations) {
    if (!station.prompt) {
      err(file, `station ${station.id} missing prompt`);
    }
    if (!ARCHITECTURAL_DOMAINS.has(station.domain)) {
      err(file, `station ${station.id} invalid domain: ${station.domain}`);
    }
    if (!BOARD_DOMAINS.has(station.boardDomain)) {
      err(file, `station ${station.id} invalid boardDomain: ${station.boardDomain}`);
    }

    if (typeof station.probeBudget !== 'number' || station.probeBudget < 1) {
      err(file, `station ${station.id} probeBudget must be a positive number`);
    }

    if (!Array.isArray(station.probes) || station.probes.length < 5) {
      err(file, `station ${station.id} requires at least 5 probes`);
      continue;
    }

    validateOptionIds(file, `station ${station.id} probes`, station.probes);

    let pivotalCount = 0;
    for (const probe of station.probes) {
      if (!probe.label || !probe.answer) {
        err(file, `station ${station.id} probe ${probe.id} missing label or answer`);
      }
      if (!PROBE_TIERS.has(probe.tier)) {
        err(file, `station ${station.id} probe ${probe.id} invalid tier: ${probe.tier}`);
      }
      if (probe.tier === 'pivotal') pivotalCount++;
      if (probe.tier === 'distractor' && !probe.distractorAntipattern) {
        err(
          file,
          `station ${station.id} distractor probe ${probe.id} missing distractorAntipattern`,
        );
      }
    }

    if (pivotalCount !== DEFAULT_PIVOTAL_COUNT) {
      err(
        file,
        `station ${station.id} must have exactly ${DEFAULT_PIVOTAL_COUNT} pivotal probes (got ${pivotalCount})`,
      );
    }

    if (station.probeBudget > station.probes.length) {
      err(file, `station ${station.id} probeBudget exceeds probe pool size`);
    }

    validateMcqOptions(file, `station ${station.id}`, station.options);
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

    if (drill.format === 'Rapid_Fire') {
      validateRapidFire(file, drill as RapidFireDrillDefinition);
    } else if (drill.format === 'Case_File') {
      validateCaseFile(file, drill as CaseFileDrillDefinition);
    }

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
