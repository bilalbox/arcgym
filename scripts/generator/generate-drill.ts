#!/usr/bin/env node
/**
 * ArcGym RAG Drill Generator CLI
 * 
 * Retrieves official Salesforce Well-Architected chunks from ChromaDB and
 * generates high-fidelity judgment drills with distractor antipatterns and citations.
 * 
 * Usage:
 *   npx tsx scripts/generator/generate-drill.ts --topic "Agentforce Guardrails and PII Masking"
 *   npx tsx scripts/generator/generate-drill.ts --topic "Data Cloud Zero Copy Snowflake" --prompt-only
 *   npx tsx scripts/generator/generate-drill.ts --topic "Large Data Volumes Skinny Tables" --auto-build
 *   npx tsx scripts/generator/generate-drill.ts --from-card FC-0D5KX00000jAOVQ0A4 --prompt-only
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync, execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const CHROMA_SEARCH_SCRIPT = path.join(ROOT_DIR, 'scripts/crawler/search_chroma.py');
const FRICTION_CARDS_PATH = path.join(ROOT_DIR, 'data/friction_cards.json');
const WELL_ARCHITECTED_PILLARS = ['Trust', 'Reliability', 'Operational_Excellence', 'Cost_Optimization', 'Fairness'];

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

interface CliArgs {
  topic: string;
  domain?: string;
  pillar?: string;
  format: 'Rapid_Fire' | 'Currency' | 'Scenario' | 'Lesson';
  difficulty: 'Associate_Domain_Architect' | 'Lead_CTA';
  steps: number;
  id?: string;
  topK: number;
  promptOnly: boolean;
  autoBuild: boolean;
  outFile?: string;
  fromCard?: string;
  /** Overrides the ChromaDB search phrase (defaults to the card's official_doc_query, then the topic). */
  query?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    topic: '',
    format: 'Rapid_Fire',
    difficulty: 'Lead_CTA',
    steps: 3,
    topK: 5,
    promptOnly: false,
    autoBuild: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--topic' && args[i + 1]) {
      result.topic = args[++i];
    } else if (arg === '--domain' && args[i + 1]) {
      result.domain = args[++i];
    } else if (arg === '--pillar' && args[i + 1]) {
      result.pillar = args[++i];
    } else if (arg === '--format' && args[i + 1]) {
      result.format = args[++i] as any;
    } else if (arg === '--difficulty' && args[i + 1]) {
      result.difficulty = args[++i] as any;
    } else if (arg === '--steps' && args[i + 1]) {
      result.steps = parseInt(args[++i], 10);
    } else if (arg === '--id' && args[i + 1]) {
      result.id = args[++i];
    } else if (arg === '--top-k' && args[i + 1]) {
      result.topK = parseInt(args[++i], 10);
    } else if (arg === '--prompt-only') {
      result.promptOnly = true;
    } else if (arg === '--auto-build') {
      result.autoBuild = true;
    } else if (arg === '--out' && args[i + 1]) {
      result.outFile = args[++i];
    } else if (arg === '--from-card' && args[i + 1]) {
      result.fromCard = args[++i];
    } else if (arg === '--query' && args[i + 1]) {
      result.query = args[++i];
    }
  }

  return result;
}

function loadFrictionCard(cardId: string): FrictionCard {
  if (!fs.existsSync(FRICTION_CARDS_PATH)) {
    throw new Error(`${FRICTION_CARDS_PATH} not found. Run \`python scripts/crawler/friction_cards.py export\` first.`);
  }
  const catalog = JSON.parse(fs.readFileSync(FRICTION_CARDS_PATH, 'utf-8'));
  const card = (catalog.cards as FrictionCard[]).find((c) => c.card_id === cardId);
  if (!card) {
    throw new Error(`Friction Card ${cardId} is not in the approved catalog. Approve it with friction_cards.py review, then export.`);
  }
  return card;
}

