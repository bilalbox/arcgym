#!/usr/bin/env node

/**
 * ArcGym RAG Drill Generator CLI
 *
 * Builds a grounded drill-authoring prompt from official Salesforce Well-Architected chunks
 * (ChromaDB) and, optionally, a reviewed Friction Card. The coding agent answers the prompt;
 * `ingest` validates the agent's drill JSON and saves it as a draft.
 *
 * Usage:
 *   npx tsx scripts/generator/generate-drill.ts prompt --from-card FC-0D5KX00000jATZ10AO > /tmp/drill-prompt.md
 *   npx tsx scripts/generator/generate-drill.ts prompt --topic "Large Data Volumes Skinny Tables" --format Lesson
 *   npx tsx scripts/generator/generate-drill.ts ingest /tmp/AGD-00402.json [--force]
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ARCHITECTURAL_DOMAIN_LABELS,
  type ArchitecturalDomain,
  CASE_FILE_MIN_STATIONS,
  citationManifestUrlsFromExports,
  clearIngestFindings,
  DRILL_DIFFICULTIES,
  DRILL_FORMATS,
  type DrillDefinitionDTO,
  type DrillDifficulty,
  type DrillFormat,
  findingsSidecarPath,
  type GroundingChunkExport,
  lintDrillWording,
  TROUBLESHOOTING_HIDDEN_DISTRACTOR_COUNT,
  TROUBLESHOOTING_MIN_PIVOTAL_PROBES,
  TROUBLESHOOTING_PROBE_BUDGET,
  validateDrill,
  WELL_ARCHITECTED_PILLARS,
  type WellArchitectedPillar,
  writeIngestFindings,
} from '../../packages/drill-core/src/index.js';

const GROUNDING_CHUNK_EXPORTS = [
  'data/architect_chunks.json',
  'data/developer_chunks.json',
  'data/help_chunks.json',
];

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const CHROMA_SEARCH_SCRIPT = path.join(ROOT_DIR, 'scripts/crawler/search_chroma.py');
const FRICTION_CARDS_PATH = path.join(ROOT_DIR, 'data/friction_cards.json');

interface ChromaChunk {
  content: string;
  metadata: {
    doc_title: string;
    section_title: string;
    breadcrumb: string;
    pillar: string;
    category: string;
    url: string;
    crawled_at: string;
    char_count: number;
  };
  cosine_similarity: number;
}

/** Human-reviewed practitioner friction exported by scripts/crawler/friction_cards.py. */
interface FrictionCard {
  card_id: string;
  thread_url: string;
  title: string;
  domain: string;
  pillars: string[];
  problem: string;
  constraints: string[];
  naive_approaches: { approach: string; why_it_fails: string }[];
  resolution: string;
  resolution_source: 'best_answer' | 'thread_consensus' | 'unresolved';
  official_doc_query: string;
}

interface PromptArgs {
  topic: string;
  domain?: string;
  pillar?: string;
  format: DrillFormat;
  difficulty: DrillDifficulty;
  steps: number;
  /** Case_File: station count (>= 3). Defaults to 3 when unset. */
  stations?: number;
  id?: string;
  topK: number;
  fromCard?: string;
  /** Overrides the ChromaDB search phrase(s). Multiple --query flags are merged and deduped. */
  queries: string[];
}

