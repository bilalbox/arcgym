import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type DrillDefinitionDTO,
  isCaseFileDrill,
  isTroubleshootingDrill,
  optionSeed,
  orderOptions,
} from '../index.js';

const DRILLS_DIR = path.resolve(import.meta.dirname, '../../../../content/drills');

/** Each rendered decision as [runner seed, correct flag per authored option]. */
function renderedDecisions(drill: DrillDefinitionDTO): [string, boolean[]][] {
  if (isCaseFileDrill(drill)) {
    return drill.stations.map((s) => [
      optionSeed(drill.id, s.id),
      s.options.map((o) => o.isCorrect),
    ]);
  }
  if (isTroubleshootingDrill(drill) && drill.fix) {
    return [[optionSeed(drill.id, 'fix'), drill.fix.options.map((o) => o.isCorrect)]];
  }
  return [];
}

describe('rendered option order on published drills', () => {
  it('shows the correct option first in no more than 40% of steps, stages, and moves', () => {
    const published: DrillDefinitionDTO[] = fs
      .readdirSync(DRILLS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(DRILLS_DIR, f), 'utf-8')))
      .filter((d: DrillDefinitionDTO) => d.status === 'published');
    const decisions = published.flatMap(renderedDecisions);
    const correctFirst = decisions.filter(([seed, flags]) => orderOptions(flags, seed)[0]).length;
    expect(correctFirst / decisions.length).toBeLessThanOrEqual(0.4);
  });
});
