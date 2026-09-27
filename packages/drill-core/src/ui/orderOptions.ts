function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle seed for one decision: a Rapid Fire step id, a Lesson stage number, or a Scenario move number. */
export function optionSeed(drillId: string, decisionKey: string | number): string {
  return `${drillId}:${decisionKey}`;
}

/**
 * Display order for a decision's options: a deterministic shuffle seeded by `optionSeed`,
 * so authored position never reveals the answer and every render of a decision agrees.
 */
export function orderOptions<T>(options: readonly T[], seed: string): T[] {
  const random = mulberry32(fnv1a(seed));
  const ordered = [...options];
  for (let i = ordered.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  }
  return ordered;
}
