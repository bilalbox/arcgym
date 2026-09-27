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
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, 'content/drills');
const CHROMA_SEARCH_SCRIPT = path.join(ROOT_DIR, 'scripts/crawler/search_chroma.py');

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

interface CliArgs {
  topic: string;
  domain?: string;
  pillar?: string;
  format: 'Rapid_Fire' | 'Currency' | 'Scenario' | 'Lesson';
  difficulty: 'Associate' | 'Practitioner' | 'Lead_CTA';
  steps: number;
  id?: string;
  topK: number;
  promptOnly: boolean;
  autoBuild: boolean;
  outFile?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    topic: 'Salesforce Well-Architected Decisions',
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
    }
  }

  return result;
}

function getNextDrillId(): string {
  if (!fs.existsSync(DRILLS_DIR)) {
    return 'AGD-00401';
  }
  const files = fs.readdirSync(DRILLS_DIR).filter((f) => f.endsWith('.json'));
  let maxNum = 0;
  for (const f of files) {
    const match = f.match(/AGD-(\d+)\.json/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = Math.max(401, maxNum + 1);
  return `AGD-${String(nextNum).padStart(5, '0')}`;
}

function queryChroma(query: string, topK: number, pillar?: string): ChromaChunk[] {
  console.log(`[RAG] Searching ChromaDB for: "${query}" (top ${topK})...`);
  try {
    let cmd = `uv run --with chromadb python "${CHROMA_SEARCH_SCRIPT}" "${query}" --top-k ${topK} --json`;
    if (pillar) {
      cmd += ` --pillar "${pillar}"`;
    }
    const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
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

function buildPrompt(chunks: ChromaChunk[], args: CliArgs, drillId: string): string {
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
- Domain: "${args.domain || (chunks[0]?.metadata?.category || 'Core Platform Architecture')}"
- Pillars: ${JSON.stringify(Array.from(new Set(chunks.map((c) => c.metadata.pillar).filter(Boolean))))}
- Format: "${args.format}"
- Difficulty: "${args.difficulty}"
- Number of Steps: ${args.steps}

### Grounding Documentation Chunks from architect.salesforce.com:
${contextText}

### Required JSON Output Format:
Output ONLY valid, parseable JSON conforming to this TypeScript schema with no markdown code blocks outside:
{
  "id": "${drillId}",
  "title": "Clear, concise CTA-level drill title",
  "format": "${args.format}",
  "domain": "Platform_Core",
  "domainLabel": "${args.domain || 'Enterprise Architecture'}",
  "difficulty": "${args.difficulty}",
  "pillars": ["Reliability", "Trust"],
  "version": 1,
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

function resolveCanonicalDomain(category?: string, pillar?: string): string {
  if (pillar === 'Agentforce' || category?.includes('agent')) return 'Agentic Enterprise & Governance';
  if (pillar === 'Data_360' || category?.includes('data')) return 'Data Cloud & Zero Copy Architecture';
  if (category === 'decision-guides') return 'Enterprise Integration & Event-Driven';
  if (category === 'well-architected') return 'Core Platform & Scalability';
  return 'Enterprise Architecture & Governance';
}

function generateScaffoldDrill(chunks: ChromaChunk[], args: CliArgs, drillId: string): any {
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

  const domain = args.domain || resolveCanonicalDomain(topChunk.metadata?.category, topChunk.metadata?.pillar);

  const steps = [];
  for (let i = 0; i < args.steps; i++) {
    const chunk = chunks[i] || topChunk;
    steps.push({
      id: `s${i + 1}`,
      prompt: `In an enterprise implementation concerning ${args.topic}, how should you address: ${chunk.metadata.section_title || chunk.metadata.doc_title}?`,
      options: [
        {
          id: `s${i + 1}_a`,
          label: `Implement using standard point-and-click defaults without compensating controls or asynchronous decoupling.`,
          isCorrect: false,
          distractorAntipattern: `Violates platform governance by coupling transactions and risking governor limits or unhandled edge cases under concurrency.`,
          rationale: `Point-and-click automation without architectural guardrails fails under enterprise concurrency and volume.`,
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
    domain: 'Platform_Core',
    domainLabel: domain,
    difficulty: args.difficulty,
    pillars: Array.from(new Set(chunks.map((c) => c.metadata.pillar).filter(Boolean))),
    version: 1,
    steps,
  };
}

async function main() {
  const args = parseArgs();
  const drillId = args.id || getNextDrillId();

  console.log('\n======================================================');
  console.log(`   ArcGym RAG Drill Generator (${drillId})`);
  console.log('======================================================\n');
  console.log(`Topic:      ${args.topic}`);
  console.log(`Format:     ${args.format}`);
  console.log(`Difficulty: ${args.difficulty}`);
  console.log(`Steps:      ${args.steps}`);

  // Step 1: Retrieve context from ChromaDB
  const chunks = queryChroma(args.topic, args.topK, args.pillar);
  console.log(`[RAG] Retrieved ${chunks.length} matching architectural chunks from ChromaDB.\n`);

  // Step 2: Build prompt
  const prompt = buildPrompt(chunks, args, drillId);

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

  // Step 4: Fallback to scaffold if no LLM API available
  if (!drillJson) {
    console.log('[INFO] No LLM API key detected or call skipped. Generating grounded CTA drill scaffold from retrieved chunks...');
    drillJson = generateScaffoldDrill(chunks, args, drillId);
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
