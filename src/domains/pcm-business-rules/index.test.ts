import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { buildItems, pcmBusinessRulesDomain } from "./index.js";
import { parseSections } from "./parser.js";

const html = readFileSync(
  new URL("../../../test/fixtures/pcm-business-rules-page.html", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return {
    items: buildItems([
      { pageId: "42", title: "Processamento", url: "http://x", sections: parseSections(html) },
    ]),
  };
}

describe("pcmBusinessRulesDomain", () => {
  it("tem id pcm-business-rules", () => {
    expect(pcmBusinessRulesDomain.id).toBe("pcm-business-rules");
  });

  it("desambigua headings repetidos no id", () => {
    const ids = buildItems([
      { pageId: "42", title: "Processamento", url: "http://x", sections: parseSections(html) },
    ]).map((i) => i.id);
    expect(ids).toContain("42:processamento");
    expect(ids).toContain("42:processamento-2");
  });

  it("search devolve snippet e não o content completo", () => {
    const results = pcmBusinessRulesDomain.search(fixtureData(), undefined, { heading: "reporte" });
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("snippet");
    expect(results[0]).not.toHaveProperty("content");
  });

  it("filtro contains casa no conteúdo da seção", () => {
    const results = pcmBusinessRulesDomain.search(fixtureData(), undefined, { contains: "conciliado" });
    expect(results.map((r) => r.heading)).toContain("PAIRED");
  });

  it("getItem devolve a seção completa com content", () => {
    const paired = pcmBusinessRulesDomain.search(fixtureData(), undefined, { heading: "PAIRED" })[0];
    const item = pcmBusinessRulesDomain.getItem(fixtureData(), paired.id);
    expect(item).not.toBeNull();
    expect(item!.content).toBe("Reporte conciliado com sucesso.");
  });
});
