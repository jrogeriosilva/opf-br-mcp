import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAdditionalInfoTables } from "./parser.js";

const html = readFileSync(new URL("../../../test/fixtures/pcm-page.html", import.meta.url), "utf8");

describe("parseAdditionalInfoTables", () => {
  it("extrai só as tabelas com coluna Campo", () => {
    const fields = parseAdditionalInfoTables(html);
    expect(fields).toHaveLength(2);
  });

  it("normaliza headers acentuados e divide arrays", () => {
    const [tokenId] = parseAdditionalInfoTables(html);
    expect(tokenId.campo).toBe("tokenId");
    expect(tokenId.definicao).toBe("Identificador do token");
    expect(tokenId.regraDePreenchimento).toBe("Obrigatório quando houver token");
    expect(tokenId.metodos).toEqual(["POST", "GET"]);
    expect(tokenId.endpoints).toEqual(["/pix/payments", "/consents"]);
    expect(tokenId.versoes).toEqual(["4.0.0"]);
    expect(tokenId.tamanhoMaximo).toBe("32");
    expect(tokenId.exemplo).toBe("abc123");
  });

  it("trata células vazias/travessão como null", () => {
    const [, proxy] = parseAdditionalInfoTables(html);
    expect(proxy.regraDePreenchimento).toBeNull();
    expect(proxy.exemplo).toBeNull();
  });
});
