import type { TroubleshootGradeResponse } from '@arcgym/drill-core';
import { safeFetchJson } from './safeFetch';

/**
 * Evaluates the learner's root-cause statement via the /api/troubleshoot/grade endpoint.
 * In production, evaluates against Workers AI CLEF and KV criteria.
 * In local Vite dev, intercepted by studioFsPlugin and evaluated via StubCauseGrader.
 */
export async function gradeCauseViaApi(
  drillId: string,
  causeText: string,
): Promise<TroubleshootGradeResponse> {
  const result = await safeFetchJson<TroubleshootGradeResponse & { error?: string }>(
    '/api/troubleshoot/grade',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        drillId,
        causeText,
      }),
    },
  );

  if (!result.ok || !result.data) {
    throw new Error(result.error || `grade ${result.status}`);
  }

  const data = result.data;
  if (!data.verdict || typeof data.isCorrect !== 'boolean' || !data.fix) {
    throw new Error('Invalid grade response payload');
  }
  return data;
}

export const fetchCauseGrade = gradeCauseViaApi;
