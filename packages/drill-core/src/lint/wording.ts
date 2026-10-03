import type {
  CaseFileDrillDefinition,
  DrillDefinitionDTO,
  DrillFormat,
  RapidFireDrillDefinition,
  TroubleshootingDrillDefinition,
} from '../types/drill.js';
import { isCaseFileDrill, isRapidFireDrill, isTroubleshootingDrill } from '../types/drill.js';

export type WordingRuleId =
  | 'length-tell'
  | 'verdict-prefix'
  | 'antipattern-name'
  | 'label-echo'
  | 'self-refuting-distractor'
  | 'long-stem'
  | 'pivotal-leak'
  | 'probe-not-question'
  | 'cause-leak'
  | 'gold-too-long';

export interface WordingFinding {
  ruleId: WordingRuleId;
  where: string;
  message: string;
}

type FeedbackField = 'rationale';

/** One option as a learner sees it, whatever the drill format calls its fields. */
interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackField: FeedbackField;
  feedback: string;
  /** Short name shown on every wrong option after submit. */
  antipattern?: string;
}

/** One decision point: a Rapid Fire step or Case File station recommendation. */
interface Question {
  format: DrillFormat;
  where: string;
  stem: string;
  choices: Choice[];
}

const LENGTH_TELL_RATIO = 1.25;
const MAX_STEM_WORDS = 55;
/** Case File briefs are Evaluation-scale narratives. */
const MAX_BRIEF_WORDS = 220;
const MAX_STATION_PROMPT_WORDS = 55;
/** Troubleshooting architecture synopsis stays shorter than a Case File brief. */
const MAX_ARCHITECTURE_WORDS = 120;
const MAX_ISSUE_WORDS = 80;
/** Gold cause must stay short for stable BGE reranker matching (~2 sentences). */
const MAX_GOLD_CAUSE_SENTENCES = 2;
const MAX_GOLD_CAUSE_WORDS = 55;
const CAUSE_LEAK_JACCARD = 0.45;
const VERDICT_PREFIX = /^[A-Z][A-Za-z ]{0,24}[!:]\s/;
const SELF_REFUTING = /\b(entirely|blindly|immediately|always|never|directly to production)\b/i;
const QUESTION_MARK = /\?/;

const LABEL_ECHO_JACCARD = 0.4;
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'by',
  'from',
  'is',
  'are',
  'be',
  'and',
  'or',
]);

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !STOPWORDS.has(w)),
  );
}

/** Shared content words over distinct content words across both strings. */
function contentWordJaccard(a: string, b: string): number {
  const left = contentWords(a);
  const right = contentWords(b);
  const shared = [...left].filter((w) => right.has(w)).length;
  const distinct = new Set([...left, ...right]).size;
  return distinct === 0 ? 0 : shared / distinct;
}

function questionsOfRapidFire(drill: RapidFireDrillDefinition): Question[] {
  return drill.steps.map((step) => ({
    format: drill.format,
    where: `step ${step.id}`,
    stem: step.prompt,
    choices: step.options.map((o) => ({
      id: o.id,
      text: o.label,
      isCorrect: o.isCorrect,
      feedbackField: 'rationale' as const,
      feedback: o.rationale,
      antipattern: o.isCorrect ? undefined : (o.distractorAntipattern ?? ''),
    })),
  }));
}

function questionsOfCaseFile(drill: CaseFileDrillDefinition): Question[] {
  return drill.stations.map((station) => ({
    format: drill.format,
    where: `station ${station.id}`,
    stem: station.prompt,
    choices: station.options.map((o) => ({
      id: o.id,
      text: o.label,
      isCorrect: o.isCorrect,
      feedbackField: 'rationale' as const,
      feedback: o.rationale,
      antipattern: o.isCorrect ? undefined : (o.distractorAntipattern ?? ''),
    })),
  }));
}

