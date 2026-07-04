import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { buildItems, pcmDomain } from "./index.js";
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
