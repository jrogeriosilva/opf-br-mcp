import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACKAGE_VERSION } from "./version.js";

function readJson(relative: string): { version?: string; packages?: Record<string, { version?: string }> } {
  return JSON.parse(readFileSync(new URL(relative, import.meta.url), "utf8"));
}

describe("versão do pacote", () => {
  const pkg = readJson("../../package.json");
  const lock = readJson("../../package-lock.json");

  it("PACKAGE_VERSION acompanha o package.json", () => {
    expect(PACKAGE_VERSION).toBe(pkg.version);
  });

  it("package-lock.json está sincronizado com o package.json", () => {
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages?.[""]?.version).toBe(pkg.version);
  });
});
