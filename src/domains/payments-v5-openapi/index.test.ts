import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { paymentsV5Domain } from "./index.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-v5-spec.yml", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return { items: parseOpenApiSpec(yamlText, "payments") };
}

describe("paymentsV5Domain", () => {
  it("tem id versionado v5", () => {
    expect(paymentsV5Domain.id).toBe("payments-v5-openapi");
  });

  it("search devolve resumos sem detail, mas com id", () => {
    const results = paymentsV5Domain.search(fixtureData(), undefined, { method: "GET" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("payments:GET /consents/{consentId}");
    expect(results[0]).not.toHaveProperty("detail");
  });

  it("filtro path e schema funcionam", () => {
    expect(paymentsV5Domain.search(fixtureData(), undefined, { path: "{consentId}" })).toHaveLength(1);
    const schemas = paymentsV5Domain.search(fixtureData(), undefined, { schema: "pix" });
    expect(schemas.map((s) => s.name)).toEqual(["CreatePixPayment"]);
  });

  it("query busca em path, summary, description e nome de schema", () => {
    const results = paymentsV5Domain.search(fixtureData(), "consentida");
    expect(results).toHaveLength(1);
    expect(results[0].method).toBe("POST");
  });

  it("getItem devolve o item completo com detail", () => {
    const item = paymentsV5Domain.getItem(fixtureData(), "payments:schema:CreatePixPayment");
    expect(item).not.toBeNull();
    expect(item!.detail).toHaveProperty("properties");
  });
});
