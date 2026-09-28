import type { DrillDefinitionDTO, DrillFormat } from '../types/drill.js';

export type WordingRuleId =
  | 'lesson-min-options'
  | 'length-tell'
  | 'verdict-prefix'
  | 'antipattern-name'
  | 'label-echo'
  | 'self-refuting-distractor'
  | 'long-stem';

export interface WordingFinding {
  ruleId: WordingRuleId;
  where: string;
  message: string;
}

type FeedbackField = 'rationale' | 'coachingFeedback';

/** One option as a learner sees it, whatever the drill format calls its fields. */
interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackField: FeedbackField;
  feedback: string;
  /** Rapid Fire only: the short name shown on every wrong option after submit. */
  antipattern?: string;
}

/** One decision point: a Rapid Fire / Diagram step, or a Lesson stage. */
interface Question {
  format: DrillFormat;
  where: string;
  stem: string;
  choices: Choice[];
}

function questionsOf(drill: DrillDefinitionDTO): Question[] {
  switch (drill.format) {
    case 'Rapid_Fire':
      return drill.steps.map((step) => ({
        format: drill.format,
        where: `step ${step.id}`,
        stem: step.prompt,
        choices: step.options.map((o) => ({
          id: o.id,
          text: o.label,
          isCorrect: o.isCorrect,
          feedbackField: 'rationale',
          feedback: o.rationale,
          antipattern: o.isCorrect ? undefined : (o.distractorAntipattern ?? ''),
        })),
      }));
    case 'Diagram':
      return drill.steps.map((step) => ({
        format: drill.format,
        where: `step ${step.id}`,
        stem: step.prompt,
        choices: step.options.map((o) => ({
          id: o.id,
          text: o.label,
          isCorrect: o.isCorrect,
          feedbackField: 'rationale',
          feedback: o.rationale,
          antipattern: o.isCorrect ? undefined : (o.distractorAntipattern ?? ''),
        })),
      }));
    case 'Lesson':
      return drill.stages.map((stage) => ({
        format: drill.format,
        where: `stage ${stage.stageNumber}`,
        stem: stage.scenario,
        choices: stage.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          feedbackField: 'coachingFeedback',
          feedback: o.coachingFeedback,
        })),
      }));
  }
}

const LENGTH_TELL_RATIO = 1.25;
const MAX_STEM_WORDS = 55;
const VERDICT_PREFIX = /^[A-Z][A-Za-z ]{0,24}[!:]\s/;
const SELF_REFUTING = /\b(entirely|blindly|immediately|always|never|directly to production)\b/i;

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

function lintQuestion(question: Question): WordingFinding[] {
  const findings: WordingFinding[] = [];
  const { where, choices } = question;

  const stemWords = wordCount(question.stem);
  if (stemWords > MAX_STEM_WORDS) {
    findings.push({
      ruleId: 'long-stem',
      where,
      message: `question text has ${stemWords} words (max ${MAX_STEM_WORDS}); cut sentences no option depends on`,
    });
  }

  if (question.format === 'Lesson' && choices.length < 3) {
    findings.push({
      ruleId: 'lesson-min-options',
      where,
      message: `has ${choices.length} options; Lesson stages need at least 3`,
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

/** Answer tells and feedback defects that let a learner find the answer without architectural judgment. */
export function lintDrillWording(drill: DrillDefinitionDTO): WordingFinding[] {
  return questionsOf(drill).flatMap(lintQuestion);
}
