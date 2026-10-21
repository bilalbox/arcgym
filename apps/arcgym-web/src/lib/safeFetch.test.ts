import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeFetchJson } from './safeFetch';

describe('safeFetchJson', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns parsed data on 200 OK with application/json', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ greeting: 'hello' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await safeFetchJson<{ greeting: string }>('/api/test');
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ greeting: 'hello' });
  });

  it('gracefully handles HTML 200/404/405 without throwing SyntaxError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('<!doctype html><html><body>Error</body></html>', {
        status: 405,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    );

    const result = await safeFetchJson<{ count: number }>('/api/test');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(405);
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/Expected JSON but received text\/html/);
  });

  it('extracts server JSON error message on HTTP error statuses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await safeFetchJson<{ error: string }>('/api/test');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toBe('Rate limit exceeded');
  });

  it('handles network / fetch failure safely', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const result = await safeFetchJson('/api/test');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe('Network offline');
  });
});
