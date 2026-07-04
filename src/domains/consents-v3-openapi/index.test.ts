import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { consentsV3Domain } from "./index.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/consents-v3-spec.yml", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return { items: parseOpenApiSpec(yamlText, "consents") };
}

describe("consentsV3Domain", () => {
  it("tem id versionado v3", () => {
    expect(consentsV3Domain.id).toBe("consents-v3-openapi");
  });

  it("search devolve resumos sem detail, mas com id", () => {
    const results = consentsV3Domain.search(fixtureData(), undefined, { method: "DELETE" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("consents:DELETE /consents/{consentId}");
    expect(results[0]).not.toHaveProperty("detail");
  });

  it("filtro path e schema funcionam", () => {
    expect(
      consentsV3Domain.search(fixtureData(), undefined, { path: "/extends" })
    ).toHaveLength(1);
    const schemas = consentsV3Domain.search(fixtureData(), undefined, { schema: "createconsent" });
    expect(schemas.map((s) => s.name)).toContain("CreateConsent");
  });

  it("query busca em path, summary, description e nome de schema", () => {
    const results = consentsV3Domain.search(fixtureData(), "revogar");
    expect(results.some((r) => r.id === "consents:DELETE /consents/{consentId}")).toBe(true);
  });

  it("getItem devolve o item completo com detail", () => {
    const item = consentsV3Domain.getItem(fixtureData(), "consents:schema:CreateConsent");
    expect(item).not.toBeNull();
    expect(item!.detail).toHaveProperty("properties");
  });
});