function lintQuestion(question: Question): WordingFinding[] {
  const findings: WordingFinding[] = [];
  const { where, choices } = question;

  const stemWords = wordCount(question.stem);
  const maxStem = question.format === 'Case_File' ? MAX_STATION_PROMPT_WORDS : MAX_STEM_WORDS;
  if (stemWords > maxStem) {
    findings.push({
      ruleId: 'long-stem',
      where,
      message: `question text has ${stemWords} words (max ${maxStem}); cut sentences no option depends on`,
    });
  }

  const distractors = choices.filter((c) => !c.isCorrect);
  if (distractors.length > 0) {
    const meanDistractorWords =
      distractors.reduce((sum, c) => sum + wordCount(c.text), 0) / distractors.length;
    for (const correct of choices.filter((c) => c.isCorrect)) {
      const words = wordCount(correct.text);
      if (words > LENGTH_TELL_RATIO * meanDistractorWords) {
        findings.push({
          ruleId: 'length-tell',
          where,
          message: `correct option ${correct.id} has ${words} words against a distractor mean of ${meanDistractorWords.toFixed(1)}`,
        });
      }
    }
  }

  for (const choice of choices) {
    const prefix = choice.feedback.match(VERDICT_PREFIX);
    if (prefix) {
      findings.push({
        ruleId: 'verdict-prefix',
        where: `${where} option ${choice.id} ${choice.feedbackField}`,
        message: `opens with the verdict "${prefix[0].trim()}"; the UI already shows the verdict`,
      });
    }

    const tell = choice.isCorrect ? null : choice.text.match(SELF_REFUTING);
    if (tell) {
      findings.push({
        ruleId: 'self-refuting-distractor',
        where: `${where} option ${choice.id}`,
        message: `"${tell[0]}" announces a wrong answer; write the most plausible version of the mistake`,
      });
    }

    if (choice.isCorrect) {
      const overlap = contentWordJaccard(choice.text, choice.feedback);
      if (overlap >= LABEL_ECHO_JACCARD) {
        findings.push({
          ruleId: 'label-echo',
          where: `${where} option ${choice.id}`,
          message: `${choice.feedbackField} repeats the option (content-word overlap ${overlap.toFixed(2)}); state the principle and the deciding constraint`,
        });
      }
    }

    if (choice.antipattern !== undefined) {
      const words = wordCount(choice.antipattern);
      if (words < 2 || words > 5 || /[.!?]/.test(choice.antipattern)) {
        findings.push({
          ruleId: 'antipattern-name',
          where: `${where} option ${choice.id}`,
          message: `distractorAntipattern "${choice.antipattern}" must be a 2–5 word name, not a sentence; explain the failure in rationale`,
        });
      }
    }
  }

  return findings;
}

function lintCaseFileExtras(drill: CaseFileDrillDefinition): WordingFinding[] {
  const findings: WordingFinding[] = [];
  const briefWords = wordCount(drill.brief.synopsis);
  if (briefWords > MAX_BRIEF_WORDS) {
    findings.push({
      ruleId: 'long-stem',
      where: 'brief.synopsis',
      message: `brief synopsis has ${briefWords} words (max ${MAX_BRIEF_WORDS}); keep Evaluation-scale, not a full Review Board packet`,
    });
  }

  const synopsisLower = drill.brief.synopsis.toLowerCase();
  for (const station of drill.stations) {
    for (const probe of station.probes) {
      if (!QUESTION_MARK.test(probe.label)) {
        findings.push({
          ruleId: 'probe-not-question',
          where: `station ${station.id} probe ${probe.id}`,
          message: 'probe label must be a clarifying question ending with ?',
        });
      }
      if (probe.tier === 'pivotal') {
        const answer = probe.answer.trim();
        if (answer.length >= 8 && synopsisLower.includes(answer.toLowerCase())) {
          findings.push({
            ruleId: 'pivotal-leak',
            where: `station ${station.id} probe ${probe.id}`,
            message:
              'pivotal probe answer appears in brief.synopsis; leave critical facts behind the Probe Budget',
          });
        }
      }
      if (probe.tier === 'distractor' && probe.distractorAntipattern) {
        const words = wordCount(probe.distractorAntipattern);
        if (words < 2 || words > 5 || /[.!?]/.test(probe.distractorAntipattern)) {
          findings.push({
            ruleId: 'antipattern-name',
            where: `station ${station.id} probe ${probe.id}`,
            message: `distractorAntipattern "${probe.distractorAntipattern}" must be a 2–5 word name, not a sentence`,
          });
        }
      }
    }
  }

  return findings;
}

