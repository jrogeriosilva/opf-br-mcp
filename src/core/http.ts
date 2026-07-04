export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  retryDelaysMs: number[];
  headers?: Record<string, string>;
}

export async function fetchWithRetry(url: string, opts: RetryOptions): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= opts.retryDelaysMs.length; attempt++) {
    if (attempt > 0) await sleep(opts.retryDelaysMs[attempt - 1]);
    try {
      const response = await fetch(url, { headers: opts.headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error(`fetch failed: ${url}`);
}
