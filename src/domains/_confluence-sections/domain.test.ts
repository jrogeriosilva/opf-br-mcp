import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
});
