import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { buildItems, limitesPorEndpointDomain as domain } from "./index.js";
import { parseEndpointLimits } from "./parser.js";

const html = readFileSync(
  new URL("../../../test/fixtures/limites-por-endpoint-page.html", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return {
    items: buildItems(
      { pageId: "17957025", title: "Referência", url: "u" },
      parseEndpointLimits(html)
    ),
  };
}

describe("limitesPorEndpointDomain", () => {
  it("gera ids estáveis por família + verbo + rota", () => {
    expect(fixtureData().items.map((i) => i.id)).toEqual([
      "17957025:dc-api-recursos-get-resources",
      "17957025:dc-api-contas-get-accounts",
      "17957025:dc-api-contas-get-accounts-accountid-balances",
    ]);
  });

  // Regressão do zero-width space: sem a limpeza no parser, a rota indexada
  // teria caracteres invisíveis e este filtro devolveria zero resultados.
  it("filtra por rota com chaves e barras, incluindo a que vinha com zero-width space", () => {
    const results = domain.search(fixtureData(), undefined, {
      endpoint: "/accounts/{accountId}/balances",
    });
    expect(results).toHaveLength(1);
    expect(results[0].slaMs).toBe("1500");
  });

  it("filtros api e method combinam em AND e ignoram acento e caixa", () => {
    expect(
      domain.search(fixtureData(), undefined, { api: "recursos", method: "get" })
    ).toHaveLength(1);
    expect(
      domain.search(fixtureData(), undefined, { api: "recursos", method: "POST" })
    ).toHaveLength(0);
  });

  it("filtro frequencia casa por substring, tolerando Média-Alta vs Média-alta", () => {
    expect(domain.search(fixtureData(), undefined, { frequencia: "alta" })).toHaveLength(2);
    expect(domain.search(fixtureData(), undefined, { frequencia: "baixa" })).toHaveLength(1);
  });

  it("getItem resolve id devolvido pelo search e devolve null para id inexistente", () => {
    const data = fixtureData();
    const [first] = domain.search(data, undefined, { endpoint: "/resources" });
    expect(domain.getItem(data, first.id)?.tps).toBe("300");
    expect(domain.getItem(data, "nao-existe")).toBeNull();
  });
});
