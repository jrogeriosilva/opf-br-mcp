import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-v5-spec.yml", import.meta.url),
  "utf8"
);

describe("parseOpenApiSpec (v5)", () => {
  it("gera um item por operação e por schema", () => {
    const items = parseOpenApiSpec(yamlText, "payments");
    expect(items.map((i) => i.id)).toEqual([
      "payments:POST /consents",
      "payments:GET /consents/{consentId}",
      "payments:POST /pix/payments",
      "payments:schema:CreatePaymentConsent",
      "payments:schema:CreatePixPayment",
    ]);
  });

  it("operações carregam summary e o nó completo em detail", () => {
    const post = parseOpenApiSpec(yamlText, "payments")[0];
    expect(post.type).toBe("operation");
    expect(post.method).toBe("POST");
    expect(post.summary).toBe("Criar consentimento para a iniciação de pagamento.");
    expect(post.detail).toHaveProperty("requestBody");
  });

  it("schemas carregam description, required e detail", () => {
    const items = parseOpenApiSpec(yamlText, "payments");
    const schema = items.find((i) => i.id === "payments:schema:CreatePaymentConsent")!;
    expect(schema.type).toBe("schema");
    expect(schema.required).toEqual(["data"]);
    expect(schema.detail).toHaveProperty("properties");
  });
});
