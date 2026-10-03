/**
 * Local-dev-only filesystem bridge for the drill studio.
 * Mounted via Vite configureServer — never ships to Cloudflare Pages.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  citationManifestUrlsFromExports,
  type DrillDefinitionDTO,
  type DrillStatus,
  type GroundingChunkExport,
  lintDrillWording,
  type ValidationFinding,
  validateDrill,
  type WordingFinding,
} from '@arcgym/drill-core';
import type { Plugin } from 'vite';

const execFileAsync = promisify(execFile);

const STUDIO_PREFIX = '/__studio';

interface ChunkIndexEntry {
  url: string;
  title: string;
}

interface DrillListItem {
  id: string;
  title: string;
  format: DrillDefinitionDTO['format'];
  domain: DrillDefinitionDTO['domain'];
  domainLabel: string;
  difficulty: DrillDefinitionDTO['difficulty'];
  status: DrillStatus;
  version: number;
  sourceCardIds?: string[];
  findingCount: number;
}

function isLocalAddress(addr: string | undefined): boolean {
  if (!addr) return false;
  return (
    addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1' || addr === 'localhost'
  );
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function drillPath(drillsDir: string, id: string): string {
  return path.join(drillsDir, `${id.toUpperCase()}.json`);
}

function readDrill(drillsDir: string, id: string): DrillDefinitionDTO | null {
  const filePath = drillPath(drillsDir, id);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DrillDefinitionDTO;
}

function writeDrill(drillsDir: string, drill: DrillDefinitionDTO): void {
  const filePath = drillPath(drillsDir, drill.id);
  fs.writeFileSync(filePath, `${JSON.stringify(drill, null, 2)}\n`, 'utf-8');
}

function listDrills(drillsDir: string, includePublished: boolean): DrillListItem[] {
  const files = fs
    .readdirSync(drillsDir)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.findings.json'));
  const items: DrillListItem[] = [];

  for (const file of files) {
    const drill = JSON.parse(
      fs.readFileSync(path.join(drillsDir, file), 'utf-8'),
    ) as DrillDefinitionDTO;
    if (!includePublished && drill.status !== 'draft') continue;
    const findings = lintDrillWording(drill);
    items.push({
      id: drill.id,
      title: drill.title,
      format: drill.format,
      domain: drill.domain,
      domainLabel: drill.domainLabel,
      difficulty: drill.difficulty,
      status: drill.status,
      version: drill.version,
      sourceCardIds: drill.sourceCardIds,
      findingCount: findings.length,
    });
  }

  items.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'draft' ? -1 : 1;
    if (b.findingCount !== a.findingCount) return b.findingCount - a.findingCount;
    return a.id.localeCompare(b.id);
  });

  return items;
}

/** Save never publishes — published drills flip to draft; drafts stay draft. */
function prepareForSave(incoming: DrillDefinitionDTO): DrillDefinitionDTO {
  return {
    ...incoming,
    status: 'draft',
  };
}

function prepareForPublish(drill: DrillDefinitionDTO): DrillDefinitionDTO {
  return {
    ...drill,
    status: 'published',
    version: (typeof drill.version === 'number' ? drill.version : 0) + 1,
  };
}

async function runBuildDrills(repoRoot: string): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('pnpm', ['build:drills'], {
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { ok: true, output: `${stdout}\n${stderr}`.trim() };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      output: `${e.stdout ?? ''}\n${e.stderr ?? e.message ?? String(err)}`.trim(),
    };
  }
}

function loadChunkIndex(chunksPath: string): ChunkIndexEntry[] {
  if (!fs.existsSync(chunksPath)) return [];
  const raw = JSON.parse(fs.readFileSync(chunksPath, 'utf-8')) as Array<{
    metadata?: { url?: string; doc_title?: string; section_title?: string };
  }>;
  const seen = new Set<string>();
  const entries: ChunkIndexEntry[] = [];
  for (const chunk of raw) {
    const url = chunk.metadata?.url;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const title =
      [chunk.metadata?.doc_title, chunk.metadata?.section_title].filter(Boolean).join(' › ') || url;
    entries.push({ url, title });
  }
  return entries;
}

