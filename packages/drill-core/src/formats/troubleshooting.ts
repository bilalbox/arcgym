import type { WordingFinding } from '../lint/wording.js';
import {
  type ClientTroubleshootingDrillDefinition,
  TROUBLESHOOTING_HIDDEN_DISTRACTOR_COUNT,
  TROUBLESHOOTING_MIN_PIVOTAL_PROBES,
  TROUBLESHOOTING_MIN_PROBES,
  TROUBLESHOOTING_PROBE_BUDGET,
  type TroubleshootingDrillDefinition,
} from '../types/drill.js';
import type { ValidationContext, ValidationFinding } from '../validator/validator.js';
import type { DrillFormatDescriptor } from './types.js';
import { isCitationValid, validateDiagramUrl, validateProbePool } from './validationHelpers.js';
import {
  CAUSE_LEAK_JACCARD,
  contentWordJaccard,
  MAX_ARCHITECTURE_WORDS,
  MAX_GOLD_CAUSE_SENTENCES,
  MAX_GOLD_CAUSE_WORDS,
  MAX_ISSUE_WORDS,
  QUESTION_MARK,
  sentenceCount,
  VERDICT_PREFIX,
  wordCount,
} from './wordingHelpers.js';

export function isTroubleshootingDrillAuthored(
  drill: unknown,
): drill is TroubleshootingDrillDefinition {
  return (
    typeof drill === 'object' &&
    drill !== null &&
    'format' in drill &&
    (drill as { format: unknown }).format === 'Troubleshooting' &&
    'goldCause' in drill
  );
}

export function isTroubleshootingDrillClient(
  drill: unknown,
): drill is ClientTroubleshootingDrillDefinition {
  return (
    typeof drill === 'object' &&
    drill !== null &&
    'format' in drill &&
    (drill as { format: unknown }).format === 'Troubleshooting'
  );
}

