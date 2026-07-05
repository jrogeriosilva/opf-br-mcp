import { isFresh, readCache, writeCache } from "./cache.js";
import type { Domain, DomainData, ExtractContext } from "./types.js";
import { PACKAGE_VERSION } from "./version.js";

export interface DomainDataResult {
  data: DomainData;
  extractedAt: string;
  /** true = a extração falhou e estamos servindo cache expirado. */
  stale: boolean;
}

export async function getDomainData(
  domain: Domain,
  force = false,
  ctx?: ExtractContext
): Promise<DomainDataResult> {
  const cached = readCache(domain.id);
  if (
    !force &&
    cached &&
    cached.packageVersion === PACKAGE_VERSION &&
    isFresh(cached, domain.ttlHours)
  ) {
    return { data: cached.data, extractedAt: cached.extractedAt, stale: false };
  }
  try {
    const data = await domain.extract(ctx);
    const entry = writeCache(domain.id, data, PACKAGE_VERSION);
    return { data, extractedAt: entry.extractedAt, stale: false };
  } catch (err) {
    if (cached) {
      return { data: cached.data, extractedAt: cached.extractedAt, stale: true };
    }
    throw err;
  }
}
