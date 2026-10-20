#!/usr/bin/env node

/**
 * ArcGym Pattern & Antipattern Exploration Tool
 *
 * Deterministically queries Well-Architected Grounding patterns, Friction Cards,
 * and candidate antipattern distractors by Architectural Domain.
 *
 * Usage:
 *   npx tsx scripts/generator/explore-patterns.ts domains
 *   npx tsx scripts/generator/explore-patterns.ts patterns --domain Platform_Core [--query "async"]
 *   npx tsx scripts/generator/explore-patterns.ts antipatterns --domain Data_Architecture --topic "DLO to DMO"
 *   npx tsx scripts/generator/explore-patterns.ts ground --query "Queueable Apex limits" [--top-k 3]
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ARCHITECTURAL_DOMAIN_LABELS,
  ARCHITECTURAL_DOMAINS,
  type ArchitecturalDomain,
  citationManifestUrlsFromExports,
  type GroundingChunkExport,
} from '../../packages/drill-core/src/index.js';

const ROOT_DIR = process.cwd();
const ARCHITECT_CHUNKS_PATH = path.join(ROOT_DIR, 'data/architect_chunks.json');
const FRICTION_CARDS_PATH = path.join(ROOT_DIR, 'data/friction_cards.json');
const COMMUNITY_PATTERNS_PATH = path.join(ROOT_DIR, 'data/curated_community_patterns.json');
const CHROMA_SEARCH_SCRIPT = path.join(ROOT_DIR, 'scripts/crawler/search_chroma.py');

const GROUNDING_EXPORTS = [
  'data/architect_chunks.json',
  'data/developer_chunks.json',
  'data/help_chunks.json',
];

export interface PatternTopic {
  title: string;
  domain: ArchitecturalDomain;
  description: string;
  sourceType: 'decision-guide' | 'friction-card' | 'community-pattern';
  sourceId?: string;
  sampleQuery: string;
}

export interface AntipatternCandidate {
  name: string;
  approach: string;
  whyItFails: string;
  sourceType: 'friction-card' | 'well-architected-chunk';
  sourceRef: string;
}

export interface GroundingHitResult {
  url: string;
  docTitle: string;
  sectionTitle: string;
  pillar: string;
  excerpt: string;
}

interface RawChunk {
  id?: string;
  document: string;
  metadata: {
    doc_title?: string;
    section_title?: string;
    breadcrumb?: string;
    pillar?: string;
    category?: string;
    url?: string;
  };
}

interface RawFrictionCard {
  card_id: string;
  title: string;
  domain: string;
  pillars: string[];
  problem: string;
  naive_approaches: { approach: string; why_it_fails: string }[];
  resolution: string;
  official_doc_query: string;
}

interface RawCommunityPattern {
  pattern_id: string;
  topic_cluster: string;
  pillar: string;
  well_architected_domain: string;
  architectural_tension: string;
  antipattern_distractors: string[];
}

const CURATED_DOMAIN_TOPICS: Record<ArchitecturalDomain, PatternTopic[]> = {
  Platform_Core: [
    {
      title: 'Asynchronous Processing Trade-Offs',
      domain: 'Platform_Core',
      description:
        'Queueable Apex vs Batch Apex vs Scheduled vs Future methods under governor limits.',
      sourceType: 'decision-guide',
      sampleQuery: 'Asynchronous Processing on the Lightning Platform Queueable Batch',
    },
    {
      title: 'Record-Triggered Automation Architecture',
      domain: 'Platform_Core',
      description:
        'Before-Save Flow vs After-Save Flow vs Apex Triggers for high-throughput transactions.',
      sourceType: 'decision-guide',
      sampleQuery: 'Record-Triggered Automation Decision Guide Before-Save After-Save Flow',
    },
    {
      title: 'Platform Execution Governors & Concurrency',
      domain: 'Platform_Core',
      description: 'Mitigating row locks, CPU timeout (10s sync / 60s async), and heap exhaustion.',
      sourceType: 'decision-guide',
      sampleQuery: 'Apex governor limits concurrency row lock avoidance',
    },
  ],
  Data_Architecture: [
    {
      title: 'Data Cloud DLO to DMO Modeling Limits',
      domain: 'Data_Architecture',
      description: 'Managing relationship caps, mapping cardinality, and custom field constraints.',
      sourceType: 'friction-card',
      sourceId: 'FC-0D54V000079Rcb8SAC',
      sampleQuery: 'Data 360 limits and guidelines DMO relationships Individual',
    },
    {
      title: 'Data Cloud Ingestion Freshness & Latency',
      domain: 'Data_Architecture',
      description:
        'Selecting batch connector vs Ingestion API vs streaming SDK based on freshness SLA.',
      sourceType: 'friction-card',
      sourceId: 'FC-0D54V00007AjVvxSAF',
      sampleQuery: 'Data 360 data stream schedule ingestion API latency',
    },
    {
      title: 'Large Data Volumes & Custom Indexing',
      domain: 'Data_Architecture',
      description: 'Filter selectivity, skinny tables, standard vs custom index boundaries.',
      sourceType: 'decision-guide',
      sampleQuery: 'Large data volumes custom index skinny tables query selectivity',
    },
  ],
  Security_And_Access: [
    {
      title: 'Data Cloud Security & Tenant Isolation',
      domain: 'Security_And_Access',
      description: 'Data spaces, consent management, and granular permission architectures.',
      sourceType: 'decision-guide',
      sampleQuery: 'Data 360 Security Architecture data spaces permissions',
    },
    {
      title: 'Enterprise Record-Level Sharing at Scale',
      domain: 'Security_And_Access',
      description:
        'Avoiding group maintenance bottlenecks and implicit sharing cascades in massive orgs.',
      sourceType: 'decision-guide',
      sampleQuery: 'Enterprise sharing architecture group maintenance implicit sharing',
    },
    {
      title: 'Shield Platform Encryption Architectural Boundaries',
      domain: 'Security_And_Access',
      description:
        'Deterministic vs probabilistic encryption impacts on SOQL filtering, sorting, and indexing.',
      sourceType: 'decision-guide',
      sampleQuery: 'Shield Platform Encryption filtering deterministic SOQL limits',
    },
  ],
  Integration_Apis: [
    {
      title: 'Event-Driven Architecture & Event Recovery',
      domain: 'Integration_Apis',
      description:
        'High-volume Platform Events, Change Data Capture replay windows, and delivery guarantees.',
      sourceType: 'decision-guide',
      sampleQuery: 'Event-Driven Architecture Platform Events Change Data Capture replay',
    },
    {
      title: 'Bulk Data Synchronization Patterns',
      domain: 'Integration_Apis',
      description:
        'Bulk API v2 vs Composite API vs Ingestion API for near-real-time vs batch payloads.',
      sourceType: 'decision-guide',
      sampleQuery: 'Integration Decision Guides Bulk API v2 Composite API batch sync',
    },
    {
      title: 'Zero-Copy Data Federation vs Ingestion',
      domain: 'Integration_Apis',
      description: 'Federated queries via Snowflake/BigQuery Zero Copy vs physical data ingestion.',
      sourceType: 'decision-guide',
      sampleQuery: 'Zero Copy data federation Snowflake BigQuery Data 360',
    },
  ],
  Ai_And_Automation: [
    {
      title: 'Agentic vs Traditional Workflow Automation',
      domain: 'Ai_And_Automation',
      description:
        'Determining when autonomous Agentforce actions supersede deterministic Flow/Apex.',
      sourceType: 'decision-guide',
      sampleQuery: 'Determining Agentic and Traditional Workflow Automation Agentforce',
    },
    {
      title: 'Atlas Reasoning Engine Topic Decomposition',
      domain: 'Ai_And_Automation',
      description:
        'Action grounding, instruction scope isolation, and guardrails to prevent agent hallucination.',
      sourceType: 'decision-guide',
      sampleQuery: 'Agentic Patterns and Implementation with Agentforce Atlas reasoning topic',
    },
    {
      title: 'Prompt Builder RAG Grounding Architecture',
      domain: 'Ai_And_Automation',
      description: 'Context window budget, token economization, and Trust Layer dynamic masking.',
      sourceType: 'decision-guide',
      sampleQuery: 'Prompt Builder grounding Einstein Trust Layer data masking',
    },
  ],
  Infrastructure: [
    {
      title: 'Hyperforce Regional Data Residency',
      domain: 'Infrastructure',
      description:
        'Architecting for sovereign regulatory boundaries, local data storage, and zero data egress.',
      sourceType: 'decision-guide',
      sampleQuery: 'Hyperforce regional data residency compliance sovereign cloud',
    },
    {
      title: 'Multi-Region High Availability & Recovery',
      domain: 'Infrastructure',
      description:
        'RTO / RPO trade-offs for cross-region disaster recovery and read-replica scaling.',
      sourceType: 'decision-guide',
      sampleQuery: 'High Availability Disaster Recovery Reliability pillar failover RTO',
    },
  ],
  Devops_Lifecycle: [
    {
      title: 'Package-Based (2GP) Dependency Management',
      domain: 'Devops_Lifecycle',
      description:
        'Circular dependencies, version ancestral trees, and unlocked package modularity.',
      sourceType: 'decision-guide',
      sampleQuery: 'Second-Generation Managed Packages unlocked packages dependencies modularity',
    },
    {
      title: 'Scratch Org Pool Optimization & CI Gating',
      domain: 'Devops_Lifecycle',
      description:
        'Balancing test execution timeouts, seed data hydration, and ephemeral org governance.',
      sourceType: 'decision-guide',
      sampleQuery: 'DevOps lifecycle scratch org pools continuous integration gates',
    },
  ],
};

function readJsonFileSafe<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

export function loadArchitectChunks(): RawChunk[] {
  return readJsonFileSafe<RawChunk[]>(ARCHITECT_CHUNKS_PATH, []);
}

export function loadFrictionCards(): RawFrictionCard[] {
  const data = readJsonFileSafe<{ cards?: RawFrictionCard[] }>(FRICTION_CARDS_PATH, {});
  return Array.isArray(data.cards) ? data.cards : [];
}

export function loadCommunityPatterns(): RawCommunityPattern[] {
  const data = readJsonFileSafe<{ curated_patterns?: RawCommunityPattern[] }>(
    COMMUNITY_PATTERNS_PATH,
    {},
  );
  return Array.isArray(data.curated_patterns) ? data.curated_patterns : [];
}

export function getDomainOverview(): {
  domain: ArchitecturalDomain;
  label: string;
  curatedPatternCount: number;
  frictionCardCount: number;
}[] {
  const cards = loadFrictionCards();
  return ARCHITECTURAL_DOMAINS.map((domain) => {
    const curated = CURATED_DOMAIN_TOPICS[domain] ?? [];
    const domainCards = cards.filter((c) => c.domain === domain);
    return {
      domain,
      label: ARCHITECTURAL_DOMAIN_LABELS[domain],
      curatedPatternCount: curated.length,
      frictionCardCount: domainCards.length,
    };
  });
}

export function getPatternsForDomain(domain: ArchitecturalDomain, query?: string): PatternTopic[] {
  const baseTopics = CURATED_DOMAIN_TOPICS[domain] ?? [];
  const cards = loadFrictionCards().filter((c) => c.domain === domain);

  const cardTopics: PatternTopic[] = cards.map((c) => ({
    title: c.title,
    domain,
    description: c.problem.slice(0, 140),
    sourceType: 'friction-card',
    sourceId: c.card_id,
    sampleQuery: c.official_doc_query || c.title,
  }));

  const allTopics = [...baseTopics, ...cardTopics];
  if (!query) return allTopics;

  const q = query.toLowerCase();
  return allTopics.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.sampleQuery.toLowerCase().includes(q),
  );
}

function matchesCardTarget(card: RawFrictionCard, target?: string): boolean {
  if (!target) return true;
  const t = target.toLowerCase();
  return (
    card.card_id.toLowerCase() === t ||
    card.title.toLowerCase().includes(t) ||
    card.problem.toLowerCase().includes(t)
  );
}

function getFrictionCardAntipatterns(
  domain: ArchitecturalDomain,
  topicOrCard?: string,
): AntipatternCandidate[] {
  const results: AntipatternCandidate[] = [];
  const cards = loadFrictionCards().filter((c) => c.domain === domain);

  for (const card of cards) {
    if (!matchesCardTarget(card, topicOrCard)) continue;
    for (const naive of card.naive_approaches) {
      results.push({
        name: naive.approach.slice(0, 80),
        approach: naive.approach,
        whyItFails: naive.why_it_fails,
        sourceType: 'friction-card',
        sourceRef: card.card_id,
      });
    }
  }
  return results;
}

function isAntiPatternChunk(docLower: string): boolean {
  return (
    docLower.includes('anti-pattern') ||
    docLower.includes('what to avoid') ||
    docLower.includes('drawback') ||
    docLower.includes('unintended consequences')
  );
}

function getChunkAntipatterns(
  domain: ArchitecturalDomain,
  topicOrCard?: string,
): AntipatternCandidate[] {
  const results: AntipatternCandidate[] = [];
  const chunks = loadArchitectChunks();
  const searchNeedle = (topicOrCard ?? domain.replace(/_/g, ' ')).toLowerCase();

  for (const c of chunks) {
    const docLower = c.document.toLowerCase();
    if (!isAntiPatternChunk(docLower)) continue;

    const matchesNeedle =
      docLower.includes(searchNeedle) ||
      (c.metadata.section_title?.toLowerCase().includes(searchNeedle) ?? false);
    if (!matchesNeedle) continue;

    const title = c.metadata.section_title || c.metadata.doc_title || 'Well-Architected Guidance';
    results.push({
      name: `Architect Anti-Pattern: ${title}`,
      approach: c.document.slice(0, 160).replace(/\n+/g, ' ').trim(),
      whyItFails: 'Violates Well-Architected scalability/governor boundaries as documented.',
      sourceType: 'well-architected-chunk',
      sourceRef: c.metadata.url || title,
    });
    if (results.length >= 8) break;
  }
  return results;
}

export function getCandidateAntipatterns(
  domain: ArchitecturalDomain,
  topicOrCard?: string,
): AntipatternCandidate[] {
  const cardResults = getFrictionCardAntipatterns(domain, topicOrCard);
  const chunkResults = getChunkAntipatterns(domain, topicOrCard);
  return [...cardResults, ...chunkResults].slice(0, 6);
}

export function queryChromaOrFallback(query: string, topK = 3): GroundingHitResult[] {
  try {
    const output = execFileSync(
      'uv',
      [
        'run',
        '--with',
        'chromadb',
        'python',
        CHROMA_SEARCH_SCRIPT,
        query,
        '--top-k',
        String(topK),
        '--json',
      ],
      {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    const parsed = JSON.parse(output.trim()) as Array<{
      content: string;
      metadata: {
        doc_title?: string;
        section_title?: string;
        pillar?: string;
        url?: string;
      };
    }>;
    return parsed.map((item) => ({
      url: item.metadata.url || '',
      docTitle: item.metadata.doc_title || 'Documentation',
      sectionTitle: item.metadata.section_title || '',
      pillar: item.metadata.pillar || 'Reliability',
      excerpt: item.content.slice(0, 300).trim(),
    }));
  } catch {
    // In-memory fallback
    const chunks = loadArchitectChunks();
    const qLower = query.toLowerCase();
    const hits = chunks.filter((c) => c.document.toLowerCase().includes(qLower)).slice(0, topK);
    return hits.map((c) => ({
      url: c.metadata.url || '',
      docTitle: c.metadata.doc_title || 'Documentation',
      sectionTitle: c.metadata.section_title || '',
      pillar: c.metadata.pillar || 'Reliability',
      excerpt: c.document.slice(0, 300).trim(),
    }));
  }
}

export function verifyGroundingAgainstManifest(hits: GroundingHitResult[]): {
  verified: GroundingHitResult[];
  unverified: GroundingHitResult[];
} {
  const allExports: GroundingChunkExport[][] = [];
  for (const rel of GROUNDING_EXPORTS) {
    const full = path.join(ROOT_DIR, rel);
    if (fs.existsSync(full)) {
      allExports.push(readJsonFileSafe<GroundingChunkExport[]>(full, []));
    }
  }
  const manifest = citationManifestUrlsFromExports(allExports);
  const verified: GroundingHitResult[] = [];
  const unverified: GroundingHitResult[] = [];

  for (const hit of hits) {
    if (manifest.has(hit.url)) {
      verified.push(hit);
    } else {
      unverified.push(hit);
    }
  }
  return { verified, unverified };
}

// ---------------- CLI COMMANDS ----------------

function printDomains(json: boolean) {
  const domains = getDomainOverview();
  if (json) {
    console.log(JSON.stringify(domains, null, 2));
    return;
  }
  console.log('\n=== ArcGym Architectural Domains ===\n');
  domains.forEach((d, idx) => {
    console.log(
      `${idx + 1}. [${d.domain}] ${d.label} (${d.curatedPatternCount} guides, ${d.frictionCardCount} friction cards)`,
    );
  });
  console.log('\nUse: explore-patterns.ts patterns --domain <domain>\n');
}

function printPatterns(domainStr: string, query: string | undefined, json: boolean) {
  const domain = domainStr as ArchitecturalDomain;
  if (!ARCHITECTURAL_DOMAINS.includes(domain)) {
    console.error(
      `Invalid domain: ${domainStr}. Must be one of: ${ARCHITECTURAL_DOMAINS.join(', ')}`,
    );
    process.exit(1);
  }
  const patterns = getPatternsForDomain(domain, query);
  if (json) {
    console.log(JSON.stringify(patterns, null, 2));
    return;
  }
  console.log(`\n=== Patterns for ${ARCHITECTURAL_DOMAIN_LABELS[domain]} ===\n`);
  patterns.forEach((p, idx) => {
    const src = p.sourceId ? ` [${p.sourceId}]` : ` (${p.sourceType})`;
    console.log(`${idx + 1}. ${p.title}${src}`);
    console.log(`   Dilemma: ${p.description}`);
    console.log(`   Doc Query: "${p.sampleQuery}"\n`);
  });
}

function printAntipatterns(domainStr: string, topic: string | undefined, json: boolean) {
  const domain = domainStr as ArchitecturalDomain;
  if (!ARCHITECTURAL_DOMAINS.includes(domain)) {
    console.error(`Invalid domain: ${domainStr}`);
    process.exit(1);
  }
  const candidates = getCandidateAntipatterns(domain, topic);
  if (json) {
    console.log(JSON.stringify(candidates, null, 2));
    return;
  }
  console.log(`\n=== Antipattern Candidates for ${ARCHITECTURAL_DOMAIN_LABELS[domain]} ===\n`);
  candidates.forEach((a, idx) => {
    console.log(`${idx + 1}. Approach: "${a.approach}"`);
    console.log(`   Why it fails: ${a.whyItFails}`);
    console.log(`   Source: ${a.sourceType} (${a.sourceRef})\n`);
  });
}

function printGround(query: string, topK: number, json: boolean) {
  const hits = queryChromaOrFallback(query, topK);
  const { verified, unverified } = verifyGroundingAgainstManifest(hits);
  if (json) {
    console.log(JSON.stringify({ verified, unverified }, null, 2));
    return;
  }
  console.log(`\n=== Grounding Chunks for: "${query}" ===\n`);
  verified.forEach((h, idx) => {
    console.log(`${idx + 1}. [VERIFIED MANIFEST] ${h.docTitle} > ${h.sectionTitle}`);
    console.log(`   Pillar: ${h.pillar}`);
    console.log(`   URL: ${h.url}`);
    console.log(`   Excerpt: ${h.excerpt}\n`);
  });
  if (unverified.length > 0) {
    console.log(`--- Non-Manifest URLs (Not eligible for correct option citation) ---`);
    for (const h of unverified) {
      console.log(`   ${h.url}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const json = args.includes('--json');

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  switch (command) {
    case 'domains':
      printDomains(json);
      break;
    case 'patterns': {
      const domain = getArg('--domain');
      if (!domain) {
        console.error('Missing --domain argument');
        process.exit(1);
      }
      printPatterns(domain, getArg('--query'), json);
      break;
    }
    case 'antipatterns': {
      const domain = getArg('--domain');
      if (!domain) {
        console.error('Missing --domain argument');
        process.exit(1);
      }
      printAntipatterns(domain, getArg('--topic') || getArg('--card'), json);
      break;
    }
    case 'ground': {
      const q = getArg('--query');
      if (!q) {
        console.error('Missing --query argument');
        process.exit(1);
      }
      const topK = parseInt(getArg('--top-k') || '3', 10);
      printGround(q, topK, json);
      break;
    }
    default:
      console.log(`
Usage:
  explore-patterns.ts domains [--json]
  explore-patterns.ts patterns --domain <Domain> [--query <str>] [--json]
  explore-patterns.ts antipatterns --domain <Domain> [--topic <str>] [--card <id>] [--json]
  explore-patterns.ts ground --query <str> [--top-k <num>] [--json]
`);
      break;
  }
}

if (process.argv[1]?.endsWith('explore-patterns.ts')) {
  main();
}
