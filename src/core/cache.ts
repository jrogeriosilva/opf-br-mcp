import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DomainData } from "./types.js";

export interface CacheEntry {
  extractedAt: string;
  packageVersion: string;
  data: DomainData;
}

export function cacheDir(): string {
  const base = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  return join(base, "opf-br-mcp");
}

function cachePath(domainId: string): string {
  return join(cacheDir(), `${domainId}.json`);
}

/**
 * JSON válido não garante a forma esperada — um arquivo escrito por uma versão
 * com outro layout, ou mexido por fora, passa pelo JSON.parse e só estoura mais
 * adiante, em `entry.data.items`. Como o list_domains lê o cache de todos os
 * domínios, um único arquivo assim derrubava o catálogo inteiro.
 */
function isCacheEntry(value: unknown): value is CacheEntry {
  const entry = value as CacheEntry;
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.extractedAt === "string" &&
    typeof entry.packageVersion === "string" &&
    typeof entry.data === "object" &&
    entry.data !== null &&
    Array.isArray(entry.data.items)
  );
}

export function readCache(domainId: string): CacheEntry | null {
  const path = cachePath(domainId);
  if (!existsSync(path)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
  if (!isCacheEntry(parsed)) {
    // Tratar como cache ausente reaproveita o caminho de re-extração, mas em
    // silêncio ninguém descobre qual arquivo está ruim: o aviso vai para stderr
    // (stdout é exclusivo do JSON-RPC).
    console.error(`[opf-br-mcp] cache de ${domainId} tem forma inesperada; ignorando (${path})`);
    return null;
  }
  return parsed;
}

export function writeCache(domainId: string, data: DomainData, packageVersion: string): CacheEntry {
  const entry: CacheEntry = {
    extractedAt: new Date().toISOString(),
    packageVersion,
    data,
  };
  mkdirSync(cacheDir(), { recursive: true });
  const finalPath = cachePath(domainId);
  const tmpPath = `${finalPath}.${process.pid}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(entry));
  renameSync(tmpPath, finalPath);
  return entry;
}

export function isFresh(entry: CacheEntry, ttlHours: number, now: Date = new Date()): boolean {
  const age = now.getTime() - new Date(entry.extractedAt).getTime();
  return age < ttlHours * 3600_000;
}
