import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { paymentsDomain } from "./index.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-spec.yml", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return { items: parseOpenApiSpec(yamlText, "payments") };
}

describe("paymentsDomain", () => {
  it("search devolve resumos sem detail, mas com id", () => {
    const results = paymentsDomain.search(fixtureData(), undefined, { method: "POST" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("payments:POST /pix/payments");
    expect(results[0]).not.toHaveProperty("detail");
  });

  it("filtro path e schema funcionam", () => {
    expect(paymentsDomain.search(fixtureData(), undefined, { path: "{paymentId}" })).toHaveLength(1);
    const schemas = paymentsDomain.search(fixtureData(), undefined, { schema: "pix" });
    expect(schemas.map((s) => s.name)).toEqual(["CreatePixPayment", "PixPayment"]);
  });

  it("query busca em path, summary, description e nome de schema", () => {
    const results = paymentsDomain.search(fixtureData(), "consentida");
    expect(results).toHaveLength(1);
    expect(results[0].method).toBe("POST");
  });

  it("getItem devolve o item completo com detail", () => {
    const item = paymentsDomain.getItem(fixtureData(), "payments:schema:CreatePixPayment");
    expect(item).not.toBeNull();
    expect(item!.detail).toHaveProperty("properties");
  });
});