function loadAllChunkIndexes(repoRoot: string): ChunkIndexEntry[] {
  const exports = [
    'data/architect_chunks.json',
    'data/developer_chunks.json',
    'data/help_chunks.json',
  ];
  const seen = new Set<string>();
  const entries: ChunkIndexEntry[] = [];
  for (const rel of exports) {
    for (const entry of loadChunkIndex(path.join(repoRoot, rel))) {
      if (seen.has(entry.url)) continue;
      seen.add(entry.url);
      entries.push(entry);
    }
  }
  return entries;
}

function loadCitationManifestUrls(repoRoot: string): Set<string> {
  const exports = [
    'data/architect_chunks.json',
    'data/developer_chunks.json',
    'data/help_chunks.json',
  ];
  const chunksList: GroundingChunkExport[][] = [];
  for (const rel of exports) {
    const p = path.join(repoRoot, rel);
    if (fs.existsSync(p)) {
      chunksList.push(JSON.parse(fs.readFileSync(p, 'utf-8')));
    }
  }
  return citationManifestUrlsFromExports(chunksList);
}

export function studioFsPlugin(repoRoot: string, publicDir: string): Plugin {
  const drillsDir = path.join(repoRoot, 'content/drills');
  let chunkIndex: ChunkIndexEntry[] | null = null;
  let citationManifest: Set<string> | null = null;

  const getCitationManifest = () => {
    if (!citationManifest) {
      citationManifest = loadCitationManifestUrls(repoRoot);
    }
    return citationManifest;
  };

  const assetExists = (diagramPath: string) => {
    if (!diagramPath.startsWith('/') || diagramPath.includes('..')) return false;
    const abs = path.join(publicDir, diagramPath.replace(/^\//, ''));
    return abs.startsWith(publicDir) && fs.existsSync(abs);
  };

  return {
    name: 'arcgym-studio-fs',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith(STUDIO_PREFIX)) {
          next();
          return;
        }

        if (!isLocalAddress(req.socket.remoteAddress)) {
          sendJson(res, 403, { error: 'Studio API is localhost-only' });
          return;
        }

        try {
          const parsed = new URL(url, 'http://localhost');
          const pathname = parsed.pathname;

          if (req.method === 'GET' && pathname === `${STUDIO_PREFIX}/drills`) {
            const includePublished = parsed.searchParams.get('includePublished') === '1';
            sendJson(res, 200, { drills: listDrills(drillsDir, includePublished) });
            return;
          }

          if (req.method === 'GET' && pathname === `${STUDIO_PREFIX}/chunks`) {
            const q = (parsed.searchParams.get('q') ?? '').trim().toLowerCase();
            if (!chunkIndex) chunkIndex = loadAllChunkIndexes(repoRoot);
            const matches = !q
              ? []
              : chunkIndex
                  .filter(
                    (c) => c.title.toLowerCase().includes(q) || c.url.toLowerCase().includes(q),
                  )
                  .slice(0, 30);
            sendJson(res, 200, { chunks: matches });
            return;
          }

          if (req.method === 'GET' && pathname === `${STUDIO_PREFIX}/diagram-exists`) {
            const diagramPath = parsed.searchParams.get('path') ?? '';
            if (!diagramPath.startsWith('/') || diagramPath.includes('..')) {
              sendJson(res, 400, { exists: false, error: 'Invalid path' });
              return;
            }
            const abs = path.join(publicDir, diagramPath.replace(/^\//, ''));
            const exists = abs.startsWith(publicDir) && fs.existsSync(abs);
            sendJson(res, 200, { exists });
            return;
          }

          const drillMatch = pathname.match(
            new RegExp(`^${STUDIO_PREFIX}/drills/([^/]+)(?:/(publish|unpublish))?$`),
          );
          if (!drillMatch) {
            sendJson(res, 404, { error: 'Not found' });
            return;
          }

          const drillId = decodeURIComponent(drillMatch[1]).toUpperCase();
          const action = drillMatch[2] as 'publish' | 'unpublish' | undefined;

          if (req.method === 'GET' && !action) {
            const drill = readDrill(drillsDir, drillId);
            if (!drill) {
              sendJson(res, 404, { error: `Drill ${drillId} not found` });
              return;
            }
            const vRes = validateDrill(drill, {
              citationManifest: getCitationManifest(),
              assetExists,
            });
            const validationFindings = vRes.ok ? [] : vRes.findings;
            const findings = lintDrillWording(drill);
            sendJson(res, 200, { drill, findings, validationFindings });
            return;
          }

          if (req.method === 'PUT' && !action) {
            const raw = await readBody(req);
            let incoming: DrillDefinitionDTO;
            try {
              incoming = JSON.parse(raw) as DrillDefinitionDTO;
            } catch {
              sendJson(res, 400, { error: 'Invalid JSON body' });
              return;
            }
            if (String(incoming.id).toUpperCase() !== drillId) {
              sendJson(res, 400, { error: 'Body id must match URL id' });
              return;
            }
            const existing = readDrill(drillsDir, drillId);
            if (!existing) {
              sendJson(res, 404, { error: `Drill ${drillId} not found` });
              return;
            }
            const saved = prepareForSave(incoming);
            saved.id = drillId;
            writeDrill(drillsDir, saved);
            const vRes = validateDrill(saved, {
              citationManifest: getCitationManifest(),
              assetExists,
            });
            const validationFindings = vRes.ok ? [] : vRes.findings;
            const findings = lintDrillWording(saved);
            sendJson(res, 200, {
              drill: saved,
              findings,
              validationFindings,
              flippedToDraft: existing.status === 'published',
            });
            return;
          }

          if (req.method === 'POST' && action === 'publish') {
            const existing = readDrill(drillsDir, drillId);
            if (!existing) {
              sendJson(res, 404, { error: `Drill ${drillId} not found` });
              return;
            }
            const vRes = validateDrill(existing, {
              citationManifest: getCitationManifest(),
              assetExists,
            });
            if (!vRes.ok) {
              sendJson(res, 400, {
                error: 'Validation findings block publish',
                validationFindings: vRes.findings,
                findings: lintDrillWording(existing),
              });
              return;
            }
            const findings = lintDrillWording(existing);
            if (findings.length > 0) {
              sendJson(res, 400, {
                error: 'Wording findings block publish',
                validationFindings: [],
                findings,
              });
              return;
            }
            const published = prepareForPublish(existing);
            writeDrill(drillsDir, published);
            const build = await runBuildDrills(repoRoot);
            if (!build.ok) {
              // Roll status back so disk matches failure
              writeDrill(drillsDir, existing);
              sendJson(res, 500, {
                error: 'build:drills failed; publish rolled back',
                output: build.output,
              });
              return;
            }
            sendJson(res, 200, {
              drill: published,
              findings: [] as WordingFinding[],
              validationFindings: [] as ValidationFinding[],
              reloadRequired: true,
              buildOutput: build.output,
            });
            return;
          }

          if (req.method === 'POST' && action === 'unpublish') {
            const existing = readDrill(drillsDir, drillId);
            if (!existing) {
              sendJson(res, 404, { error: `Drill ${drillId} not found` });
              return;
            }
            const unpublished: DrillDefinitionDTO = { ...existing, status: 'draft' };
            writeDrill(drillsDir, unpublished);
            const build = await runBuildDrills(repoRoot);
            if (!build.ok) {
              writeDrill(drillsDir, existing);
              sendJson(res, 500, {
                error: 'build:drills failed; unpublish rolled back',
                output: build.output,
              });
              return;
            }
            const vRes = validateDrill(unpublished, {
              citationManifest: getCitationManifest(),
              assetExists,
            });
            sendJson(res, 200, {
              drill: unpublished,
              findings: lintDrillWording(unpublished),
              validationFindings: vRes.ok ? [] : vRes.findings,
              reloadRequired: true,
              buildOutput: build.output,
            });
            return;
          }

          sendJson(res, 405, { error: 'Method not allowed' });
        } catch (err) {
          sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
        }
      });
    },
  };
}
