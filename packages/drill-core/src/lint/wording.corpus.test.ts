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

/** Update as the corpus rewrite lands; published counts reach zero before WORDING_ENFORCE turns on. */
describe('wording findings on content/drills', () => {
  const corpus = loadCorpus();

  it('matches the recorded hit counts across all drills', () => {
    expect(hitCounts(corpus)).toEqual({
      'lesson-min-options': 15,
      'length-tell': 22,
      'verdict-prefix': 51,
      'antipattern-name': 69,
      'label-echo': 3,
      'self-refuting-distractor': 8,
      'long-stem': 2,
    });
  });

  it('matches the recorded hit counts across published drills', () => {
    expect(hitCounts(corpus.filter((d) => d.status === 'published'))).toEqual({
      'lesson-min-options': 3,
      'length-tell': 4,
      'verdict-prefix': 9,
      'antipattern-name': 23,
      'label-echo': 1,
      'self-refuting-distractor': 3,
      'long-stem': 1,
    });
  });
});
