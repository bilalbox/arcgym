import { describe, expect, it } from 'vitest';
import type { RapidFireDrillDefinition } from '../types/drill.js';
import { CONTRAST_SET_SIZE, validateContrastSetCatalog } from './contrastSet.js';

function rf(
  id: string,
  contrast?: { contrastSetId: string; contrastPrinciple: string },
): RapidFireDrillDefinition {
  return {
    id,
    title: `Drill ${id}`,
    format: 'Rapid_Fire',
    domain: 'Data_Architecture',
    domainLabel: 'Data',
    difficulty: 'Lead_CTA',
    pillars: ['Reliability'],
    version: 1,
    status: 'published',
    steps: [],
    ...contrast,
  };
}

const PRINCIPLE =
  'The deciding variable was whether live federation meets freshness without copying into CRM storage.';

describe('validateContrastSetCatalog', () => {
  it('requires exactly three published siblings per contrastSetId', () => {
    expect(CONTRAST_SET_SIZE).toBe(3);

    const incomplete = [
      rf('AGD-00201', {
        contrastSetId: 'CS-zero-copy-vs-copy',
        contrastPrinciple: PRINCIPLE,
      }),
      rf('AGD-00204', {
        contrastSetId: 'CS-zero-copy-vs-copy',
        contrastPrinciple: PRINCIPLE,
      }),
    ];

    const findings = validateContrastSetCatalog(incomplete);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'contrast-set',
      where: 'contrastSetId CS-zero-copy-vs-copy',
    });
    expect(findings[0].message).toContain('exactly 3');
  });

  it('accepts a complete three-sibling Contrast Set with shared principle', () => {
    const complete = [
      rf('AGD-00201', {
        contrastSetId: 'CS-zero-copy-vs-copy',
        contrastPrinciple: PRINCIPLE,
      }),
      rf('AGD-00204', {
        contrastSetId: 'CS-zero-copy-vs-copy',
        contrastPrinciple: PRINCIPLE,
      }),
      rf('AGD-00806', {
        contrastSetId: 'CS-zero-copy-vs-copy',
        contrastPrinciple: PRINCIPLE,
      }),
      rf('AGD-00101'),
    ];

    expect(validateContrastSetCatalog(complete)).toEqual([]);
  });

  it('rejects mismatched contrastPrinciple within a set', () => {
    const mismatched = [
      rf('AGD-00201', {
        contrastSetId: 'CS-zero-copy-vs-copy',
        contrastPrinciple: PRINCIPLE,
      }),
      rf('AGD-00204', {
        contrastSetId: 'CS-zero-copy-vs-copy',
        contrastPrinciple: PRINCIPLE,
      }),
      rf('AGD-00806', {
        contrastSetId: 'CS-zero-copy-vs-copy',
        contrastPrinciple: 'The deciding variable was something else.',
      }),
    ];

    const findings = validateContrastSetCatalog(mismatched);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('share one contrastPrinciple');
  });
});
