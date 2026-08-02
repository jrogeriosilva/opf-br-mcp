import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheDir, isFresh, readCache, writeCache } from "./cache.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "opf-cache-"));
  process.env.XDG_CACHE_HOME = dir;
});

afterEach(() => {
  delete process.env.XDG_CACHE_HOME;
  rmSync(dir, { recursive: true, force: true });
});

describe("cache", () => {
  it("round-trip write/read com metadados", () => {
    const data = { items: [{ id: "a:b", campo: "x" }] };
    const entry = writeCache("meu-dominio", data, "0.1.0");
    expect(entry.packageVersion).toBe("0.1.0");

    const read = readCache("meu-dominio");
    expect(read).not.toBeNull();
    expect(read!.data.items).toHaveLength(1);
    expect(new Date(read!.extractedAt).getTime()).not.toBeNaN();
  });

  it("readCache devolve null para domínio sem cache", () => {
    expect(readCache("inexistente")).toBeNull();
  });

  it("isFresh respeita o TTL", () => {
    const entry = writeCache("d", { items: [] }, "0.1.0");
    expect(isFresh(entry, 24)).toBe(true);
    const daqui25h = new Date(Date.now() + 25 * 3600_000);
    expect(isFresh(entry, 24, daqui25h)).toBe(false);
  });

  it("readCache devolve null para JSON corrompido", () => {
    mkdirSync(cacheDir(), { recursive: true });
    writeFileSync(join(cacheDir(), "dominio-corrompido.json"), "{not json");
    expect(readCache("dominio-corrompido")).toBeNull();
  });

  // JSON válido com forma errada passava direto e só estourava em `data.items`,
  // no list_domains — que lê o cache de todos os domínios e portanto falhava
  // inteiro por causa de um arquivo só.
  it.each([
    ["sem data", { extractedAt: "2026-01-01T00:00:00Z", packageVersion: "0.9.0" }],
    ["data sem items", { extractedAt: "2026-01-01T00:00:00Z", packageVersion: "0.9.0", data: {} }],
    ["items não-array", { extractedAt: "2026-01-01T00:00:00Z", packageVersion: "0.9.0", data: { items: 3 } }],
    ["sem extractedAt", { packageVersion: "0.9.0", data: { items: [] } }],
    ["sem packageVersion", { extractedAt: "2026-01-01T00:00:00Z", data: { items: [] } }],
    ["não-objeto", []],
    ["null", null],
  ])("readCache devolve null para cache com forma inválida (%s)", (_caso, conteudo) => {
    const aviso = vi.spyOn(console, "error").mockImplementation(() => {});
    mkdirSync(cacheDir(), { recursive: true });
    writeFileSync(join(cacheDir(), "forma-ruim.json"), JSON.stringify(conteudo));
    expect(readCache("forma-ruim")).toBeNull();
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("forma-ruim"));
    aviso.mockRestore();
  });
});
