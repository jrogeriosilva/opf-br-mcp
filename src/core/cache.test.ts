import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isFresh, readCache, writeCache } from "./cache.js";

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
});
