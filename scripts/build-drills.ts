/**
 * ArcGym Drill Builder & Validator
 * Reads content/drills/*.json, validates Format-discriminated payloads via drill-core,
 * and compiles them for the React frontend and Cloudflare API endpoints.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { render } from 'pele';
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
const DIAGRAMS_OUT_DIR = path.join(WEB_PUBLIC_ROOT, 'diagrams');

/** ArcGym design tokens and semantic node styles embedded into standalone SVGs. */
const ARCGYM_DIAGRAM_EMBEDDED_STYLE = `<style>
  :root, svg {
    --pele-bg: #f7f8fa;
    --pele-fg: #1c1c1e;
    --pele-surface: #ffffff;
    --pele-surface-alt: #fafbfc;
    --pele-border: #e0e2e8;
    --pele-line: #555a6a;
    --pele-muted: #8e91a0;
    --pele-accent: #0176d3;
    --pele-radius: 8px;
    --pele-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .pele-node.store rect { fill: #fafbfc; stroke: #555a6a; }
  .pele-node.cache rect, .pele-node.sdt rect, .pele-node.focal rect, .pele-node.teal rect { fill: #c3faf5; stroke: #0d9488; stroke-width: 1.8px; }
  .pele-node.clients rect, .pele-node.stream rect, .pele-node.target rect, .pele-node.card rect { fill: #ffffff; stroke: #c7cad5; }
  .pele-node.accent rect, .pele-node.sky rect, .pele-node.blue rect { fill: rgba(1, 118, 211, 0.16); stroke: #0176d3; stroke-width: 1.8px; }
  .pele-node.warn rect, .pele-node.danger rect, .pele-node.rose rect { fill: #fee2e2; stroke: #dc2626; stroke-width: 1.8px; }
  .pele-node.yellow rect, .pele-node.amber rect { fill: #fff4c4; stroke: #f0d98a; }
  .pele-node.lavender rect, .pele-node.violet rect { fill: #f5f3ff; stroke: #c7d2fe; }
  .pele-node.success rect { fill: #dcfce7; stroke: #86efac; }

  @media (prefers-color-scheme: dark) {
    :root, svg {
      --pele-bg: #0f1115;
      --pele-fg: #eceef2;
      --pele-surface: #16181f;
      --pele-surface-alt: #1c1f28;
      --pele-border: #2a2e3a;
      --pele-line: #9aa0b0;
      --pele-muted: #6e7486;
      --pele-accent: #4aa3f0;
    }
    .pele-node.store rect { fill: #1c1f28; stroke: #9aa0b0; }
    .pele-node.cache rect, .pele-node.sdt rect, .pele-node.focal rect, .pele-node.teal rect { fill: #122826; stroke: #2dd4bf; stroke-width: 1.8px; }
    .pele-node.clients rect, .pele-node.stream rect, .pele-node.target rect, .pele-node.card rect { fill: #16181f; stroke: #3a3f4e; }
    .pele-node.accent rect, .pele-node.sky rect, .pele-node.blue rect { fill: rgba(74, 163, 240, 0.22); stroke: #4aa3f0; stroke-width: 1.8px; }
    .pele-node.warn rect, .pele-node.danger rect, .pele-node.rose rect { fill: #2a1618; stroke: #f87171; stroke-width: 1.8px; }
    .pele-node.yellow rect, .pele-node.amber rect { fill: #262218; stroke: #3f3620; }
    .pele-node.lavender rect, .pele-node.violet rect { fill: #1c1b2c; stroke: #2e2c4a; }
    .pele-node.success rect { fill: #14261c; stroke: #1e3d2a; }
  }
</style>`;

export function bakeMermaidSvg(source: string, title?: string): string {
  const cleanSource = source.replace(/^\s*(classDef|style)\s+.*$/gm, '').trim();
  const res = render(cleanSource);
  let svg = res.svg;
  if (!svg.includes('<title>')) {
    svg = svg.replace(
      />/,
      `><title>${title ?? 'Architecture Diagram'}</title>${ARCGYM_DIAGRAM_EMBEDDED_STYLE}`,
    );
  } else {
    svg = svg.replace(/<title>[^<]*<\/title>/, `$&${ARCGYM_DIAGRAM_EMBEDDED_STYLE}`);
  }
  return svg;
}
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

    // If drill contains self-contained Mermaid diagramSource, bake SVG into public/diagrams/
    if (
      raw.architecture &&
      typeof raw.architecture === 'object' &&
      typeof raw.architecture.diagramSource === 'string' &&
      raw.architecture.diagramSource.trim()
    ) {
      try {
        if (!fs.existsSync(DIAGRAMS_OUT_DIR)) {
          fs.mkdirSync(DIAGRAMS_OUT_DIR, { recursive: true });
        }
        const svg = bakeMermaidSvg(
          raw.architecture.diagramSource,
          typeof raw.title === 'string' ? raw.title : undefined,
        );
        const filename = `${String(raw.id).toLowerCase()}-topology.svg`;
        const svgPath = path.join(DIAGRAMS_OUT_DIR, filename);
        fs.writeFileSync(svgPath, svg, 'utf-8');
        raw.architecture.diagramUrl = `/diagrams/${filename}`;
      } catch (bakeErr: unknown) {
        const msg = bakeErr instanceof Error ? bakeErr.message : String(bakeErr);
        err(file, `Mermaid render failed: ${msg}`);
      }
    }

    const res = validateDrill(raw, {
      citationManifest: citationManifestUrls,
      assetExists,
      validateMermaid: (source: string) => {
        try {
          render(source);
          return { valid: true };
        } catch (e: unknown) {
          return { valid: false, error: (e as Error).message };
        }
      },
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
