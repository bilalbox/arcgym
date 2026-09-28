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
const SUPPORTED_FORMATS = ['Rapid_Fire', 'Lesson'] as const;
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
        fail(
          `--format must be one of ${SUPPORTED_FORMATS.join('|')} (Diagram drills are authored by hand)`,
        );
      }
      result.format = args[++i] as PromptArgs['format'];
    } else if (arg === '--difficulty' && value) {
      if (!DIFFICULTIES.includes(value as (typeof DIFFICULTIES)[number])) {
        fail(`--difficulty must be one of ${DIFFICULTIES.join('|')}`);
      }
      result.difficulty = args[++i] as PromptArgs['difficulty'];
    } else if (arg === '--steps' && value) {
      result.steps = parseInt(args[++i], 10);
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

/** Generated Rapid_Fire drills use AGD-00401..00499; Lessons use AGD-00701..00799. */
function getNextDrillId(format: PromptArgs['format']): string {
  const [floor, ceiling] = format === 'Lesson' ? [700, 800] : [400, 500];
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
- Question text (prompt / scenario): the situation, then the constraint(s) the answer depends on, then exactly one question. Every sentence and number must matter to at least one option's reasoning; keep it to 55 words or fewer. State constraints as facts or numbers (e.g. "the org already uses 80% of its daily API allocation"), never as the negation of an option's approach ("without a polling service" rules out the polling option by keyword). Ask for the decision ("Which pattern should the architect use?"), not "Which is Well-Architected?". Never name the source document. No stakeholder emotion ("Leadership will not accept…").
- Options: every option answers the same question in the same grammatical shape, with one decision per option. The correct option must not be the longest: keep all options within ±25% of each other in word count. Every distractor is something a competent practitioner would plausibly choose. Never use words that announce a wrong answer: entirely, blindly, immediately, always, never, directly to production, raw, without X.
- Facts: every number, limit, product name, and API or exception name must be real. A distractor may misapply a real limit but may not invent one.
- Correct-option rationale (Rapid Fire rationale, Lesson coachingFeedback): 1–3 sentences covering the principle from the cited chunk and the constraint in the question that decides it. Do not repeat the option's wording.
- Feedback text (rationale, coachingFeedback): no verdict prefixes ("Correct!", "Antipattern:", "Risky!"); the UI already shows the verdict.
`;

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

  if (args.format === 'Lesson') {
    return `You are a Principal Salesforce Certified Technical Architect (CTA) and author of ArcGym.
Generate a high-stakes, realistic 4-stage architectural Lesson drill formatted as valid JSON strictly adhering to the ArcGym Lesson schema.

### Core Lesson Authoring Principles:
1. 4-Stage Progressive Refactor: A Lesson drill simulates an enterprise refactor walkthrough across exactly 4 chronological stages:
   - Stage 1: Forensic Diagnosis (diagnose real-world architectural bottleneck, concurrency collision, or technical debt)
   - Stage 2: Target Architecture Pattern (select optimal Well-Architected design pattern and justify trade-offs)
   - Stage 3: Migration & Cutover Strategy (zero-downtime cutover, backward compatibility, feature toggles, or canary rollout)
   - Stage 4: Telemetry & Observability (transaction monitoring, health thresholds, drift alerts, or Event Monitoring)
2. Coaching Feedback: Every option's 'coachingFeedback' explains the mechanism. For the correct option, give the principle and the constraint in the scenario that decides it; for a wrong option, explain why it fails under this stage's constraint. Never open with a verdict ("Correct!", "Antipattern:").
3. Grounding: Every correct option is grounded: its coachingFeedback restates guidance from one of the official chunks below. If the chunks cannot ground all 4 stages, output only {"error": "<what official guidance is missing>"}.
4. Option Balance: At least 3 options per stage, every one a choice a competent practitioner would plausibly make. Place the correct option in varied positions across stages, and keep all options comparable in length and specificity, so judgment rather than pattern finds the answer.
5. Language & Tone: Professional, authoritative CTA-level precision. Sentence-case typography. No filler phrases.

${WORDING_RULES}
### Target Drill Specifications:
- Drill ID: "${drillId}"
- Topic: "${args.topic}"
- Domain: "${domain}" (must be one of: Platform_Core, Data_Architecture, Security_And_Access, Integration_Apis, Ai_And_Automation, Infrastructure, Devops_Lifecycle)
- Domain Label: "${domainLabel}"
- Pillars: ${pillarSpec}
- Format: "Lesson"
- Difficulty: "${args.difficulty}"
${frictionSection}
### Grounding Documentation Chunks from architect.salesforce.com:
${contextText}

### Required JSON Output Format:
Output ONLY valid, parseable JSON conforming to this TypeScript schema with no markdown code blocks outside:
{
  "id": "${drillId}",
  "title": "Concise CTA-level title (e.g. 'Async Pipeline: 4-stage Well-Architected refactor')",
  "format": "Lesson",
  "domain": "${domain}",
  "domainLabel": "${domainLabel}",
  "difficulty": "${args.difficulty}",
  "pillars": ${pillarExample},
  "version": 1,
  "status": "draft",${sourceCardLine}
  "stages": [
    {
      "stageNumber": 1,
      "stageName": "Stage 1: Forensic Diagnosis",
      "scenario": "Symptoms with the numbers that matter, then one question asking for the root cause...",
      "options": [
        {
          "id": "st1_a",
          "text": "A real platform behavior that fits some symptoms but not the deciding one...",
          "isCorrect": false,
          "coachingFeedback": "Which symptom this cause would produce, and which observed symptom rules it out."
        },
        {
          "id": "st1_b",
          "text": "The actual root cause, stated as the platform mechanism...",
          "isCorrect": true,
          "coachingFeedback": "The principle from the cited chunk, tied to the symptom in the scenario that decides it."
        },
        {
          "id": "st1_c",
          "text": "A second cause a competent architect would check first...",
          "isCorrect": false,
          "coachingFeedback": "Why this cause does not explain the symptoms under this stage's constraint."
        }
      ]
    },
    {
      "stageNumber": 2,
      "stageName": "Stage 2: Target Architecture Pattern",
      "scenario": "The constraint the replacement must meet, as a fact or number, then one question asking for the pattern...",
      "options": [
        {
          "id": "st2_a",
          "text": "A proven pattern that solves a neighboring problem...",
          "isCorrect": false,
          "coachingFeedback": "The constraint this pattern misses and the cost it adds as a result."
        },
        {
          "id": "st2_b",
          "text": "The familiar quick fix most teams reach for first...",
          "isCorrect": false,
          "coachingFeedback": "What this fix defers and when that debt comes due under this load."
        },
        {
          "id": "st2_c",
          "text": "The target pattern the cited chunk governs...",
          "isCorrect": true,
          "coachingFeedback": "The principle from the cited chunk and the constraint that rules out the alternatives."
        }
      ]
    },
    {
      "stageNumber": 3,
      "stageName": "Stage 3: Migration & Cutover Strategy",
      "scenario": "The live-operations constraint on cutover, as a fact or number, then one question asking for the sequence...",
      "options": [
        {
          "id": "st3_a",
          "text": "A staged cutover with a validation gate and a rollback path...",
          "isCorrect": true,
          "coachingFeedback": "Why the validation gate and rollback path satisfy the stated live-operations constraint."
        },
        {
          "id": "st3_b",
          "text": "A weekend cutover with a full regression pass beforehand...",
          "isCorrect": false,
          "coachingFeedback": "What a single cutover window cannot catch that a staged rollout would."
        },
        {
          "id": "st3_c",
          "text": "A parallel run that keeps both designs writing indefinitely...",
          "isCorrect": false,
          "coachingFeedback": "The drift and reconciliation cost of running both designs with no exit criterion."
        }
      ]
    },
    {
      "stageNumber": 4,
      "stageName": "Stage 4: Telemetry & Observability",
      "scenario": "The failure mode that must be caught and how fast, then one question asking for the monitoring design...",
      "options": [
        {
          "id": "st4_a",
          "text": "A daily summary report of failed transactions for the support team...",
          "isCorrect": false,
          "coachingFeedback": "How long this failure mode runs undetected before a daily summary surfaces it."
        },
        {
          "id": "st4_b",
          "text": "A threshold alert on the leading metric this failure mode moves...",
          "isCorrect": true,
          "coachingFeedback": "Why this metric moves before users are affected, per the cited chunk."
        },
        {
          "id": "st4_c",
          "text": "Verbose debug logging enabled on every transaction in production...",
          "isCorrect": false,
          "coachingFeedback": "The storage and signal-to-noise cost of logging everything without an alert."
        }
      ]
    }
  ]
}
`;
  }

  return `You are a Principal Salesforce Certified Technical Architect (CTA) and author of ArcGym.
Generate a high-stakes, realistic architectural judgment drill formatted as valid JSON strictly adhering to the ArcGym schema.

### Core Authoring Principles:
1. Dilemma Under Constraint: Do NOT write simple trivia or recall questions. Pose a realistic enterprise scenario with competing priorities (e.g. scale vs cost, real-time vs governor limits, speed vs trust).
2. Explicit Antipatterns: Every distractor option MUST name a real-world architectural antipattern in 'distractorAntipattern' as a short name of 2–5 words (e.g. "ETL Data Hoarding", "Synchronous Callout Coupling"). Its 'rationale' is 1–2 sentences: why it fails under this step's constraint. Use 3 options per step.
3. Grounding: Every correct option is grounded: its rationale restates guidance from one chunk below, and its citationUrl is that chunk's Citation URL, copied exactly. Write only steps the chunks govern; fewer steps than requested is right when they govern fewer decisions. If they govern none, output only {"error": "<what official guidance is missing>"}.
4. Option Balance: Place the correct option in varied positions across steps, and keep all options comparable in length and specificity, so judgment rather than pattern finds the answer.
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
- Number of Steps: up to ${args.steps}
${frictionSection}
### Grounding Documentation Chunks from architect.salesforce.com:
${contextText}

### Required JSON Output Format:
Output ONLY valid, parseable JSON conforming to this TypeScript schema with no markdown code blocks outside:
{
  "id": "${drillId}",
  "title": "Clear, concise CTA-level drill title",
  "format": "${args.format}",
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
          "citationUrl": "${chunks[0]?.metadata?.url || 'https://architect.salesforce.com'}"
        },
        {
          "id": "s1_b",
          "label": "Option B description (optimal)...",
          "isCorrect": true,
          "rationale": "The principle from the cited chunk and the constraint in the prompt that decides it",
          "citationUrl": "${chunks[0]?.metadata?.url || 'https://architect.salesforce.com'}"
        }
      ]
    }
  ]
}
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
  const drillId = args.id || getNextDrillId(args.format);

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
