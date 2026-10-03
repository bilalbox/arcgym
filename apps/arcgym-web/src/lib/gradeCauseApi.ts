import {
  type CauseScoreOverrides,
  stubCauseScoreOverrides,
  type TroubleshootingDrillDefinition,
} from '@arcgym/drill-core';

/**
 * Fetch CLEF choice probabilities from the Pages Function (server loads gold +
 * distractors + other from KV). In Vite-only local preview, falls back to a
 * Jaccard stub so Incidents remain playable.
 */
export async function fetchCauseScoreOverrides(
  drill: TroubleshootingDrillDefinition,
  causeText: string,
): Promise<{ scores: CauseScoreOverrides; source: 'api' | 'stub' }> {
  try {
    const res = await fetch('/api/troubleshoot/grade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        drillId: drill.id,
        causeText,
      }),
    });
    const data = (await res.json()) as { scores?: CauseScoreOverrides; error?: string };
    if (!res.ok) {
      throw new Error(data.error || `grade ${res.status}`);
    }
    if (!data.scores || typeof data.scores.gold !== 'number') {
      throw new Error('invalid grade payload');
    }
    return { scores: data.scores, source: 'api' };
  } catch (err) {
    if (import.meta.env.DEV) {
      return { scores: stubCauseScoreOverrides(drill, causeText), source: 'stub' };
    }
    throw err instanceof Error ? err : new Error('Cause grading unavailable');
  }
}
