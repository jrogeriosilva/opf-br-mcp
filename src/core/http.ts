export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  retryDelaysMs: number[];
  headers?: Record<string, string>;
  /** Cancelamento externo (ex.: abort do cliente MCP); interrompe tentativas e requests em voo. */
  signal?: AbortSignal;
}

export async function fetchWithRetry(url: string, opts: RetryOptions): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= opts.retryDelaysMs.length; attempt++) {
    if (opts.signal?.aborted) break;
    if (attempt > 0) await sleep(opts.retryDelaysMs[attempt - 1]);
    const timeout = AbortSignal.timeout(30_000);
    const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
    try {
      const response = await fetch(url, { headers: opts.headers, signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error(`requisição cancelada: ${url}`);
}
