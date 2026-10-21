/**
 * Defensive JSON fetch helper that verifies Content-Type before parsing.
 * Prevents HTML fallback pages (e.g. 404/405/502/SPA redirects) from throwing
 * unhandled SyntaxError: Unexpected token '<'.
 */

export interface SafeFetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    if (!isJson) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Expected JSON but received ${contentType || 'non-JSON'} (HTTP ${res.status})`,
      };
    }

    const data = (await res.json()) as T;

    if (!res.ok) {
      const serverMessage =
        data &&
        typeof data === 'object' &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : `HTTP ${res.status}`;
      return {
        ok: false,
        status: res.status,
        data,
        error: serverMessage,
      };
    }

    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
