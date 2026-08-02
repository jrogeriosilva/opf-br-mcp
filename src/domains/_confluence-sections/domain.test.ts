import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DomainData } from "../../core/types.js";
import {
  buildItems,
  createConfluenceSectionsDomain,
  type ConfluenceSectionsConfig,
} from "./domain.js";
import { parseSections } from "./parser.js";

const html = readFileSync(
  new URL("../../../test/fixtures/pcm-business-rules-page.html", import.meta.url),
  "utf8"
);

const testConfig: ConfluenceSectionsConfig = {
  id: "test-sections",
  title: "Domínio de teste",
  description: "Config de teste para a fábrica de seções Confluence.",
  confluenceBaseUrl: "http://x",
  interRequestDelayMs: 0,
  retryDelaysMs: [],
  pages: [],
};

const domain = createConfluenceSectionsDomain(testConfig);

function fixtureData(): DomainData {
  return {
    items: buildItems([
      { pageId: "42", title: "Processamento", url: "http://x", sections: parseSections(html) },
    ]),
  };
}

describe("createConfluenceSectionsDomain", () => {
  it("usa o id do config", () => {
    expect(domain.id).toBe("test-sections");
  });

  it("desambigua headings repetidos no id", () => {
    const ids = buildItems([
      { pageId: "42", title: "Processamento", url: "http://x", sections: parseSections(html) },
    ]).map((i) => i.id);
    expect(ids).toContain("42:processamento");
    expect(ids).toContain("42:processamento-2");
  });

  it("search devolve snippet e não o content completo", () => {
    const results = domain.search(fixtureData(), undefined, { heading: "reporte" });
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("snippet");
    expect(results[0]).not.toHaveProperty("content");
  });

  it("filtro contains casa no conteúdo da seção", () => {
    const results = domain.search(fixtureData(), undefined, { contains: "conciliado" });
    expect(results.map((r) => r.heading)).toContain("PAIRED");
  });

  it("getItem devolve a seção completa com content", () => {
    const paired = domain.search(fixtureData(), undefined, { heading: "PAIRED" })[0];
    const item = domain.getItem(fixtureData(), paired.id);
    expect(item).not.toBeNull();
    expect(item!.content).toBe("Reporte conciliado com sucesso.");
  });

  it("trunca o snippet de conteúdo longo mas getItem devolve o content completo", () => {
    const data: DomainData = {
      items: buildItems([
        {
          pageId: "99",
          title: "Longa",
          url: "http://x",
          sections: [{ heading: "Longa", level: 2, content: "x".repeat(250) }],
        },
      ]),
    };
    const results = domain.search(data, undefined, { heading: "Longa" });
    expect(results).toHaveLength(1);
    const snippet = (results[0] as unknown as { snippet: string }).snippet;
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(201);

    const item = domain.getItem(data, results[0].id);
    expect(item).not.toBeNull();
    expect(item!.content).toBe("x".repeat(250));
    expect(item!.content).not.toContain("…");
  });

  it("filtro page casa no título da página e retorna vazio quando não casa", () => {
    const matches = domain.search(fixtureData(), undefined, { page: "Processamento" });
    expect(matches.length).toBeGreaterThan(0);
    const noMatch = domain.search(fixtureData(), undefined, { page: "Inexistente" });
    expect(noMatch).toEqual([]);
  });

  it("query ignora acentos e combina termos com AND", () => {
    const data: DomainData = {
      items: buildItems([
        {
          pageId: "7",
          title: "Página",
          url: "http://x",
          sections: [
            { heading: "Vínculo de Dispositivo", level: 2, content: "Regras de vínculo por aproximação." },
            { heading: "Outra seção", level: 2, content: "Nada relacionado." },
          ],
        },
      ]),
    };
    expect(domain.search(data, "vinculo dispositivo")).toHaveLength(1);
    expect(domain.search(data, "vinculo inexistente")).toEqual([]);
    expect(domain.search(data, undefined, { heading: "vinculo" })).toHaveLength(1);
  });
});

// A checagem de abort ficava ANTES da espera entre páginas, então um
// cancelamento durante o intervalo só era percebido depois de disparar a página
// seguinte. Invertida a ordem, tem que parar sem buscar a próxima.
describe("cancelamento durante o intervalo entre páginas", () => {
  afterEach(() => vi.unstubAllGlobals());

  const tresPaginas: ConfluenceSectionsConfig = {
    ...testConfig,
    interRequestDelayMs: 5000,
    pages: [
      { pageId: "1", title: "Um" },
      { pageId: "2", title: "Dois" },
      { pageId: "3", title: "Três" },
    ],
  };

  function stubOk() {
    const spy = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ title: "T", body: { view: { value: html } }, _links: { webui: "/p" } }),
    }));
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  it("para na página em curso, sem buscar a próxima, e não espera o intervalo inteiro", async () => {
    const spy = stubOk();
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 50);
    const t0 = Date.now();

    await expect(
      createConfluenceSectionsDomain(tresPaginas).extract({ signal: ac.signal })
    ).rejects.toThrow(/cancelada/);

    expect(spy).toHaveBeenCalledTimes(1); // só a página 1; a 2 nunca é buscada
    expect(Date.now() - t0).toBeLessThan(1000); // antes dormiria os 5000ms
  });

  it("sem cancelamento, percorre todas as páginas na ordem", async () => {
    const spy = stubOk();
    const data = await createConfluenceSectionsDomain({
      ...tresPaginas,
      interRequestDelayMs: 0,
    }).extract();
    expect(spy).toHaveBeenCalledTimes(3);
    expect([...new Set(data.items.map((i) => String(i.id).split(":")[0]))]).toEqual(["1", "2", "3"]);
  });
});
