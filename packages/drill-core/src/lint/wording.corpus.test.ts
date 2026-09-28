import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { type DrillDefinitionDTO, lintDrillWording, type WordingRuleId } from '../index.js';

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

/** Stricter than build-drills, which only warns on drafts: a hand-edited draft must be fixed before this passes. */
describe('wording findings on content/drills', () => {
  it('has no findings on any drill', () => {
    expect(hitCounts(loadCorpus())).toEqual({});
  });
});
