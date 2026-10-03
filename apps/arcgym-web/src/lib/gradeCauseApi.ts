import {
  type CauseScoreOverrides,
  stubCauseScoreOverrides,
  type TroubleshootingDrillDefinition,
} from '@arcgym/drill-core';

/**
 * Fetch BGE rerank scores from the Pages Function (server loads gold + distractors
 * from KV). In Vite-only local preview, falls back to the prototype Jaccard stub.
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
    if (!res.ok) throw new Error(`grade ${res.status}`);
    const data = (await res.json()) as { scores?: CauseScoreOverrides };
    if (!data.scores || typeof data.scores.gold !== 'number') {
      throw new Error('invalid grade payload');
    }
    return { scores: data.scores, source: 'api' };
  } catch {
    if (import.meta.env.DEV) {
      return { scores: stubCauseScoreOverrides(drill, causeText), source: 'stub' };
    }
    throw new Error('Cause grading unavailable');
  }
}