function lintTroubleshootingExtras(drill: TroubleshootingDrillDefinition): WordingFinding[] {
  const findings: WordingFinding[] = [];

  const archWords = wordCount(drill.architecture.synopsis);
  if (archWords > MAX_ARCHITECTURE_WORDS) {
    findings.push({
      ruleId: 'long-stem',
      where: 'architecture.synopsis',
      message: `architecture synopsis has ${archWords} words (max ${MAX_ARCHITECTURE_WORDS}); keep topology, not the diagnosis`,
    });
  }

  const issueWords = wordCount(drill.issue);
  if (issueWords > MAX_ISSUE_WORDS) {
    findings.push({
      ruleId: 'long-stem',
      where: 'issue',
      message: `issue has ${issueWords} words (max ${MAX_ISSUE_WORDS}); state the failure, not the cause`,
    });
  }

  const goldSentences = sentenceCount(drill.goldCause.text);
  const goldWords = wordCount(drill.goldCause.text);
  if (goldSentences > MAX_GOLD_CAUSE_SENTENCES || goldWords > MAX_GOLD_CAUSE_WORDS) {
    findings.push({
      ruleId: 'gold-too-long',
      where: 'goldCause.text',
      message: `gold cause has ${goldSentences} sentences / ${goldWords} words (max ${MAX_GOLD_CAUSE_SENTENCES} sentences, ${MAX_GOLD_CAUSE_WORDS} words); keep ~2 sentences for reranker stability`,
    });
  }

  const briefSurface = `${drill.architecture.synopsis}\n${drill.issue}`;
  const briefLower = briefSurface.toLowerCase();
  const goldOverlap = contentWordJaccard(drill.goldCause.text, briefSurface);
  if (goldOverlap >= CAUSE_LEAK_JACCARD) {
    findings.push({
      ruleId: 'cause-leak',
      where: 'architecture/issue',
      message: `gold cause content-word overlap with brief surface is ${goldOverlap.toFixed(2)}; leave the diagnosis behind pivotal probes`,
    });
  }

  for (const probe of drill.probes) {
    if (!QUESTION_MARK.test(probe.label)) {
      findings.push({
        ruleId: 'probe-not-question',
        where: `probe ${probe.id}`,
        message: 'probe label must be a clarifying question ending with ?',
      });
    }
    if (probe.tier === 'pivotal') {
      const answer = probe.answer.trim();
      if (answer.length >= 8 && briefLower.includes(answer.toLowerCase())) {
        findings.push({
          ruleId: 'pivotal-leak',
          where: `probe ${probe.id}`,
          message:
            'pivotal probe answer appears in architecture/issue; leave critical facts behind the Probe Budget',
        });
      }
    }
    if (probe.tier === 'distractor' && probe.distractorAntipattern) {
      const words = wordCount(probe.distractorAntipattern);
      if (words < 2 || words > 5 || /[.!?]/.test(probe.distractorAntipattern)) {
        findings.push({
          ruleId: 'antipattern-name',
          where: `probe ${probe.id}`,
          message: `distractorAntipattern "${probe.distractorAntipattern}" must be a 2–5 word name, not a sentence`,
        });
      }
    }
  }

  for (const distractor of drill.hiddenDistractors) {
    const words = wordCount(distractor.antipattern);
    if (words < 2 || words > 5 || /[.!?]/.test(distractor.antipattern)) {
      findings.push({
        ruleId: 'antipattern-name',
        where: `hiddenDistractor ${distractor.id}`,
        message: `antipattern "${distractor.antipattern}" must be a 2–5 word name, not a sentence`,
      });
    }
    const prefix = distractor.rationale.match(VERDICT_PREFIX);
    if (prefix) {
      findings.push({
        ruleId: 'verdict-prefix',
        where: `hiddenDistractor ${distractor.id} rationale`,
        message: `opens with the verdict "${prefix[0].trim()}"; the UI already shows the verdict`,
      });
    }
  }

  const goldPrefix = drill.goldCause.rationale.match(VERDICT_PREFIX);
  if (goldPrefix) {
    findings.push({
      ruleId: 'verdict-prefix',
      where: 'goldCause.rationale',
      message: `opens with the verdict "${goldPrefix[0].trim()}"; the UI already shows the verdict`,
    });
  }

  return findings;
}

/** Answer tells and feedback defects that let a learner find the answer without architectural judgment. */
export function lintDrillWording(drill: DrillDefinitionDTO): WordingFinding[] {
  if (isRapidFireDrill(drill)) {
    return questionsOfRapidFire(drill).flatMap(lintQuestion);
  }
  if (isCaseFileDrill(drill)) {
    return [...questionsOfCaseFile(drill).flatMap(lintQuestion), ...lintCaseFileExtras(drill)];
  }
  if (isTroubleshootingDrill(drill)) {
    return lintTroubleshootingExtras(drill);
  }
  return [];
}
