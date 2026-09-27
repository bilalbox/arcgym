/**
 * Shared Env + response helpers for Cloudflare Pages Functions.
 */

/** Minimal KV binding surface (avoids a hard dependency on workers-types). */
export interface DrillKvNamespace {
  get(
    key: string,
    type?: 'text' | 'json' | 'arrayBuffer' | 'stream'
  ): Promise<unknown>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  list(options?: {
    prefix?: string;
  }): Promise<{ keys: Array<{ name: string }> }>;
}

export interface Env {
  DRILL_KV?: DrillKvNamespace;
  /** HMAC secret for publish-drill webhook signatures. */
  ARCGYM_HMAC_SECRET?: string;
  /** Bearer key for /api/admin/* (header X-ArcGym-Admin-Key only). */
  ARCGYM_ADMIN_KEY?: string;
  /** HMAC secret for ephemeral vote-dedup tokens (IP×day×drill). */
  ARCGYM_VOTE_HMAC_SECRET?: string;
}

export type SecretName =
  | 'ARCGYM_HMAC_SECRET'
  | 'ARCGYM_ADMIN_KEY'
  | 'ARCGYM_VOTE_HMAC_SECRET';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function opaqueError(status: number, message: string): Response {
  return jsonResponse({ error: message }, status);
}

/** Fail closed: never fall back to a hardcoded secret. */
export function requireSecret(env: Env, name: SecretName): string {
  const value = env[name];
  if (typeof value !== 'string' || value.length < 16) {
    throw new SecretConfigError(name);
  }
  return value;
}

export class SecretConfigError extends Error {
  readonly secretName: SecretName;
  constructor(secretName: SecretName) {
    super(`${secretName} is not configured`);
    this.name = 'SecretConfigError';
    this.secretName = secretName;
  }
}

export function requireKv(env: Env): DrillKvNamespace {
  if (!env.DRILL_KV) {
    throw new KvConfigError();
  }
  return env.DRILL_KV;
}

export class KvConfigError extends Error {
  constructor() {
    super('DRILL_KV is not bound');
    this.name = 'KvConfigError';
  }
}

export function configErrorResponse(error: unknown): Response | null {
  if (error instanceof SecretConfigError || error instanceof KvConfigError) {
    return opaqueError(503, 'Service misconfigured');
  }
  return null;
}

/** Length-aware constant-time string compare for secrets. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  const len = Math.max(bufA.length, bufB.length);
  let mismatch = bufA.length === bufB.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    mismatch |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return mismatch === 0;
}

export async function readJsonBody(
  request: Request,
  maxBytes: number
): Promise<{ ok: true; text: string; json: unknown } | { ok: false; response: Response }> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    return { ok: false, response: opaqueError(413, 'Request body too large') };
  }

  const text = await request.text();
  if (text.length > maxBytes) {
    return { ok: false, response: opaqueError(413, 'Request body too large') };
  }

  try {
    return { ok: true, text, json: JSON.parse(text) };
  } catch {
    return { ok: false, response: opaqueError(400, 'Invalid JSON body') };
  }
}
