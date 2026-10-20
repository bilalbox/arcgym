import type { GradeCauseResult } from '@arcgym/drill-core';

/**
 * Evaluates the learner's root-cause statement via the /api/troubleshoot/grade endpoint.
 * In production, evaluates against Workers AI CLEF and KV criteria.
 * In local Vite dev, intercepted by studioFsPlugin and evaluated via StubCauseGrader.
 */
export async function gradeCauseViaApi(
  drillId: string,
  causeText: string,
  firstCallText?: string,
): Promise<GradeCauseResult> {
  const res = await fetch('/api/troubleshoot/grade', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      drillId,
      causeText,
      ...(firstCallText ? { firstCallText } : {}),
    }),
  });

  const data = (await res.json()) as GradeCauseResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `grade ${res.status}`);
  }
  if (!data.verdict || typeof data.isCorrect !== 'boolean') {
    throw new Error('Invalid grade response payload');
  }
  return data;
}

export const fetchCauseGrade = gradeCauseViaApi;
