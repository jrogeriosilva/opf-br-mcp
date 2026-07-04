import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/consents-v3-spec.yml", import.meta.url),
  "utf8"
);

describe("parseOpenApiSpec (consents v3)", () => {
  it("gera as 5 operações da API Consents com ids estáveis", () => {
    const ops = parseOpenApiSpec(yamlText, "consents").filter((i) => i.type === "operation");
    expect(ops.map((i) => i.id)).toEqual([
      "consents:POST /consents",
      "consents:GET /consents/{consentId}",
      "consents:DELETE /consents/{consentId}",
      "consents:GET /consents/{consentId}/extensions",
      "consents:POST /consents/{consentId}/extends",
    ]);
  });

  it("gera os 24 schemas incluindo CreateConsent e ResponseConsent", () => {
    const schemas = parseOpenApiSpec(yamlText, "consents").filter((i) => i.type === "schema");
    expect(schemas).toHaveLength(24);
    expect(schemas.map((s) => s.name)).toContain("CreateConsent");
    expect(schemas.map((s) => s.name)).toContain("ResponseConsent");
  });

  it("operações carregam summary, method e o nó completo em detail", () => {
    const post = parseOpenApiSpec(yamlText, "consents").find(
      (i) => i.id === "consents:POST /consents"
    )!;
    expect(post.type).toBe("operation");
    expect(post.method).toBe("POST");
    expect(post.summary).toBe("Criar novo pedido de consentimento.");
    expect(post.detail).toHaveProperty("requestBody");
  });
});
