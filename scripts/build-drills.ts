/**
 * ArcGym Drill Builder & Validator
 * Reads content/drills/*.json, validates Format-discriminated payloads,
 * and compiles them for the React frontend and Cloudflare API endpoints.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type DiagramDrillDefinition,
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

const FORMATS = new Set(['Rapid_Fire', 'Diagram']);
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
    }
  }
}

function isOfficialSourceDiagram(url: unknown): boolean {
  if (typeof url !== 'string' || !url.startsWith('https://')) return false;
  try {
    const host = new URL(url).hostname;
    return host === 'architect.salesforce.com' || host === 'developer.salesforce.com';
  } catch {
    return false;
  }
}

function validateDiagram(file: string, drill: DiagramDrillDefinition) {
  if (!Array.isArray(drill.steps) || drill.steps.length === 0) {
    err(file, 'Diagram requires non-empty steps');
    return;
  }
  const modes = new Set(['fault', 'compose', 'compare']);
  const variants = new Set([
    'missing_node',
    'wrong_edge',
    'misplaced_component',
    'missing_edge',
    'compare_topology',
  ]);
  const nodeKinds = new Set(['component', 'slot']);
  const targetKinds = new Set(['node', 'edge', 'slot']);

  for (const step of drill.steps) {
    if (!step.id || !step.prompt) {
      err(file, `Diagram step missing id or prompt`);
      continue;
    }
    if (!modes.has(step.mode)) {
      err(file, `step ${step.id} invalid mode ${step.mode} (expected fault|compose|compare)`);
    }
    if (step.variant && !variants.has(step.variant)) {
      err(file, `step ${step.id} invalid variant ${step.variant}`);
    }
    if (!isOfficialSourceDiagram(step.sourceDiagramUrl)) {
      err(
        file,
        `step ${step.id} sourceDiagramUrl must be https on architect.salesforce.com or developer.salesforce.com`,
      );
    }

    if (step.mode === 'compare') {
      if (!Array.isArray(step.options) || step.options.length < 2) {
        err(file, `step ${step.id} compare mode requires at least 2 options[]`);
        continue;
      }
      const correctCount = step.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        err(file, `step ${step.id} compare mode must have exactly one correct option`);
      }
      validateOptionIds(file, `step ${step.id}`, step.options);
      for (const option of step.options) {
        const compareOpt = option as { diagramUrl?: unknown; diagramSvg?: unknown };
        if (
          typeof compareOpt.diagramUrl !== 'string' &&
          typeof compareOpt.diagramSvg !== 'string'
        ) {
          err(file, `compare option ${option.id} missing valid diagramUrl or diagramSvg`);
        }
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
      }
      continue;
    }

    if (!step.graph || !Array.isArray(step.graph.nodes) || !Array.isArray(step.graph.edges)) {
      err(file, `step ${step.id} requires graph.nodes[] and graph.edges[]`);
      continue;
    }
    if (!step.layout || typeof step.layout.nodes !== 'object' || step.layout.nodes === null) {
      err(file, `step ${step.id} requires layout.nodes`);
      continue;
    }

    const nodeIds = new Set<string>();
    for (const node of step.graph.nodes) {
      if (!node.id || !nodeKinds.has(node.kind)) {
        err(file, `step ${step.id} node missing id or invalid kind`);
        continue;
      }
      if (node.kind !== 'slot' && !node.label) {
        err(file, `step ${step.id} component node ${node.id} missing label`);
        continue;
      }
      if (typeof node.label !== 'string') {
        err(file, `step ${step.id} node ${node.id} label must be a string`);
        continue;
      }
      if (nodeIds.has(node.id)) {
        err(file, `step ${step.id} duplicate node id ${node.id}`);
      }
      nodeIds.add(node.id);
      const pos = step.layout.nodes[node.id];
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        err(file, `step ${step.id} node ${node.id} missing layout x/y`);
      } else if (pos.x < 0 || pos.x > 1 || pos.y < 0 || pos.y > 1) {
        err(file, `step ${step.id} node ${node.id} layout must be normalized 0–1`);
      }
    }

    const edgeIds = new Set<string>();
    for (const edge of step.graph.edges) {
      if (!edge.id || !edge.source || !edge.target) {
        err(file, `step ${step.id} edge missing id/source/target`);
        continue;
      }
      if (edgeIds.has(edge.id)) {
        err(file, `step ${step.id} duplicate edge id ${edge.id}`);
      }
      edgeIds.add(edge.id);
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        err(file, `step ${step.id} edge ${edge.id} references unknown node`);
      }
    }

    if (!Array.isArray(step.hotspots) || step.hotspots.length === 0) {
      err(file, `step ${step.id} requires hotspots[]`);
      continue;
    }
    const correctHotspots = step.hotspots.filter((h) => h.isCorrect);
    if (correctHotspots.length !== 1) {
      err(file, `step ${step.id} must have exactly one correct hotspot`);
    }
    const hotspotIds = new Set<string>();
    for (const hotspot of step.hotspots) {
      if (!hotspot.id || !targetKinds.has(hotspot.targetKind)) {
        err(file, `step ${step.id} hotspot missing id or invalid targetKind`);
        continue;
      }
      if (hotspotIds.has(hotspot.id)) {
        err(file, `step ${step.id} duplicate hotspot id ${hotspot.id}`);
      }
      hotspotIds.add(hotspot.id);
      const inGraph =
        (hotspot.targetKind === 'edge' && edgeIds.has(hotspot.id)) ||
        ((hotspot.targetKind === 'node' || hotspot.targetKind === 'slot') &&
          nodeIds.has(hotspot.id));
      if (!inGraph) {
        err(
          file,
          `step ${step.id} hotspot ${hotspot.id} not found in graph for targetKind ${hotspot.targetKind}`,
        );
      }
      if (hotspot.targetKind === 'slot') {
        const node = step.graph.nodes.find((n) => n.id === hotspot.id);
        if (node && node.kind !== 'slot') {
          err(
            file,
            `step ${step.id} hotspot ${hotspot.id} targetKind slot but node.kind is ${node.kind}`,
          );
        }
      }
      if (!hotspot.isCorrect && hotspot.distractorAntipattern) {
        const words = String(hotspot.distractorAntipattern).split(/\s+/).filter(Boolean);
        if (words.length < 2 || words.length > 5) {
          err(
            file,
            `step ${step.id} hotspot ${hotspot.id} distractorAntipattern must be 2–5 words`,
          );
        }
      }
    }

    if (!Array.isArray(step.options) || step.options.length < 2) {
      err(file, `step ${step.id} requires options[] (MCQ after correct hotspot)`);
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

    switch (drill.format) {
      case 'Rapid_Fire':
        validateRapidFire(file, drill as RapidFireDrillDefinition);
        break;
      case 'Diagram':
        validateDiagram(file, drill as DiagramDrillDefinition);
        break;
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
