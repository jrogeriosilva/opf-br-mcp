import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export function readCache(domainId: string): CacheEntry | null {
  const path = cachePath(domainId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CacheEntry;
  } catch {
    return null;
  }
}

export function writeCache(domainId: string, data: DomainData, packageVersion: string): CacheEntry {
  const entry: CacheEntry = {
    extractedAt: new Date().toISOString(),
    packageVersion,
    data,
  };
  mkdirSync(cacheDir(), { recursive: true });
  writeFileSync(cachePath(domainId), JSON.stringify(entry));
  return entry;
}

export function isFresh(entry: CacheEntry, ttlHours: number, now: Date = new Date()): boolean {
  const age = now.getTime() - new Date(entry.extractedAt).getTime();
  return age < ttlHours * 3600_000;
}
