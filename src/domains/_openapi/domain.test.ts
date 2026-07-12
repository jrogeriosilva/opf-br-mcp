import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { createOpenApiDomain, type OpenApiDomainConfig } from "./domain.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-spec.yml", import.meta.url),
  "utf8"
);

const config: OpenApiDomainConfig = {
  id: "test-openapi",
  title: "Spec de teste",
  description: "fixture",
  pathExample: "/pix/payments",
  specName: "payments",
  specVersion: "0.0.0",
  url: "https://example.invalid/spec.yml",
  retryDelaysMs: [1],
};

const domain = createOpenApiDomain(config);

function fixtureData(): DomainData {
  return { items: parseOpenApiSpec(yamlText, "payments") };
}

describe("createOpenApiDomain", () => {
  it("propaga id, title e filtros com o pathExample", () => {
    expect(domain.id).toBe("test-openapi");
    expect(domain.title).toBe("Spec de teste");
    expect(domain.ttlHours).toBe(72);
    expect(domain.filters[0].description).toContain("/pix/payments");
  });

  it("search devolve resumos sem detail, mas com id", () => {
    const results = domain.search(fixtureData(), undefined, { method: "POST" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("payments:POST /pix/payments");
    expect(results[0]).not.toHaveProperty("detail");
  });

  it("filtro path e schema funcionam", () => {
    expect(domain.search(fixtureData(), undefined, { path: "{paymentId}" })).toHaveLength(1);
    const schemas = domain.search(fixtureData(), undefined, { schema: "pix" });
    expect(schemas.map((s) => s.name)).toEqual(["CreatePixPayment", "PixPayment"]);
  });

  it("query busca em path, summary, description e nome de schema", () => {
    const results = domain.search(fixtureData(), "consentida");
    expect(results).toHaveLength(1);
    expect(results[0].method).toBe("POST");
  });

  it("getItem devolve o item completo com detail", () => {
    const item = domain.getItem(fixtureData(), "payments:schema:CreatePixPayment");
    expect(item).not.toBeNull();
    expect(item!.detail).toHaveProperty("properties");
  });

  it("query combina termos com AND", () => {
    // path "/pix/payments" contém os dois termos
    expect(domain.search(fixtureData(), "pix payments").length).toBeGreaterThan(0);
    expect(domain.search(fixtureData(), "pix zzz-inexistente")).toEqual([]);
  });
});
