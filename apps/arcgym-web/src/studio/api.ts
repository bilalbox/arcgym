import type { DrillDefinitionDTO, ValidationFinding, WordingFinding } from '@arcgym/drill-core';

const BASE = '/__studio';

export interface StudioDrillListItem {
  id: string;
  title: string;
  format: DrillDefinitionDTO['format'];
  domain: DrillDefinitionDTO['domain'];
  domainLabel: string;
  difficulty: DrillDefinitionDTO['difficulty'];
  status: DrillDefinitionDTO['status'];
  version: number;
  sourceCardIds?: string[];
  findingCount: number;
}

export interface ChunkSearchHit {
  url: string;
  title: string;
}

async function studioFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as T & {
    error?: string;
    findings?: WordingFinding[];
    validationFindings?: ValidationFinding[];
  };
  if (!res.ok) {
    const err = new Error(body.error ?? `Studio API ${res.status}`) as Error & {
      findings?: WordingFinding[];
      validationFindings?: ValidationFinding[];
      status?: number;
    };
    err.findings = body.findings;
    err.validationFindings = body.validationFindings;
    err.status = res.status;
    throw err;
  }
  return body;
}

export function listStudioDrills(
  includePublished: boolean,
): Promise<{ drills: StudioDrillListItem[] }> {
  const q = includePublished ? '?includePublished=1' : '';
  return studioFetch(`/drills${q}`);
}

export function getStudioDrill(id: string): Promise<{
  drill: DrillDefinitionDTO;
  findings: WordingFinding[];
  validationFindings?: ValidationFinding[];
}> {
  return studioFetch(`/drills/${encodeURIComponent(id)}`);
}

export function saveStudioDrill(
  id: string,
  drill: DrillDefinitionDTO,
): Promise<{
  drill: DrillDefinitionDTO;
  findings: WordingFinding[];
  validationFindings?: ValidationFinding[];
  flippedToDraft: boolean;
}> {
  return studioFetch(`/drills/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(drill),
  });
}

export function publishStudioDrill(id: string): Promise<{
  drill: DrillDefinitionDTO;
  findings: WordingFinding[];
  validationFindings?: ValidationFinding[];
  reloadRequired: boolean;
}> {
  return studioFetch(`/drills/${encodeURIComponent(id)}/publish`, { method: 'POST' });
}

export function unpublishStudioDrill(id: string): Promise<{
  drill: DrillDefinitionDTO;
  findings: WordingFinding[];
  validationFindings?: ValidationFinding[];
  reloadRequired: boolean;
}> {
  return studioFetch(`/drills/${encodeURIComponent(id)}/unpublish`, { method: 'POST' });
}

export function searchStudioChunks(q: string): Promise<{ chunks: ChunkSearchHit[] }> {
  return studioFetch(`/chunks?q=${encodeURIComponent(q)}`);
}

export function checkDiagramExists(diagramPath: string): Promise<{ exists: boolean }> {
  return studioFetch(`/diagram-exists?path=${encodeURIComponent(diagramPath)}`);
}
