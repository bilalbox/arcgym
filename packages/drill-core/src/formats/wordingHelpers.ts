import type { WordingFinding } from '../lint/wording.js';
import type { DrillFormat } from '../types/drill.js';

export type FeedbackField = 'rationale';

export interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackField: FeedbackField;
  feedback: string;
  antipattern?: string;
}

export interface Question {
  format: DrillFormat;
  where: string;
  stem: string;
  choices: Choice[];
}

export const LENGTH_TELL_RATIO = 1.25;
export const MAX_STEM_WORDS = 55;
export const MAX_BRIEF_WORDS = 220;
export const MAX_STATION_PROMPT_WORDS = 55;
export const MAX_ARCHITECTURE_WORDS = 120;
export const MAX_ISSUE_WORDS = 80;
export const MAX_GOLD_CAUSE_SENTENCES = 2;
export const MAX_GOLD_CAUSE_WORDS = 55;
export const CAUSE_LEAK_JACCARD = 0.45;
export const VERDICT_PREFIX = /^[A-Z][A-Za-z ]{0,24}[!:]\s/;
export const SELF_REFUTING =
  /\b(entirely|blindly|immediately|always|never|directly to production)\b/i;
export const QUESTION_MARK = /\?/;

export const LABEL_ECHO_JACCARD = 0.4;
export const STOPWORDS = new Set([
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

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !STOPWORDS.has(w)),
  );
}

export function contentWordJaccard(a: string, b: string): number {
  const left = contentWords(a);
  const right = contentWords(b);
  const shared = [...left].filter((w) => right.has(w)).length;
  const distinct = new Set([...left, ...right]).size;
  return distinct === 0 ? 0 : shared / distinct;
}

export function lintQuestion(question: Question): WordingFinding[] {
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
