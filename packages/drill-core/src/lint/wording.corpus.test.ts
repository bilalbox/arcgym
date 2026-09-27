import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { lintDrillWording, type DrillDefinitionDTO, type WordingRuleId } from '../index.js';

const DRILLS_DIR = path.resolve(import.meta.dirname, '../../../../content/drills');

function loadCorpus(): DrillDefinitionDTO[] {
  return fs
    .readdirSync(DRILLS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DRILLS_DIR, f), 'utf-8')));
}

function hitCounts(drills: DrillDefinitionDTO[]): Partial<Record<WordingRuleId, number>> {
  const counts: Partial<Record<WordingRuleId, number>> = {};
  for (const finding of drills.flatMap(lintDrillWording)) {
    counts[finding.ruleId] = (counts[finding.ruleId] ?? 0) + 1;
  }
  return counts;
}

/** Update as the draft rewrite lands; build-drills enforces zero findings on published drills. */
describe('wording findings on content/drills', () => {
  const corpus = loadCorpus();

  it('matches the recorded hit counts across all drills', () => {
    expect(hitCounts(corpus)).toEqual({
      'lesson-min-options': 12,
      'length-tell': 18,
      'verdict-prefix': 42,
      'antipattern-name': 46,
      'label-echo': 2,
      'self-refuting-distractor': 5,
      'long-stem': 1,
    });
  });

  it('has no findings on published drills', () => {
    expect(hitCounts(corpus.filter((d) => d.status === 'published'))).toEqual({});
  });
});