function getNextDrillId(format: string = 'Rapid_Fire'): string {
  if (!fs.existsSync(DRILLS_DIR)) {
    if (format === 'Lesson') return 'AGD-00701';
    if (format === 'Currency') return 'AGD-00501';
    if (format === 'Scenario') return 'AGD-00601';
    return 'AGD-00401';
  }
  const files = fs.readdirSync(DRILLS_DIR).filter((f) => f.endsWith('.json'));

  if (format === 'Lesson') {
    let maxNum = 700;
    for (const f of files) {
      const match = f.match(/AGD-00(7\d\d)\.json/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `AGD-${String(maxNum + 1).padStart(5, '0')}`;
  }

  if (format === 'Currency') {
    let maxNum = 500;
    for (const f of files) {
      const match = f.match(/AGD-00(5\d\d)\.json/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `AGD-${String(maxNum + 1).padStart(5, '0')}`;
  }

  if (format === 'Scenario') {
    let maxNum = 600;
    for (const f of files) {
      const match = f.match(/AGD-00(6\d\d)\.json/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `AGD-${String(maxNum + 1).padStart(5, '0')}`;
  }

  let maxNum = 0;
  for (const f of files) {
    const match = f.match(/AGD-(\d+)\.json/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num < 500 && num > maxNum) maxNum = num;
    }
  }
  const nextNum = Math.max(401, maxNum + 1);
  return `AGD-${String(nextNum).padStart(5, '0')}`;
}

function queryChroma(query: string, topK: number, pillar?: string): ChromaChunk[] {
  console.log(`[RAG] Searching ChromaDB for: "${query}" (top ${topK})...`);
  try {
    const cmdArgs = ['run', '--with', 'chromadb', 'python', CHROMA_SEARCH_SCRIPT, query, '--top-k', String(topK), '--json'];
    if (pillar) {
      cmdArgs.push('--pillar', pillar);
    }
    const output = execFileSync('uv', cmdArgs, { cwd: ROOT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const parsed = JSON.parse(output.trim());
    return parsed as ChromaChunk[];
  } catch (err: any) {
    console.warn(`[WARN] Chroma search failed (${err.message}). Falling back to flat JSON data if available.`);
    const fallbackPath = path.join(ROOT_DIR, 'data/architect_chunks.json');
    if (fs.existsSync(fallbackPath)) {
      const raw = fs.readFileSync(fallbackPath, 'utf-8');
      const allChunks = JSON.parse(raw);
      const queryLower = query.toLowerCase();
      const matched = allChunks
        .filter((c: any) => c.text.toLowerCase().includes(queryLower) || c.section_title.toLowerCase().includes(queryLower))
        .slice(0, topK)
        .map((c: any) => ({
          content: c.text,
          metadata: {
            doc_title: c.doc_title,
            section_title: c.section_title,
            breadcrumb: c.breadcrumb,
            pillar: c.pillar,
            category: c.category,
            url: c.url,
            crawled_at: c.crawled_at,
            char_count: c.text.length,
          },
          cosine_similarity: 0.8,
        }));
      return matched;
    }
    return [];
  }
}

function resolveCanonicalDomain(category?: string, pillar?: string): { domain: string; domainLabel: string } {
  if (pillar === 'Agentforce' || category?.includes('agent')) {
    return { domain: 'Ai_And_Automation', domainLabel: 'Agentic AI & Automation' };
  }
  if (pillar === 'Data_360' || category?.includes('data')) {
    return { domain: 'Data_Architecture', domainLabel: 'Data Architecture & Virtualization' };
  }
  if (category === 'decision-guides' || category?.includes('integration')) {
    return { domain: 'Integration_Apis', domainLabel: 'Integration APIs & Events' };
  }
  if (pillar === 'Trust' || category?.includes('security')) {
    return { domain: 'Security_And_Access', domainLabel: 'Security & Access' };
  }
  if (category === 'devops' || category?.includes('devops')) {
    return { domain: 'Devops_Lifecycle', domainLabel: 'DevOps & Governance' };
  }
  return { domain: 'Platform_Core', domainLabel: 'Platform Core & Scalability' };
}

/** Chunk `pillar` metadata mixes product areas (Core_Platform, Data_360) with Well-Architected pillars. */
function resolvePillars(chunks: ChromaChunk[], card?: FrictionCard): string[] {
  if (card?.pillars.length) return card.pillars;
  return Array.from(new Set(chunks.map((c) => c.metadata.pillar).filter((p) => WELL_ARCHITECTED_PILLARS.includes(p))));
}

function buildFrictionSection(card?: FrictionCard): string {
  if (!card) return '';
  const approaches = card.naive_approaches.length
    ? card.naive_approaches.map((a, i) => `${i + 1}. ${a.approach}\n   Why it fails: ${a.why_it_fails}`).join('\n')
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
2. Every incorrect option MUST be modeled on one of the naive approaches above, not a generic strawman. Explain why it fails in the antipattern field.
3. The community resolution is NOT grounding. The correct option must be supported and cited by the official documentation chunks below. If the chunks do not support any correct answer for this problem, output only {"error": "<what official guidance is missing>"} instead of a drill.
`;
}

function buildPrompt(chunks: ChromaChunk[], args: CliArgs, drillId: string, card?: FrictionCard): string {
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
`
    )
    .join('\n');

  const resolved = resolveCanonicalDomain(chunks[0]?.metadata?.category, chunks[0]?.metadata?.pillar);
  const domain = args.domain || resolved.domain;
  const domainLabel = resolved.domainLabel;
  const pillars = resolvePillars(chunks, card);
  const pillarSpec = pillars.length
    ? JSON.stringify(pillars)
    : `choose 1-3 from ${WELL_ARCHITECTED_PILLARS.join(' | ')}`;
  const pillarExample = JSON.stringify(pillars.length ? pillars : ['Reliability']);

  if (args.format === 'Lesson') {
    return `You are a Principal Salesforce Certified Technical Architect (CTA) and author of ArcGym.
Generate a high-stakes, realistic 4-stage architectural Lesson drill formatted as valid JSON strictly adhering to the ArcGym Lesson schema.

### Core Lesson Authoring Principles:
1. 4-Stage Progressive Refactor: A Lesson drill simulates an enterprise refactor walkthrough across exactly 4 chronological stages:
   - Stage 1: Forensic Diagnosis (diagnose real-world architectural bottleneck, concurrency collision, or technical debt)
   - Stage 2: Target Architecture Pattern (select optimal Well-Architected design pattern and justify trade-offs)
   - Stage 3: Migration & Cutover Strategy (zero-downtime cutover, backward compatibility, feature toggles, or canary rollout)
   - Stage 4: Telemetry & Observability (transaction monitoring, health thresholds, drift alerts, or Event Monitoring)
2. Authoritative Coaching Feedback: Every option MUST include detailed 'coachingFeedback' explaining precisely why it is correct (grounded in official Salesforce architecture) or why it is an architectural antipattern.
3. Grounding & Citations: Ground decisions directly in the provided official documentation chunks from architect.salesforce.com.
4. Language & Tone: Professional, authoritative CTA-level precision. Sentence-case typography. No filler phrases.

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
  "status": "draft",
  "stages": [
    {
      "stageNumber": 1,
      "stageName": "Stage 1: Forensic Diagnosis",
      "scenario": "Diagnostic scenario describing the enterprise bottleneck, errors, and system symptoms...",
      "options": [
        {
          "id": "st1_a",
          "text": "Antipattern explanation or false assumption...",
          "isCorrect": false,
          "coachingFeedback": "Why this explanation is an antipattern or misses the platform root cause..."
        },
        {
          "id": "st1_b",
          "text": "Precise architectural bottleneck identification...",
          "isCorrect": true,
          "coachingFeedback": "Correct! Authoritative Well-Architected analysis explaining why this occurs."
        }
      ]
    },
    {
      "stageNumber": 2,
      "stageName": "Stage 2: Target Architecture Pattern",
      "scenario": "Scenario asking for the optimal Well-Architected pattern to replace the flawed design...",
      "options": [
        {
          "id": "st2_a",
          "text": "Target pattern description...",
          "isCorrect": true,
          "coachingFeedback": "Correct! Why this pattern satisfies Well-Architected principles."
        },
        {
          "id": "st2_b",
          "text": "Suboptimal quick-fix pattern...",
          "isCorrect": false,
          "coachingFeedback": "Antipattern: Why this quick fix introduces downstream technical debt."
        }
      ]
    },
    {
      "stageNumber": 3,
      "stageName": "Stage 3: Migration & Cutover Strategy",
      "scenario": "Scenario asking how to cut over safely in a live production environment without downtime...",
      "options": [
        {
          "id": "st3_a",
          "text": "Safe cutover strategy using feature toggles or canary deployment...",
          "isCorrect": true,
          "coachingFeedback": "Correct! Well-Architected Operational Excellence mandates zero-downtime rollback controls."
        },
        {
          "id": "st3_b",
          "text": "High-risk direct cutover...",
          "isCorrect": false,
          "coachingFeedback": "Antipattern: In-place cutovers without circuit breakers cause live user data loss."
        }
      ]
    },
    {
      "stageNumber": 4,
      "stageName": "Stage 4: Telemetry & Observability",
      "scenario": "Scenario asking how to monitor health and proactively alert on threshold breaches...",
      "options": [
        {
          "id": "st4_a",
          "text": "Proactive event-driven telemetry and monitoring approach...",
          "isCorrect": true,
          "coachingFeedback": "Correct! Real-time observability detects degradation before end users are impacted."
        },
        {
          "id": "st4_b",
          "text": "Reactive failure logging...",
          "isCorrect": false,
          "coachingFeedback": "Antipattern: Reactive error digests fail to prevent systemic outages."
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
2. Explicit Antipatterns: Every distractor option MUST have a named, real-world architectural antipattern in 'distractorAntipattern' (e.g. "Direct trigger callout blocks threads and risks uncommitted work exception", "CDC does not allow business payload enrichment prior to external egress").
3. Grounding & Citations: The correct choice MUST cite the official Salesforce Well-Architected documentation URL provided in the context chunks below.
4. Language & Tone: Professional, authoritative, CTA-level precision. Sentence-case typography. No casual jargon or LLM filler phrases.

### Target Drill Specifications:
- Drill ID: "${drillId}"
- Topic: "${args.topic}"
- Domain: "${domain}"
- Domain Label: "${domainLabel}"
- Pillars: ${pillarSpec}
- Format: "${args.format}"
- Difficulty: "${args.difficulty}"
- Number of Steps: ${args.steps}
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
  "status": "draft",
  "steps": [
    {
      "id": "s1",
      "prompt": "Scenario prompt explaining constraints and trade-offs...",
      "options": [
        {
          "id": "s1_a",
          "label": "Option A description...",
          "isCorrect": false,
          "distractorAntipattern": "Concise architectural explanation of why this fails or violates platform principles",
          "rationale": "Why this option is suboptimal",
          "citationUrl": "${chunks[0]?.metadata?.url || 'https://architect.salesforce.com'}"
        },
        {
          "id": "s1_b",
          "label": "Option B description (optimal)...",
          "isCorrect": true,
          "rationale": "Comprehensive explanation of why this complies with Well-Architected standards",
          "citationUrl": "${chunks[0]?.metadata?.url || 'https://architect.salesforce.com'}"
        }
      ]
    }
  ]
}
`;
}

async function callLlmIfAvailable(prompt: string): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    try {
      console.log('[LLM] Calling Google Gemini API...');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e: any) {
      console.warn(`[WARN] Gemini call failed: ${e.message}`);
    }
  }

  if (openaiKey) {
    try {
      console.log('[LLM] Calling OpenAI API...');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content;
      }
    } catch (e: any) {
      console.warn(`[WARN] OpenAI call failed: ${e.message}`);
    }
  }

  return null;
}

function generateScaffoldDrill(chunks: ChromaChunk[], args: CliArgs, drillId: string, card?: FrictionCard): any {
  const topChunk = chunks[0] || {
    content: 'Salesforce Well-Architected guidance',
    metadata: {
      doc_title: 'Well-Architected Framework',
      section_title: 'Core Principles',
      pillar: 'Reliability',
      url: 'https://architect.salesforce.com',
      breadcrumb: 'Well-Architected > Reliability',
    },
  };

  const resolved = resolveCanonicalDomain(topChunk.metadata?.category, topChunk.metadata?.pillar);
  const domain = args.domain || resolved.domain;
  const domainLabel = resolved.domainLabel;
  const resolvedPillars = resolvePillars(chunks, card);
  const scaffoldPillars = resolvedPillars.length ? resolvedPillars : ['Reliability'];

  if (args.format === 'Lesson') {
    const stageDefs = [
      {
        stageNumber: 1,
        stageName: 'Stage 1: Forensic Diagnosis',
        scenario: `In an enterprise production org implementing ${args.topic}, users experience latency spikes and transaction failures under peak concurrency. Based on official platform guidance, what is the root architectural bottleneck?`,
        correctText: `The current architecture violates platform boundaries: ${topChunk.metadata.section_title || 'uncontrolled synchronous processing'} introduces unmonitored thread consumption and lock contention.`,
        correctFeedback: `Correct! Grounded in ${topChunk.metadata.doc_title} (${topChunk.metadata.url}), uncoordinated synchronous processing risks governor exhaustion and unhandled exceptions.`,
        distractorText: `The issue is an unavoidable platform infrastructure limit that must be resolved by requesting a temporary governor limit increase from Salesforce Support.`,
        distractorFeedback: `Antipattern: Requesting limit increases masks structural design antipatterns and violates Well-Architected Operational Excellence standards.`,
      },
      {
        stageNumber: 2,
        stageName: 'Stage 2: Target Architecture Pattern',
        scenario: `To resolve this bottleneck while adhering to Well-Architected ${topChunk.metadata.pillar || 'Reliability'}, what is the recommended target architecture pattern?`,
        correctText: `Implement a decoupled, stateful pattern aligning with ${topChunk.metadata.section_title || 'standard platform patterns'}: isolate transactions and enforce deterministic governor limits.`,
        correctFeedback: `Correct! ${topChunk.metadata.doc_title} recommends decoupling workload boundaries to guarantee operational isolation and transaction boundaries.`,
        distractorText: `Deploy additional point-and-click automations without governance frameworks or compensating controls.`,
        distractorFeedback: `Antipattern: Layering ungoverned automations multiplies transaction depth, recursion, and unpredictability.`,
      },
      {
        stageNumber: 3,
        stageName: 'Stage 3: Migration & Cutover Strategy',
        scenario: `How should you safely cut over from the legacy architecture to the new pattern in a live enterprise production environment without downtime?`,
        correctText: `Deploy an org-wide feature toggle (Custom Metadata or Custom Permission) allowing phased canary tenant routing and instant zero-downtime rollback.`,
        correctFeedback: `Correct! Well-Architected Operational Excellence mandates feature toggles and canary cutovers for high-risk architectural migrations.`,
        distractorText: `Perform an immediate hard cutover during active business hours and monitor the exception log queue for user failure reports.`,
        distractorFeedback: `Antipattern: Direct cutovers without circuit breakers cause live user data loss and uncoordinated transaction rollback.`,
      },
      {
        stageNumber: 4,
        stageName: 'Stage 4: Telemetry & Observability',
        scenario: `What observability and telemetry mechanism must be implemented to continuously verify platform health and prevent architectural drift?`,
        correctText: `Configure real-time event streams (Event Monitoring) and proactive platform metrics to monitor execution latency, limit headroom, and failure alerts.`,
        correctFeedback: `Correct! Proactive telemetry provides sub-second visibility into execution ceilings and operational health.`,
        distractorText: `Rely on weekly apex batch error digest emails sent to system administrators to identify transaction failures.`,
        distractorFeedback: `Antipattern: Batch digest emails are reactive and fail to provide the granularity needed for high-stakes enterprise systems.`,
      },
    ];

    return {
      id: drillId,
      title: `${args.topic}: 4-stage Well-Architected refactor`,
      format: 'Lesson',
      domain,
      domainLabel,
      difficulty: args.difficulty,
      pillars: scaffoldPillars,
      version: 1,
      status: 'draft',
      stages: stageDefs.map((st) => ({
        stageNumber: st.stageNumber,
        stageName: st.stageName,
        scenario: st.scenario,
        options: [
          {
            id: `st${st.stageNumber}_a`,
            text: st.correctText,
            isCorrect: true,
            coachingFeedback: st.correctFeedback,
          },
          {
            id: `st${st.stageNumber}_b`,
            text: st.distractorText,
            isCorrect: false,
            coachingFeedback: st.distractorFeedback,
          },
        ],
      })),
    };
  }

  const steps = [];
  for (let i = 0; i < args.steps; i++) {
    const chunk = chunks[i] || topChunk;
    const naive = card?.naive_approaches[i % card.naive_approaches.length];
    steps.push({
      id: `s${i + 1}`,
      prompt: card
        ? `${card.problem} How should you address it?`
        : `In an enterprise implementation concerning ${args.topic}, how should you address: ${chunk.metadata.section_title || chunk.metadata.doc_title}?`,
      options: [
        {
          id: `s${i + 1}_a`,
          label: naive?.approach ?? `Implement using standard point-and-click defaults without compensating controls or asynchronous decoupling.`,
          isCorrect: false,
          distractorAntipattern: naive?.why_it_fails ?? `Violates platform governance by coupling transactions and risking governor limits or unhandled edge cases under concurrency.`,
          rationale: naive?.why_it_fails ?? `Point-and-click automation without architectural guardrails fails under enterprise concurrency and volume.`,
          citationUrl: chunk.metadata.url,
        },
        {
          id: `s${i + 1}_b`,
          label: `Architect a Well-Architected solution complying with ${chunk.metadata.pillar || 'Reliability'}: Decouple asynchronous processing and enforce deterministic governor limits.`,
          isCorrect: true,
          rationale: `According to ${chunk.metadata.doc_title} (${chunk.metadata.breadcrumb || ''}), this pattern ensures transactional integrity and system resilience.`,
          citationUrl: chunk.metadata.url,
        },
      ],
    });
  }

  return {
    id: drillId,
    title: `${args.topic}: ${topChunk.metadata.section_title || 'Architectural Trade-offs'}`,
    format: args.format,
    domain,
    domainLabel,
    difficulty: args.difficulty,
    pillars: scaffoldPillars,
    version: 1,
    status: 'draft',
    steps,
  };
}

async function main() {
  const args = parseArgs();
  const card = args.fromCard ? loadFrictionCard(args.fromCard) : undefined;
  if (card) {
    args.topic ||= card.title;
    args.domain ||= card.domain;
  }
  args.topic ||= 'Salesforce Well-Architected Decisions';
  const drillId = args.id || getNextDrillId(args.format);

  console.log('\n======================================================');
  console.log(`   ArcGym RAG Drill Generator (${drillId})`);
  console.log('======================================================\n');
  console.log(`Topic:      ${args.topic}`);
  console.log(`Format:     ${args.format}`);
  console.log(`Difficulty: ${args.difficulty}`);
  console.log(`Steps:      ${args.steps}`);
  if (card) console.log(`Card:       ${card.card_id} (${card.naive_approaches.length} naive approaches)`);

  // Step 1: Retrieve context from ChromaDB
  const chunks = queryChroma(args.query ?? card?.official_doc_query ?? args.topic, args.topK, args.pillar);
  console.log(`[RAG] Retrieved ${chunks.length} matching architectural chunks from ChromaDB.\n`);

  // Step 2: Build prompt
  const prompt = buildPrompt(chunks, args, drillId, card);

  if (args.promptOnly) {
    console.log('------------------------------------------------------');
    console.log('COMPILED RAG PROMPT FOR EXTERNAL LLM:');
    console.log('------------------------------------------------------\n');
    console.log(prompt);
    return;
  }

  // Step 3: Try LLM generation if API key exists
  let drillJson: any = null;
  const llmResponse = await callLlmIfAvailable(prompt);

  if (llmResponse) {
    try {
      drillJson = JSON.parse(llmResponse);
      console.log('✓ Successfully generated drill via LLM API!');
    } catch (e) {
      console.warn('Could not parse LLM output as JSON directly. Falling back to scaffold.');
    }
  }

  if (drillJson?.error) {
    console.error(`[ABORT] LLM declined: ${drillJson.error}`);
    console.error('Retry with --query "<better doc search>", or fix the card\'s doc query in `friction_cards.py review` and re-export.');
    process.exit(1);
  }

  // Step 4: Fallback to scaffold if no LLM API available
  if (!drillJson) {
    console.log('[INFO] No LLM API key detected or call skipped. Generating grounded CTA drill scaffold from retrieved chunks...');
    drillJson = generateScaffoldDrill(chunks, args, drillId, card);
  }
  if (card) {
    drillJson.sourceCardIds = [card.card_id];
  }

  // Step 5: Save output file
  const outPath = args.outFile || path.join(DRILLS_DIR, `${drillId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(drillJson, null, 2), 'utf-8');
  console.log(`\n✓ Saved new drill to: ${outPath}`);

  // Step 6: Optionally run validation & build
  if (args.autoBuild) {
    console.log('\n[BUILD] Running build-drills.ts to validate and compile...');
    execSync('npx tsx scripts/build-drills.ts', { stdio: 'inherit', cwd: ROOT_DIR });
  } else {
    console.log('\nTip: Run `pnpm build` or `npx tsx scripts/build-drills.ts` to validate and compile this drill into the app.');
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
