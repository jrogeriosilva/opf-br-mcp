import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeCache } from "./cache.js";
import { getDomainData } from "./data.js";
import { PACKAGE_VERSION } from "./version.js";
import type { ExtractedDomain } from "./types.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "opf-data-"));
  process.env.XDG_CACHE_HOME = dir;
});

afterEach(() => {
  delete process.env.XDG_CACHE_HOME;
  rmSync(dir, { recursive: true, force: true });
});

function fakeDomain(extract: ExtractedDomain["extract"], ttlHours = 24): ExtractedDomain {
  return {
    id: "fake",
    title: "Fake",
    description: "d",
    ttlHours,
    filters: [],
    extract,
    search: (data) => data.items,
    getItem: (data, id) => data.items.find((i) => i.id === id) ?? null,
  };
}

describe("getDomainData", () => {
  it("extrai e grava cache quando não há cache", async () => {
    const extract = vi.fn().mockResolvedValue({ items: [{ id: "x" }] });
    const result = await getDomainData(fakeDomain(extract));
    expect(result.stale).toBe(false);
    expect(result.data.items).toHaveLength(1);
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it("usa cache fresco sem chamar extract", async () => {
    writeCache("fake", { items: [{ id: "cached" }] }, PACKAGE_VERSION);
    const extract = vi.fn();
    const result = await getDomainData(fakeDomain(extract));
    expect(result.data.items[0].id).toBe("cached");
    expect(extract).not.toHaveBeenCalled();
  });

  it("force=true re-extrai mesmo com cache fresco", async () => {
    writeCache("fake", { items: [{ id: "cached" }] }, PACKAGE_VERSION);
    const extract = vi.fn().mockResolvedValue({ items: [{ id: "novo" }] });
    const result = await getDomainData(fakeDomain(extract), true);
    expect(result.data.items[0].id).toBe("novo");
  });

  it("cache expirado + extract falhando → devolve stale", async () => {
    writeCache("fake", { items: [{ id: "velho" }] }, PACKAGE_VERSION);
    const extract = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await getDomainData(fakeDomain(extract, 0)); // TTL 0 = sempre expirado
    expect(result.stale).toBe(true);
    expect(result.data.items[0].id).toBe("velho");
  });

  it("cache de versão antiga do pacote é re-extraído", async () => {
    writeCache("fake", { items: [{ id: "velho" }] }, "0.0.1");
    const extract = vi.fn().mockResolvedValue({ items: [{ id: "novo" }] });
    const result = await getDomainData(fakeDomain(extract));
    expect(result.data.items[0].id).toBe("novo");
    expect(result.stale).toBe(false);
  });

  it("cache de versão antiga ainda serve como fallback stale", async () => {
    writeCache("fake", { items: [{ id: "velho" }] }, "0.0.1");
    const extract = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await getDomainData(fakeDomain(extract));
    expect(result.stale).toBe(true);
    expect(result.data.items[0].id).toBe("velho");
  });

  it("sem cache + extract falhando → lança", async () => {
    const extract = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(getDomainData(fakeDomain(extract))).rejects.toThrow("offline");
  });

  it("repassa o contexto de extração (signal/onProgress) para extract", async () => {
    const extract = vi.fn().mockResolvedValue({ items: [] });
    const ctx = { signal: new AbortController().signal, onProgress: vi.fn() };
    await getDomainData(fakeDomain(extract), true, ctx);
    expect(extract).toHaveBeenCalledWith(ctx);
  });
});
