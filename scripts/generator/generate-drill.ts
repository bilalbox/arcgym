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
import { type DrillDefinitionDTO, lintDrillWording } from '../../packages/drill-core/src/index.js';

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const CHROMA_SEARCH_SCRIPT = path.join(ROOT_DIR, 'scripts/crawler/search_chroma.py');
const FRICTION_CARDS_PATH = path.join(ROOT_DIR, 'data/friction_cards.json');
const WELL_ARCHITECTED_PILLARS = [
  'Trust',
  'Reliability',
  'Operational_Excellence',
  'Cost_Optimization',
  'Fairness',
];
const SUPPORTED_FORMATS = ['Rapid_Fire', 'Case_File'] as const;
const DIFFICULTIES = ['Associate_Domain_Architect', 'Lead_CTA'] as const;

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
  format: (typeof SUPPORTED_FORMATS)[number];
  difficulty: (typeof DIFFICULTIES)[number];
  steps: number;
  /** Case_File: exactly 3 (Case File). Defaults from --steps when unset. */
  stations?: number;
  id?: string;
  topK: number;
  fromCard?: string;
  /** Overrides the ChromaDB search phrase (defaults to the card's official_doc_query, then the topic). */
  query?: string;
}

function fail(message: string): never {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

function parsePromptArgs(args: string[]): PromptArgs {
  const result: PromptArgs = {
    topic: '',
    format: 'Rapid_Fire',
    difficulty: 'Lead_CTA',
    steps: 3,
    topK: 5,
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
      if (!SUPPORTED_FORMATS.includes(value as (typeof SUPPORTED_FORMATS)[number])) {
        fail(`--format must be one of ${SUPPORTED_FORMATS.join('|')}`);
      }
      result.format = args[++i] as PromptArgs['format'];
    } else if (arg === '--difficulty' && value) {
      if (!DIFFICULTIES.includes(value as (typeof DIFFICULTIES)[number])) {
        fail(`--difficulty must be one of ${DIFFICULTIES.join('|')}`);
      }
      result.difficulty = args[++i] as PromptArgs['difficulty'];
    } else if (arg === '--steps' && value) {
      result.steps = parseInt(args[++i], 10);
    } else if (arg === '--stations' && value) {
      const n = parseInt(args[++i], 10);
      if (n !== 3) {
        fail('--stations must be 3');
      }
      result.stations = n;
    } else if (arg === '--id' && value) {
      result.id = args[++i];
    } else if (arg === '--top-k' && value) {
      result.topK = parseInt(args[++i], 10);
    } else if (arg === '--from-card' && value) {
      result.fromCard = args[++i];
    } else if (arg === '--query' && value) {
      result.query = args[++i];
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

/** Generated Rapid_Fire drills use AGD-00401..00499. */
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
    const fallbackPath = path.join(ROOT_DIR, 'data/architect_chunks.json');
    if (!fs.existsSync(fallbackPath)) return [];
    const allChunks: { document: string; metadata: ChromaChunk['metadata'] }[] = JSON.parse(
      fs.readFileSync(fallbackPath, 'utf-8'),
    );
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

const DOMAIN_LABELS: Record<string, string> = {
  Ai_And_Automation: 'Agentic AI & Automation',
  Data_Architecture: 'Data Architecture & Virtualization',
  Integration_Apis: 'Integration APIs & Events',
  Security_And_Access: 'Security & Access',
  Devops_Lifecycle: 'DevOps & Governance',
  Infrastructure: 'Infrastructure',
  Platform_Core: 'Platform Core & Scalability',
};

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
      chunks.map((c) => c.metadata.pillar).filter((p) => WELL_ARCHITECTED_PILLARS.includes(p)),
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
- Correct-option rationale (Rapid Fire rationale / Case File recommendation rationale): 1–3 sentences covering the principle from the cited chunk and the constraint in the question that decides it. Do not repeat the option's wording.
- Feedback text (rationale): no verdict prefixes ("Correct!", "Antipattern:", "Risky!"); the UI already shows the verdict.
- Case File only: brief.synopsis may be longer (Evaluation-scale, max ~220 words) but must NOT contain pivotal probe answer text. Probe labels are clarifying questions ending with ?. Probe answers are scenario facts only—never architecture advice. Exactly 2 pivotal probes per station; distractor probes need distractorAntipattern.
`;

function buildRapidFireSchema(
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
  "title": "Clear, concise CTA-level drill title",
  "format": "Rapid_Fire",
  "domain": "${domain}",
  "domainLabel": "${domainLabel}",
  "difficulty": "${args.difficulty}",
  "pillars": ${pillarExample},
  "version": 1,
  "status": "draft",${sourceCardLine}
  "steps": [
    {
      "id": "s1",
      "prompt": "Situation, then the constraint(s) the answer depends on, then one question...",
      "options": [
        {
          "id": "s1_a",
          "label": "Option A description...",
          "isCorrect": false,
          "distractorAntipattern": "Short Antipattern Name",
          "rationale": "1–2 sentences: why it fails under this step's constraint",
          "citationUrl": "${citationUrl}"
        },
        {
          "id": "s1_b",
          "label": "Option B description (optimal)...",
          "isCorrect": true,
          "rationale": "The principle from the cited chunk and the constraint in the prompt that decides it",
          "citationUrl": "${citationUrl}"
        }
      ]
    }
  ]
}`;
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
Write exactly 3 stations with distinct boardDomain values from System_Architecture | Security | Data | Solution_Architecture | Integration | Development_Lifecycle | Communication. Each station needs ~7 probes (exactly 2 pivotal), probeBudget 3, and 3 recommendation options.`;
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
  const domainLabel = DOMAIN_LABELS[domain] ?? domain;
  const pillars = resolvePillars(chunks, card);
  const pillarSpec = pillars.length
    ? JSON.stringify(pillars)
    : `choose 1-3 from ${WELL_ARCHITECTED_PILLARS.join(' | ')}`;
  const pillarExample = JSON.stringify(pillars.length ? pillars : ['Reliability']);
  const sourceCardLine = card ? `\n  "sourceCardIds": ["${card.card_id}"],` : '';
  const citationUrl = chunks[0]?.metadata?.url || 'https://architect.salesforce.com';

  const schema =
    args.format === 'Case_File'
      ? buildCaseFileSchema(
          drillId,
          args,
          domain,
          domainLabel,
          pillarExample,
          sourceCardLine,
          citationUrl,
        )
      : buildRapidFireSchema(
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
      ? `- Stations: always 3 under one Brief
- Probe Budget: 3 picks from ~7 clarifying questions per station
- Dual scoring: probe quality + confidence-gated recommendation
- Grounding: only final correct options cite chunks; probe answers are scenario fiction`
      : `- Number of Steps: up to ${args.steps}`;

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

  const chunks = queryChroma(
    args.query ?? card?.official_doc_query ?? args.topic,
    args.topK,
    args.pillar,
  );
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

  drill.status = 'draft';
  fs.writeFileSync(outPath, `${JSON.stringify(drill, null, 2)}\n`, 'utf-8');
  const rollBack = (reason: string): never => {
    if (previous === null) {
      fs.unlinkSync(outPath);
    } else {
      fs.writeFileSync(outPath, previous, 'utf-8');
    }
    fail(`${reason}; ${outPath} was rolled back. Fix ${file} and rerun ingest.`);
  };

  try {
    execFileSync('npx', ['tsx', 'scripts/build-drills.ts'], { stdio: 'inherit', cwd: ROOT_DIR });
  } catch {
    rollBack('Validation failed');
  }

  const wordingFindings = lintDrillWording(drill as unknown as DrillDefinitionDTO);
  if (wordingFindings.length > 0) {
    for (const f of wordingFindings) {
      console.error(`  [WORDING] ${f.ruleId} at ${f.where}: ${f.message}`);
    }
    rollBack(`${wordingFindings.length} wording findings (new drills must have none)`);
  }
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
