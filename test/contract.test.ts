import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../src/core/types.js";
import { domains } from "../src/core/registry.js";
import { buildItems } from "../src/domains/pcm-additional-info/index.js";
import { parseAdditionalInfoTables } from "../src/domains/pcm-additional-info/parser.js";
import { parseOpenApiSpec } from "../src/domains/payments-openapi/parser.js";

const pcmHtml = readFileSync(new URL("./fixtures/pcm-page.html", import.meta.url), "utf8");
const paymentsYaml = readFileSync(new URL("./fixtures/payments-spec.yml", import.meta.url), "utf8");

// Todo domínio novo DEVE registrar aqui um builder de dados de fixture.
const fixtureData: Record<string, () => DomainData> = {
  "pcm-additional-info": () => ({
    items: buildItems([
      { pageId: "1", title: "Página Fixture", url: "u", fields: parseAdditionalInfoTables(pcmHtml) },
    ]),
  }),
  "payments-openapi": () => ({ items: parseOpenApiSpec(paymentsYaml, "payments") }),
};

describe.each(domains.map((d) => [d.id, d] as const))("contrato do domínio %s", (id, domain) => {
  it("tem metadados válidos", () => {
    expect(domain.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(domain.title.length).toBeGreaterThan(0);
    expect(domain.description.length).toBeGreaterThan(20);
    expect(domain.ttlHours).toBeGreaterThan(0);
    expect(domain.filters.length).toBeGreaterThan(0);
    for (const f of domain.filters) {
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it("tem fixture registrada para os testes de conformidade", () => {
    expect(fixtureData[id], `registre fixture para ${id} em test/contract.test.ts`).toBeDefined();
  });

  it("search sem argumentos devolve itens com ids únicos", () => {
    const data = fixtureData[id]();
    const results = domain.search(data);
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getItem resolve todo id devolvido por search", () => {
    const data = fixtureData[id]();
    for (const result of domain.search(data)) {
      expect(domain.getItem(data, result.id)).not.toBeNull();
    }
  });

  it("query sem correspondência devolve lista vazia", () => {
    const data = fixtureData[id]();
    expect(domain.search(data, "zzz-string-que-nao-existe-em-lugar-nenhum")).toEqual([]);
  });
});
