import { describe, expect, it } from 'vitest';
import type { RapidFireDrillDefinition } from '../types/drill.js';
import { contrastPrincipleForRound } from './contrastRound.js';

function rf(
  id: string,
  contrast?: { contrastSetId: string; contrastPrinciple: string },
): RapidFireDrillDefinition {
  return {
    id,
    title: id,
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

describe('contrastPrincipleForRound', () => {
  it('returns the shared principle for a complete Contrast Set round', () => {
    const drills = [
      rf('AGD-00201', { contrastSetId: 'CS-zero-copy-vs-copy', contrastPrinciple: PRINCIPLE }),
      rf('AGD-00204', { contrastSetId: 'CS-zero-copy-vs-copy', contrastPrinciple: PRINCIPLE }),
      rf('AGD-00806', { contrastSetId: 'CS-zero-copy-vs-copy', contrastPrinciple: PRINCIPLE }),
    ];
    expect(contrastPrincipleForRound(drills)).toBe(PRINCIPLE);
  });

  it('returns undefined for independent Rapid Fire rounds', () => {
    expect(contrastPrincipleForRound([rf('AGD-00101'), rf('AGD-00102'), rf('AGD-00103')])).toBe(
      undefined,
    );
  });

  it('returns undefined when siblings disagree on set id', () => {
    const drills = [
      rf('AGD-00201', { contrastSetId: 'CS-zero-copy-vs-copy', contrastPrinciple: PRINCIPLE }),
      rf('AGD-00204', { contrastSetId: 'CS-other', contrastPrinciple: PRINCIPLE }),
      rf('AGD-00806', { contrastSetId: 'CS-zero-copy-vs-copy', contrastPrinciple: PRINCIPLE }),
    ];
    expect(contrastPrincipleForRound(drills)).toBeUndefined();
  });
});