export function validateTroubleshooting(
  drill: Record<string, unknown>,
  ctx: ValidationContext,
  findings: ValidationFinding[],
): void {
  const architecture = drill.architecture as Record<string, unknown> | undefined;
  if (!architecture || typeof architecture.synopsis !== 'string' || !architecture.synopsis) {
    findings.push({
      ruleId: 'missing-field',
      where: 'architecture.synopsis',
      message: 'Troubleshooting requires architecture.synopsis',
    });
  }
  if (!architecture?.diagramUrl) {
    findings.push({
      ruleId: 'missing-field',
      where: 'architecture.diagramUrl',
      message: 'Troubleshooting requires architecture.diagramUrl',
    });
  } else {
    validateDiagramUrl(architecture.diagramUrl, 'architecture.diagramUrl', ctx, findings);
  }

  if (typeof drill.issue !== 'string' || !drill.issue) {
    findings.push({
      ruleId: 'missing-field',
      where: 'issue',
      message: 'Troubleshooting requires issue',
    });
  }

  if (drill.probeBudget !== TROUBLESHOOTING_PROBE_BUDGET) {
    findings.push({
      ruleId: 'probe-pool',
      where: 'probeBudget',
      message: `Troubleshooting probeBudget must be ${TROUBLESHOOTING_PROBE_BUDGET}`,
    });
  }

  const goldCause = drill.goldCause as Record<string, unknown> | undefined;
  if (!goldCause || typeof goldCause.text !== 'string' || !goldCause.text) {
    findings.push({
      ruleId: 'missing-field',
      where: 'goldCause.text',
      message: 'Troubleshooting requires goldCause.text',
    });
  }
  if (!goldCause || typeof goldCause.rationale !== 'string' || !goldCause.rationale) {
    findings.push({
      ruleId: 'missing-field',
      where: 'goldCause.rationale',
      message: 'Troubleshooting requires goldCause.rationale',
    });
  }
  if (goldCause?.citationUrl !== undefined) {
    if (!isCitationValid(goldCause.citationUrl, ctx)) {
      findings.push({
        ruleId: 'citation-manifest',
        where: 'goldCause.citationUrl',
        message: `goldCause.citationUrl must be an exact Citation Manifest URL (got ${goldCause.citationUrl})`,
      });
    }
  }

  if (goldCause?.remediations !== undefined) {
    if (!Array.isArray(goldCause.remediations)) {
      findings.push({
        ruleId: 'missing-field',
        where: 'goldCause.remediations',
        message: 'goldCause.remediations must be an array when present',
      });
    } else {
      goldCause.remediations.forEach((rem, idx) => {
        const r = rem as Record<string, unknown> | undefined;
        if (!r || typeof r.title !== 'string' || !r.title.trim()) {
          findings.push({
            ruleId: 'missing-field',
            where: `goldCause.remediations[${idx}].title`,
            message: `remediation ${idx + 1} requires a non-empty title`,
          });
        }
        if (!r || typeof r.description !== 'string' || !r.description.trim()) {
          findings.push({
            ruleId: 'missing-field',
            where: `goldCause.remediations[${idx}].description`,
            message: `remediation ${idx + 1} requires a non-empty description`,
          });
        }
        if (r?.citationUrl !== undefined && !isCitationValid(r.citationUrl, ctx)) {
          findings.push({
            ruleId: 'citation-manifest',
            where: `goldCause.remediations[${idx}].citationUrl`,
            message: `remediation ${idx + 1} citationUrl must be an exact Citation Manifest URL (got ${r.citationUrl})`,
          });
        }
      });
    }
  }

  if (
    !Array.isArray(drill.hiddenDistractors) ||
    drill.hiddenDistractors.length !== TROUBLESHOOTING_HIDDEN_DISTRACTOR_COUNT
  ) {
    findings.push({
      ruleId: 'hidden-distractors',
      where: 'hiddenDistractors',
      message: `Troubleshooting requires exactly ${TROUBLESHOOTING_HIDDEN_DISTRACTOR_COUNT} hiddenDistractors`,
    });
  } else {
    const distractorIds = drill.hiddenDistractors.map((d) =>
      d && typeof d === 'object' ? (d as { id?: unknown }).id : undefined,
    );
    if (new Set(distractorIds).size !== distractorIds.length) {
      findings.push({
        ruleId: 'hidden-distractors',
        where: 'hiddenDistractors',
        message: 'duplicate hiddenDistractor ids',
      });
    }
    for (const d of drill.hiddenDistractors) {
      const distractor = d as Record<string, unknown> | undefined;
      const dId = String(distractor?.id ?? 'unknown');
      if (!distractor?.text || !distractor?.antipattern || !distractor?.rationale) {
        findings.push({
          ruleId: 'hidden-distractors',
          where: `hiddenDistractor ${dId}`,
          message: `hiddenDistractor ${dId} requires text, antipattern, and rationale`,
        });
      }
    }
  }

  validateProbePool(
    drill.probes,
    drill.probeBudget,
    {
      wherePrefix: '',
      minProbes: TROUBLESHOOTING_MIN_PROBES,
      expectedPivotal: { min: TROUBLESHOOTING_MIN_PIVOTAL_PROBES },
      requireTiers: { useful: true, distractor: true },
    },
    findings,
  );
}

export function lintTroubleshootingExtras(drill: TroubleshootingDrillDefinition): WordingFinding[] {
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
      message: `gold cause has ${goldSentences} sentences / ${goldWords} words (max ${MAX_GOLD_CAUSE_SENTENCES} sentences, ${MAX_GOLD_CAUSE_WORDS} words); keep ~2 sentences for CLEF matching stability`,
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

export const troubleshootingDescriptor: DrillFormatDescriptor<
  TroubleshootingDrillDefinition,
  ClientTroubleshootingDrillDefinition
> = {
  format: 'Troubleshooting',
  label: 'Troubleshooting',
  routePrefix: '/troubleshoot',
  countsForStreak: false,
  isDailyEligible: false,
  isAuthored: isTroubleshootingDrillAuthored,
  isClient: isTroubleshootingDrillClient,
  validate: validateTroubleshooting,
  lintWording: lintTroubleshootingExtras,
  getQuestionCount: (_drill) => 1,
  sanitizeForClient: (drill) => {
    const { goldCause: _gold, hiddenDistractors: _distractors, ...rest } = drill;
    return rest;
  },
};
