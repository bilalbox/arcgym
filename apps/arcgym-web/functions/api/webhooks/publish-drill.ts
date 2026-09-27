interface Env {
  DRILL_KV?: any;
  ARCGYM_HMAC_SECRET?: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  const signature = request.headers.get('x-arcgym-signature');
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing X-ArcGym-Signature header' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rawBody = await request.text();
  const secret = env.ARCGYM_HMAC_SECRET || 'arcgym_hmac_secret_2026_super_secure';

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert hex signature to Uint8Array
    const hexPairs = signature.match(/.{1,2}/g);
    if (!hexPairs || hexPairs.length !== 32) {
      return new Response(
        JSON.stringify({ error: 'Invalid HMAC signature format' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sigBytes = new Uint8Array(hexPairs.map(byte => parseInt(byte, 16)));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody));

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid HMAC signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const drill = JSON.parse(rawBody);

    // Catalog drafts must not become the featured edge "today" drill.
    if (drill.status === 'draft') {
      return new Response(
        JSON.stringify({ error: 'Refusing to feature a draft drill; set status to published first' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Persist to Cloudflare Workers KV
    if (env.DRILL_KV) {
      const scheduledDate = drill.scheduledDate || new Date().toISOString().slice(0, 10);
      await env.DRILL_KV.put(`drill:${scheduledDate}`, rawBody);
      await env.DRILL_KV.put('drill:today', rawBody);
      if (drill.id) {
        await env.DRILL_KV.put(`drill:id:${drill.id}`, rawBody);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        drillId: drill.id,
        scheduledDate: drill.scheduledDate,
        cachedAt: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to process webhook', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
