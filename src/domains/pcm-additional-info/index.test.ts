import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { buildItems, definicaoSnippet, pcmDomain } from "./index.js";
import { parseAdditionalInfoTables } from "./parser.js";

const html = readFileSync(new URL("../../../test/fixtures/pcm-page.html", import.meta.url), "utf8");

function fixtureData(): DomainData {
  const fields = parseAdditionalInfoTables(html);
  return {
    items: buildItems([
      {
        pageId: "1621622796",
        title: "Iniciação de Pagamentos",
        url: "https://example.test/pcm",
        fields,
      },
    ]),
  };
}

describe("pcmDomain", () => {
  it("gera ids estáveis pageId:slug-do-campo", () => {
    const data = fixtureData();
    expect(data.items.map((i) => i.id)).toEqual([
      "1621622796:tokenid",
      "1621622796:proxy",
    ]);
  });

  it("filtro field faz match exato case-insensitive", () => {
    const results = pcmDomain.search(fixtureData(), undefined, { field: "TOKENID" });
    expect(results).toHaveLength(1);
    expect(results[0].campo).toBe("tokenId");
  });

  it("filtros endpoint e method combinam em AND", () => {
    expect(
      pcmDomain.search(fixtureData(), undefined, { endpoint: "/consents", method: "GET" })
    ).toHaveLength(1);
    expect(
      pcmDomain.search(fixtureData(), undefined, { endpoint: "/consents", method: "DELETE" })
    ).toHaveLength(0);
  });

  it("query busca substring em campo/definicao/regra", () => {
    const results = pcmDomain.search(fixtureData(), "chave pix");
    expect(results).toHaveLength(1);
    expect(results[0].campo).toBe("proxy");
  });

  it("getItem resolve id devolvido pelo search", () => {
    const data = fixtureData();
    const [first] = pcmDomain.search(data, undefined, { field: "proxy" });
    expect(pcmDomain.getItem(data, first.id)?.campo).toBe("proxy");
    expect(pcmDomain.getItem(data, "nao-existe")).toBeNull();
  });
});

describe("definicaoSnippet", () => {
  it("mantém texto curto sem reticências", () => {
    expect(definicaoSnippet("Texto curto", 120)).toBe("Texto curto");
  });

  it("trunca em fronteira de palavra e adiciona reticências", () => {
    const long = "palavra ".repeat(30).trim(); // 239 chars
    const s = definicaoSnippet(long, 120);
    expect(s.endsWith("…")).toBe(true);
    expect(s.length).toBeLessThanOrEqual(121); // 120 + reticências
    expect(s).not.toContain("  ");
    // não corta no meio de uma palavra
    expect(s.slice(0, -1).trimEnd().endsWith("palavra")).toBe(true);
  });
});

describe("pcmDomain summary mode", () => {
  it("search omite campos pesados e inclui definicaoSnippet", () => {
    const results = pcmDomain.search(fixtureData(), undefined, { field: "tokenId" });
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r).toHaveProperty("campo", "tokenId");
    expect(r).toHaveProperty("id");
    expect(r).toHaveProperty("definicaoSnippet");
    expect(r).toHaveProperty("versoes");
    expect(r).toHaveProperty("roles");
    expect(r).toHaveProperty("page");
    expect(r).not.toHaveProperty("regraDePreenchimento");
    expect(r).not.toHaveProperty("exemplo");
    expect(r).not.toHaveProperty("dominio");
    expect(r).not.toHaveProperty("endpoints");
  });

  it("getItem devolve o registro completo", () => {
    const data = fixtureData();
    const [s] = pcmDomain.search(data, undefined, { field: "tokenId" });
    const full = pcmDomain.getItem(data, s.id)!;
    expect(full).toHaveProperty("regraDePreenchimento");
    expect(full).toHaveProperty("endpoints");
    expect(full).toHaveProperty("exemplo");
  });

  it("filtra por endpoint mesmo com endpoints fora do resumo", () => {
    const results = pcmDomain.search(fixtureData(), undefined, { endpoint: "/consents" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).not.toHaveProperty("endpoints");
  });
});
