import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCql, parseSearchResults } from "./parser.js";

const searchJson = JSON.parse(
  readFileSync(new URL("../../../test/fixtures/portal-search.json", import.meta.url), "utf8")
);

describe("buildCql", () => {
  it("monta o CQL com espaço e tipo page", () => {
    expect(buildCql("pix automatico", "OF")).toBe(
      'siteSearch ~ "pix automatico" AND type = page AND space = "OF"'
    );
  });

  it("escapa aspas e barras invertidas da query", () => {
    expect(buildCql('pagamento "instantâneo" a\\b', "OF")).toBe(
      'siteSearch ~ "pagamento \\"instantâneo\\" a\\\\b" AND type = page AND space = "OF"'
    );
  });
});

describe("parseSearchResults", () => {
  it("mapeia id, título, excerpt limpo, url absoluta e lastModified", () => {
    const items = parseSearchResults(searchJson, "https://x.test");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: "1282310227",
      title: "Especificações additionalInfo Descontinuadas",
      excerpt: "Planilha de additionalInfo (v20)",
      url: "https://x.test/wiki/spaces/OF/pages/1282310227/Especifica+es+additionalInfo+Descontinuadas",
      lastModified: "2025-11-18T13:52:28.000Z",
    });
  });

  it("ignora resultados sem content.id", () => {
    const ids = parseSearchResults(searchJson, "https://x.test").map((i) => i.id);
    expect(ids).toEqual(["1282310227", "873333409"]);
  });
});
