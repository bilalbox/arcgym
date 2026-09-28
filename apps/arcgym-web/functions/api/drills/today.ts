import {
  configErrorResponse,
  type Env,
  jsonResponse,
  opaqueError,
  requireKv,
} from '../../_shared/env';

const FALLBACK_DRILL = {
  id: 'AGD-00101',
  title: 'Core Platform & Agentic Architecture Trade-Offs',
  format: 'Rapid_Fire',
  domain: 'Core Platform & Agentforce',
  scheduledDate: new Date().toISOString().slice(0, 10),
  pillars: ['Reliability', 'Trust', 'Operational_Excellence'],
  version: 1,
  status: 'published',
  steps: [
    {
      id: 's1',
      prompt:
        'An enterprise ERP requires near-real-time updates when an Order or Account changes (450,000 events/day). Custom business payload transformation and filtering are required prior to external publication. Which integration pattern complies with Well-Architected Trust & Reliability?',
      options: [
        {
          id: 's1_a',
          label: 'Change Data Capture (CDC) with default channel publishing',
          isCorrect: false,
          rationale:
            'CDC publishes raw schema deltas and does not support custom Apex transformation or business filtering prior to external event egress.',
          citationUrl: 'https://architect.salesforce.com/design/decision-guides/event-driven',
        },
        {
          id: 's1_b',
          label:
            'Custom High-Volume Platform Event published via Apex after-save trigger with event enrichments',
          isCorrect: true,
          rationale:
            'Platform Events decouple systems asynchronously, support custom payloads, and allow Apex trigger filtering and enrichment before event egress.',
          citationUrl: 'https://architect.salesforce.com/design/decision-guides/event-driven',
        },
        {
          id: 's1_c',
          label: 'Direct synchronous REST callout inside an after-update Apex trigger',
          isCorrect: false,
          rationale:
            'Synchronous callouts inside triggers block database transactions, risk uncommitted work exceptions, and violate platform scalability standards.',
          citationUrl: 'https://architect.salesforce.com/design/decision-guides/event-driven',
        },
      ],
    },
  ],
};

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { env } = context;

  try {
    let drillPayload: unknown = null;

    try {
      const kv = requireKv(env);
      const cached = await kv.get('drill:today', 'json');
      if (cached) drillPayload = cached;
    } catch {
      // KV unbound in local static preview — use fallback.
    }

    if (!drillPayload) {
      drillPayload = FALLBACK_DRILL;
    }

    return jsonResponse(drillPayload, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-ArcGym-Source': env.DRILL_KV ? 'Cloudflare-KV' : 'Edge-Fallback',
    });
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('today drill GET failed', error);
    return opaqueError(500, 'Failed to retrieve today drill');
  }
}
