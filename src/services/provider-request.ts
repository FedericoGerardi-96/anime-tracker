import 'server-only';

export class ProviderRequestError extends Error {
  constructor(public provider: string, public status: number, public retryAfterMs = 0) {
    super(`${provider}: ${status === 429 ? 'límite de solicitudes' : `consulta fallida (${status})`}`);
    this.name = 'ProviderRequestError';
  }
}

// Only use for reads: replaying a mutation after a timeout can duplicate a change.
export async function providerRead<T>(provider: string, operation: string, url: string | URL, init: RequestInit & { next?: { revalidate: number } }): Promise<T> {
  const requestId = crypto.randomUUID();
  for (let attempt = 1; attempt <= 3; attempt++) {
    const started = Date.now();
    let remaining: string | null = null;
    try {
      const options = attempt === 1 ? init : { ...init, next: undefined, cache: 'no-store' as const };
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(7000) });
      remaining = response.headers.get('x-ratelimit-remaining');
      const payload = await response.json().catch(() => null);
      const graphError = payload?.errors?.[0];
      const status = response.ok ? (graphError ? Number(graphError.status) || 400 : payload === null ? 502 : 0) : response.status;
      if (status) {
        const after = response.headers.get('retry-after');
        const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
        const wait = after ? (/^\d+$/.test(after) ? Number(after) * 1000 : Date.parse(after) - Date.now()) : reset - Date.now();
        throw new ProviderRequestError(provider, status, status === 429 ? Math.max(1000, Number.isFinite(wait) && wait > 0 ? wait : 60000) : Math.max(0, Number.isFinite(wait) ? wait : 0));
      }
      if (attempt > 1) console.info('[provider-read]', { requestId, provider, operation, attempt, outcome: 'recovered' });
      return payload as T;
    } catch (cause) {
      const error = cause instanceof ProviderRequestError ? cause : new ProviderRequestError(provider, 0);
      const transient = error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
      const delay = Math.max(350 * 2 ** (attempt - 1) + Math.random() * 150, error.retryAfterMs);
      const retry = transient && attempt < 3 && delay <= 2000;
      console.warn('[provider-read]', { requestId, provider, operation, attempt, status: error.status, durationMs: Date.now() - started, remaining, retryAfterMs: error.retryAfterMs, retry, cause: cause instanceof Error ? cause.name : 'unknown' });
      if (!retry) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new ProviderRequestError(provider, 0);
}