function fail(message: string): never {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

function parsePromptArgs(args: string[]): PromptArgs {
  const result: PromptArgs = {
    topic: '',
    format: 'Case_File',
    difficulty: 'Lead_CTA',
    steps: 3,
    topK: 5,
    queries: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];
    if (arg === '--topic' && value) {
      result.topic = args[++i];
    } else if (arg === '--domain' && value) {
      result.domain = args[++i];
    } else if (arg === '--pillar' && value) {
      result.pillar = args[++i];
    } else if (arg === '--format' && value) {
      if (!DRILL_FORMATS.includes(value as DrillFormat)) {
        fail(`--format must be one of ${DRILL_FORMATS.join('|')}`);
      }
      result.format = args[++i] as PromptArgs['format'];
    } else if (arg === '--difficulty' && value) {
      if (!DRILL_DIFFICULTIES.includes(value as DrillDifficulty)) {
        fail(`--difficulty must be one of ${DRILL_DIFFICULTIES.join('|')}`);
      }
      result.difficulty = args[++i] as PromptArgs['difficulty'];
    } else if (arg === '--steps' && value) {
      result.steps = parseInt(args[++i], 10);
    } else if (arg === '--stations' && value) {
      const n = parseInt(args[++i], 10);
      if (!Number.isFinite(n) || n < 3) {
        fail('--stations must be an integer >= 3');
      }
      result.stations = n;
    } else if (arg === '--id' && value) {
      result.id = args[++i];
    } else if (arg === '--top-k' && value) {
      result.topK = parseInt(args[++i], 10);
    } else if (arg === '--from-card' && value) {
      result.fromCard = args[++i];
    } else if (arg === '--query' && value) {
      result.queries.push(args[++i]);
    } else {
      fail(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return result;
}

function loadFrictionCards(): FrictionCard[] {
  if (!fs.existsSync(FRICTION_CARDS_PATH)) {
    fail(
      `${FRICTION_CARDS_PATH} not found. Run \`python scripts/crawler/friction_cards.py export\` first.`,
    );
  }
  return JSON.parse(fs.readFileSync(FRICTION_CARDS_PATH, 'utf-8')).cards as FrictionCard[];
}

function loadFrictionCard(cardId: string): FrictionCard {
  const card = loadFrictionCards().find((c) => c.card_id === cardId);
  if (!card) {
    fail(
      `Friction Card ${cardId} is not in the approved catalog. Approve it with friction_cards.py review, then export.`,
    );
  }
  return card;
}

/** Generated drills use AGD-00401..00499. */
function getNextDrillId(): string {
  const [floor, ceiling] = [400, 500];
  const files = fs.existsSync(DRILLS_DIR) ? fs.readdirSync(DRILLS_DIR) : [];
  let maxNum = floor;
  for (const f of files) {
    const match = f.match(/^AGD-(\d{5})\.json$/);
    const num = match ? parseInt(match[1], 10) : 0;
    if (num > maxNum && num < ceiling) maxNum = num;
  }
  return `AGD-${String(maxNum + 1).padStart(5, '0')}`;
}

function chunkKey(c: ChromaChunk): string {
  return `${c.metadata.url}::${c.metadata.section_title}::${c.content.slice(0, 80)}`;
}

function queryChroma(query: string, topK: number, pillar?: string): ChromaChunk[] {
  console.error(`[RAG] Searching ChromaDB for: "${query}" (top ${topK})...`);
  try {
    const cmdArgs = [
      'run',
      '--with',
      'chromadb',
      'python',
      CHROMA_SEARCH_SCRIPT,
      query,
      '--top-k',
      String(topK),
      '--json',
    ];
    if (pillar) {
      cmdArgs.push('--pillar', pillar);
    }
    const output = execFileSync('uv', cmdArgs, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(output.trim()) as ChromaChunk[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[WARN] Chroma search failed (${msg}). Falling back to flat JSON data if available.`,
    );
    const allChunks: { document: string; metadata: ChromaChunk['metadata'] }[] = [];
    for (const rel of GROUNDING_CHUNK_EXPORTS) {
      const fallbackPath = path.join(ROOT_DIR, rel);
      if (!fs.existsSync(fallbackPath)) continue;
      allChunks.push(
        ...(JSON.parse(fs.readFileSync(fallbackPath, 'utf-8')) as {
          document: string;
          metadata: ChromaChunk['metadata'];
        }[]),
      );
    }
    if (allChunks.length === 0) return [];
    const queryLower = query.toLowerCase();
    return allChunks
      .filter((c) => !pillar || c.metadata.pillar === pillar)
      .filter(
        (c) =>
          c.document.toLowerCase().includes(queryLower) ||
          c.metadata.section_title.toLowerCase().includes(queryLower),
      )
      .slice(0, topK)
      .map((c) => ({
        content: c.document,
        metadata: c.metadata,
        cosine_similarity: 0.8,
      }));
  }
}

function queryChromaMerged(queries: string[], topK: number, pillar?: string): ChromaChunk[] {
  const seen = new Set<string>();
  const merged: ChromaChunk[] = [];
  for (const query of queries) {
    for (const chunk of queryChroma(query, topK, pillar)) {
      const key = chunkKey(chunk);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(chunk);
    }
  }
  return merged;
}

function inferDomain(category?: string, pillar?: string): string {
  if (pillar === 'Agentforce' || category?.includes('agent')) return 'Ai_And_Automation';
  if (pillar === 'Data_360' || category?.includes('data')) return 'Data_Architecture';
  if (category === 'decision-guides' || category?.includes('integration'))
    return 'Integration_Apis';
  if (pillar === 'Trust' || category?.includes('security')) return 'Security_And_Access';
  if (category === 'devops' || category?.includes('devops')) return 'Devops_Lifecycle';
  return 'Platform_Core';
}

/** Chunk `pillar` metadata mixes product areas (Core_Platform, Data_360) with Well-Architected pillars. */
function resolvePillars(chunks: ChromaChunk[], card?: FrictionCard): string[] {
  if (card?.pillars.length) return card.pillars;
  return Array.from(
    new Set(
      chunks
        .map((c) => c.metadata.pillar)
        .filter((p): p is WellArchitectedPillar =>
          WELL_ARCHITECTED_PILLARS.includes(p as WellArchitectedPillar),
        ),
    ),
  );
}

function buildFrictionSection(card?: FrictionCard): string {
  if (!card) return '';
  const approaches = card.naive_approaches.length
    ? card.naive_approaches
        .map((a, i) => `${i + 1}. ${a.approach}\n   Why it fails: ${a.why_it_fails}`)
        .join('\n')
    : '(none recorded; derive distractors from the official chunks)';
  return `
### Practitioner Friction (Trailblazer Community, human-reviewed paraphrase)
- Problem: ${card.problem}
- Constraints: ${card.constraints.length ? card.constraints.join('; ') : '(none stated)'}
- Naive approaches practitioners tried:
${approaches}
- Community resolution (${card.resolution_source}): ${card.resolution || '(unresolved)'}

### Rules for Using Practitioner Friction:
1. Build the scenario from the problem and constraints above, restated in enterprise terms. Do not name the community, the thread, or any person.
2. Model each incorrect option on one of the naive approaches above, spreading distractors across them. A naive approach whose fix the chunks do not govern still makes a good distractor.
3. The community resolution is context, not grounding: the correct option rests on the official chunks alone.
`;
}

/** The wording standard for every generated drill; `ingest` enforces the mechanical parts via lintDrillWording. */
const WORDING_RULES = `### Wording Rules (ingest rejects drills that break the checkable ones):
- Question text (prompt / scenario): the situation, then the constraint(s) the answer depends on, then exactly one question. Every sentence and number must matter to at least one option's reasoning; keep Rapid Fire stems and Case File station prompts to 55 words or fewer. State constraints as facts or numbers (e.g. "the org already uses 80% of its daily API allocation"), never as the negation of an option's approach ("without a polling service" rules out the polling option by keyword). Ask for the decision ("Which pattern should the architect use?"), not "Which is Well-Architected?". Never name the source document. No stakeholder emotion ("Leadership will not accept…").
- Options: every option answers the same question in the same grammatical shape, with one decision per option. The correct option must not be the longest: keep all options within ±25% of each other in word count. Every distractor is something a competent practitioner would plausibly choose. Never use words that announce a wrong answer: entirely, blindly, immediately, always, never, directly to production, raw, without X.
- Facts: every number, limit, product name, and API or exception name must be real. A distractor may misapply a real limit but may not invent one.
- Correct-option rationale (Case File recommendation rationale): 1–3 sentences covering the principle from the cited chunk and the constraint in the question that decides it. Do not repeat the option's wording.
- Feedback text (rationale): no verdict prefixes ("Correct!", "Antipattern:", "Risky!"); the UI already shows the verdict.
- Case File only: brief.synopsis may be longer (Evaluation-scale, max ~220 words) but must NOT contain pivotal probe answer text. Probe labels are clarifying questions ending with ?. Probe answers are scenario facts only—never architecture advice. Exactly 2 pivotal probes per station; distractor probes need distractorAntipattern.
`;

function buildTroubleshootingSchema(
  drillId: string,
  args: PromptArgs,
  domain: string,
  domainLabel: string,
  pillarExample: string,
  sourceCardLine: string,
  citationUrl: string,
): string {
  return `{
  "id": "${drillId}",
  "title": "Clear Incident title (failure under topology stress)",
  "format": "Troubleshooting",
  "domain": "${domain}",
  "domainLabel": "${domainLabel}",
  "difficulty": "${args.difficulty}",
  "pillars": ${pillarExample},
  "version": 1,
  "status": "draft",${sourceCardLine}
  "architecture": {
    "synopsis": "Topology narrative without the diagnosis (max ~120 words)",
    "diagramSource": "flowchart LR\\n  A[Source] --> B[Target]",
    "diagramLabel": "Short diagram caption"
  },
  "issue": "Current failure symptom statement; do not leak the gold cause",
  "probeBudget": ${TROUBLESHOOTING_PROBE_BUDGET},
  "probes": [
    {
      "id": "p1",
      "label": "Pivotal clarifying question?",
      "tier": "pivotal",
      "answer": "Scenario fact that unlocks the diagnosis (must NOT appear in architecture/issue)"
    },
    {
      "id": "p2",
      "label": "Second pivotal clarifying question?",
      "tier": "pivotal",
      "answer": "Another scenario fact"
    },
    {
      "id": "p3",
      "label": "Useful clarifying question?",
      "tier": "useful",
      "answer": "Helpful but not required fact"
    },
    {
      "id": "p4",
      "label": "Distractor clarifying question?",
      "tier": "distractor",
      "answer": "Irrelevant fact",
      "distractorAntipattern": "Short Antipattern Name"
    }
  ],
  "goldCause": {
    "text": "One to two sentences naming the root cause",
    "rationale": "Why this failure class holds; cite the platform rule when documentation-backed",
    "citationUrl": "${citationUrl}"
  },
  "hiddenDistractors": [
    {
      "id": "d1",
      "text": "Plausible wrong cause modeled on a failed practitioner approach",
      "antipattern": "Short Antipattern Name",
      "rationale": "Why this near-miss fails under the unlocked facts"
    },
    {
      "id": "d2",
      "text": "Second hidden antipattern cause",
      "antipattern": "Short Antipattern Name",
      "rationale": "Why it fails"
    },
    {
      "id": "d3",
      "text": "Third hidden antipattern cause",
      "antipattern": "Short Antipattern Name",
      "rationale": "Why it fails"
    }
  ],
  "fix": {
    "prompt": "Select the architectural remediation:",
    "options": [
      {
        "id": "fix_gold",
        "label": "Gold architectural fix...",
        "rationale": "Why it resolves the root cause under architecture constraints",
        "isCorrect": true,
        "citationUrl": "${citationUrl}"
      },
      {
        "id": "fix_d1",
        "label": "First distractor fix...",
        "rationale": "Why it fails or triggers downstream bottlenecks",
        "isCorrect": false,
        "distractorAntipattern": "Short Antipattern Name"
      },
      {
        "id": "fix_d2",
        "label": "Second distractor fix...",
        "rationale": "Why it fails",
        "isCorrect": false,
        "distractorAntipattern": "Short Antipattern Name"
      }
    ]
  }
}
Write exactly ${TROUBLESHOOTING_HIDDEN_DISTRACTOR_COUNT} hiddenDistractors. Require ≥${TROUBLESHOOTING_MIN_PIVOTAL_PROBES} pivotal probes, mix useful + distractor probes (~7 total), probeBudget ${TROUBLESHOOTING_PROBE_BUDGET}. diagramSource (Mermaid string) is required. Gold cause ≤ ~2 sentences. Never render hiddenDistractors as MCQ options. Include a Fix definition with exactly 3 options (1 gold cited + 2 distractor antipatterns). Probe answers are scenario fiction; only goldCause.citationUrl and gold fix citationUrl cite Well-Architected Grounding when doc-backed. Prefer modeling hiddenDistractors from Friction Card failed approaches when a card is provided.`;
}

function buildCaseFileSchema(
  drillId: string,
  args: PromptArgs,
  domain: string,
  domainLabel: string,
  pillarExample: string,
  sourceCardLine: string,
  citationUrl: string,
): string {
  const stationCount = args.stations ?? CASE_FILE_MIN_STATIONS;
  return `{
  "id": "${drillId}",
  "title": "Clear Evaluation-scale Case File title",
  "format": "Case_File",
  "domain": "${domain}",
  "domainLabel": "${domainLabel}",
  "difficulty": "${args.difficulty}",
  "pillars": ${pillarExample},
  "version": 1,
  "status": "draft",${sourceCardLine}
  "brief": {
    "title": "Fictional enterprise case name",
    "synopsis": "Multi-paragraph Evaluation brief with intentional ambiguity; leave pivotal facts for probes (max ~220 words)"
  },
  "stations": [
    {
      "id": "st1",
      "domain": "${domain}",
      "boardDomain": "Integration",
      "prompt": "Station question after the brief...",
      "probeBudget": 3,
      "probes": [
        {
          "id": "st1_p1",
          "label": "Pivotal clarifying question?",
          "tier": "pivotal",
          "answer": "Scenario fact that narrows the decision (must NOT appear in brief.synopsis)"
        },
        {
          "id": "st1_p2",
          "label": "Second pivotal clarifying question?",
          "tier": "pivotal",
          "answer": "Another scenario fact"
        },
        {
          "id": "st1_p3",
          "label": "Useful clarifying question?",
          "tier": "useful",
          "answer": "Helpful but not required fact"
        },
        {
          "id": "st1_p4",
          "label": "Distractor clarifying question?",
          "tier": "distractor",
          "answer": "Irrelevant fact",
          "distractorAntipattern": "Short Antipattern Name"
        }
      ],
      "options": [
        {
          "id": "st1_a",
          "label": "Recommendation A...",
          "isCorrect": true,
          "rationale": "Principle from cited chunk + constraint unlocked by probes",
          "citationUrl": "${citationUrl}"
        },
        {
          "id": "st1_b",
          "label": "Recommendation B...",
          "isCorrect": false,
          "distractorAntipattern": "Short Antipattern Name",
          "rationale": "Why it fails under the unlocked constraints"
        }
      ]
    }
  ]
}
Write exactly ${stationCount} stations. boardDomain values come from System_Architecture | Security | Data | Solution_Architecture | Integration | Development_Lifecycle | Communication — prefer distinct values when stations span different board areas; reuse is allowed when several stations sit in one board domain. Each station needs ~7 probes (exactly 2 pivotal), probeBudget 3, and 3 recommendation options.`;
}

function buildPrompt(
  chunks: ChromaChunk[],
  args: PromptArgs,
  drillId: string,
  card?: FrictionCard,
): string {
  const frictionSection = buildFrictionSection(card);
  const contextText = chunks
    .map(
      (c, i) =>
        `### Source Chunk ${i + 1}
- Title: ${c.metadata.doc_title} > ${c.metadata.section_title}
- Pillar: ${c.metadata.pillar} | Category: ${c.metadata.category}
- Citation URL: ${c.metadata.url}
- Excerpt:
${c.content}
`,
    )
    .join('\n');

  const domain =
    args.domain || inferDomain(chunks[0]?.metadata?.category, chunks[0]?.metadata?.pillar);
  const domainLabel = ARCHITECTURAL_DOMAIN_LABELS[domain as ArchitecturalDomain] ?? domain;
  const pillars = resolvePillars(chunks, card);
  const pillarSpec = pillars.length
    ? JSON.stringify(pillars)
    : `choose 1-3 from ${WELL_ARCHITECTED_PILLARS.join(' | ')}`;
  const pillarExample = JSON.stringify(pillars.length ? pillars : ['Reliability']);
  const sourceCardLine = card ? `\n  "sourceCardIds": ["${card.card_id}"],` : '';
  const citationUrl = chunks[0]?.metadata?.url || 'https://architect.salesforce.com';

  const schema =
    args.format === 'Troubleshooting'
      ? buildTroubleshootingSchema(
          drillId,
          args,
          domain,
          domainLabel,
          pillarExample,
          sourceCardLine,
          citationUrl,
        )
      : buildCaseFileSchema(
          drillId,
          args,
          domain,
          domainLabel,
          pillarExample,
          sourceCardLine,
          citationUrl,
        );

  const formatNotes =
    args.format === 'Case_File'
      ? `- Stations: ${args.stations ?? 3} under one Brief (minimum 3)
- Probe Budget: 3 picks from ~7 clarifying questions per station
- Dual scoring: probe quality + confidence-gated recommendation
- Grounding: only final correct options cite chunks; probe answers are scenario fiction`
      : `- One Incident: architecture synopsis + required diagram + issue
- Probe Budget: 3 picks from ~7 clarifying questions (≥2 pivotal)
- Free-text cause graded by CLEF choice over gold + exactly 3 hidden distractors + other catchall (never MCQ)
- Fix: 3-choice remediation (1 gold cited + 2 antipattern distractors), Brier scored
- Scoring: Probe discovery + Cause Brier + Fix Brier
- Grounding: probe answers are scenario fiction; goldCause and gold fix cite Well-Architected Grounding`;

  return `You are a Principal Salesforce Certified Technical Architect (CTA) and author of ArcGym.
Generate a high-stakes, realistic architectural judgment drill formatted as valid JSON strictly adhering to the ArcGym schema.

### Core Authoring Principles:
1. Dilemma Under Constraint: Do NOT write simple trivia or recall questions. Pose a realistic enterprise scenario with competing priorities (e.g. scale vs cost, real-time vs governor limits, speed vs trust).
2. Explicit Antipatterns: Every distractor option MUST name a real-world architectural antipattern in 'distractorAntipattern' as a short name of 2–5 words (e.g. "ETL Data Hoarding", "Synchronous Callout Coupling"). Its 'rationale' is 1–2 sentences: why it fails under this step's constraint. Use 3 options per decision.
3. Grounding: Every correct option is grounded: its rationale restates guidance from one chunk below, and its citationUrl is that chunk's Citation URL, copied exactly. Write only decisions the chunks govern; fewer than requested is right when they govern fewer. If they govern none, output only {"error": "<what official guidance is missing>"}.
4. Option Balance: Place the correct option in varied positions across decisions, and keep all options comparable in length and specificity, so judgment rather than pattern finds the answer.
5. Language & Tone: Professional, authoritative, CTA-level precision. Sentence-case typography. No casual jargon or LLM filler phrases.

${WORDING_RULES}
### Target Drill Specifications:
- Drill ID: "${drillId}"
- Topic: "${args.topic}"
- Domain: "${domain}"
- Domain Label: "${domainLabel}"
- Pillars: ${pillarSpec}
- Format: "${args.format}"
- Difficulty: "${args.difficulty}"
${formatNotes}
${frictionSection}
### Grounding Documentation Chunks from architect.salesforce.com:
${contextText}

### Required JSON Output Format:
Output ONLY valid, parseable JSON conforming to this TypeScript schema with no markdown code blocks outside:
${schema}
`;
}

function runPrompt(argv: string[]) {
  const args = parsePromptArgs(argv);
  const card = args.fromCard ? loadFrictionCard(args.fromCard) : undefined;
  if (card) {
    args.topic ||= card.title;
    args.domain ||= card.domain;
  }
  if (!args.topic) {
    fail('Pass --topic or --from-card.');
  }
  const drillId = args.id || getNextDrillId();

  console.error(
    `[Generator] ${drillId} | ${args.format} | ${args.difficulty} | topic: ${args.topic}`,
  );
  if (card)
    console.error(
      `[Generator] Card ${card.card_id} (${card.naive_approaches.length} naive approaches)`,
    );

  const searchQueries =
    args.queries.length > 0 ? args.queries : [card?.official_doc_query ?? args.topic];
  const chunks = queryChromaMerged(searchQueries, args.topK, args.pillar);
  if (chunks.length === 0) {
    fail('No official chunks retrieved. Retry with --query "<better doc search>".');
  }
  for (const c of chunks) {
    console.error(
      `  ${c.cosine_similarity.toFixed(2)}  ${c.metadata.doc_title} > ${c.metadata.section_title}`,
    );
  }

  process.stdout.write(buildPrompt(chunks, args, drillId, card));
}

function parseDrillResponse(raw: string): Record<string, unknown> {
  const fenced = raw.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  try {
    return JSON.parse(fenced ? fenced[1] : raw);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    fail(`Response is not valid JSON: ${msg}`);
  }
}

function runIngest(argv: string[]) {
  const file = argv.find((a) => !a.startsWith('--'));
  const force = argv.includes('--force');
  if (!file) {
    fail('Usage: generate-drill.ts ingest <drill.json> [--force]');
  }

  const drill = parseDrillResponse(fs.readFileSync(file, 'utf-8'));
  if (drill.error) {
    fail(
      `The drill author declined: ${drill.error}\nRetry the prompt with --query "<better doc search>", or fix the card's doc query in \`friction_cards.py review\` and re-export.`,
    );
  }
  if (typeof drill.id !== 'string' || !/^AGD-\d{5}$/.test(drill.id)) {
    fail(`id must look like AGD-00000 (got ${drill.id})`);
  }
  if (drill.sourceCardIds !== undefined) {
    const known = new Set(loadFrictionCards().map((c) => c.card_id));
    const unknown = (drill.sourceCardIds as string[]).filter((id) => !known.has(id));
    if (unknown.length) {
      fail(`sourceCardIds not in the approved catalog: ${unknown.join(', ')}`);
    }
  }

  const outPath = path.join(DRILLS_DIR, `${drill.id}.json`);
  const previous = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : null;
  if (previous !== null && !force) {
    fail(
      `${outPath} already exists. Pass --force to overwrite, or regenerate the prompt for a fresh id.`,
    );
  }

  // Soft ingest: keep the attempted draft on failure and write a findings sidecar for repair.
  drill.status = 'draft';
  fs.writeFileSync(outPath, `${JSON.stringify(drill, null, 2)}\n`, 'utf-8');

  function loadGroundingChunkExports(): GroundingChunkExport[][] {
    return GROUNDING_CHUNK_EXPORTS.map((rel) => path.join(ROOT_DIR, rel))
      .filter((p) => fs.existsSync(p))
      .map((p) => JSON.parse(fs.readFileSync(p, 'utf-8')) as GroundingChunkExport[]);
  }

  const citationManifestUrls = citationManifestUrlsFromExports(loadGroundingChunkExports());
  const publicRoot = path.join(ROOT_DIR, 'apps/arcgym-web/public');
  const assetExists = (url: string) => {
    if (!url.startsWith('/')) return false;
    return fs.existsSync(path.join(publicRoot, url.replace(/^\/+/, '')));
  };

  const validationRes = validateDrill(drill, {
    citationManifest: citationManifestUrls,
    assetExists,
  });
  const validationFindings = validationRes.ok ? [] : validationRes.findings;

  let wordingFindings: ReturnType<typeof lintDrillWording> = [];
  try {
    wordingFindings = lintDrillWording(drill as unknown as DrillDefinitionDTO);
  } catch {
    // If the draft is too malformed for wording lint, leave empty
  }

  if (validationFindings.length > 0 || wordingFindings.length > 0) {
    const reasons: Array<'validation' | 'wording'> = [];
    if (validationFindings.length > 0) reasons.push('validation');
    if (wordingFindings.length > 0) reasons.push('wording');

    for (const f of validationFindings) {
      console.error(`  [VALIDATION] ${f.ruleId} at ${f.where}: ${f.message}`);
    }
    for (const f of wordingFindings) {
      console.error(`  [WORDING] ${f.ruleId} at ${f.where}: ${f.message}`);
    }

    writeIngestFindings(outPath, {
      drillId: drill.id as string,
      failedAt: new Date().toISOString(),
      reasons,
      ...(validationFindings.length > 0 ? { validationFindings } : {}),
      ...(wordingFindings.length > 0 ? { wordingFindings } : {}),
    });

    const failureParts: string[] = [];
    if (validationFindings.length > 0) {
      failureParts.push(`${validationFindings.length} validation finding(s)`);
    }
    if (wordingFindings.length > 0) {
      failureParts.push(`${wordingFindings.length} wording finding(s)`);
    }
    fail(
      `${failureParts.join(' and ')}; draft kept at ${outPath}. See ${findingsSidecarPath(outPath)}.`,
    );
  }

  clearIngestFindings(outPath);
  console.error(`\n✓ Saved draft drill: ${outPath}`);
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'prompt') {
  runPrompt(rest);
} else if (command === 'ingest') {
  runIngest(rest);
} else {
  fail(
    'Usage: generate-drill.ts prompt [--from-card FC-… | --topic "…"] [options] | ingest <drill.json> [--force]',
  );
}
