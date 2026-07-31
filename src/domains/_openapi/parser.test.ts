import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-spec.yml", import.meta.url),
  "utf8"
);
const webhookYaml = readFileSync(
  new URL("../../../test/fixtures/webhook-v1-spec.yml", import.meta.url),
  "utf8"
);
const consentsYaml = readFileSync(
  new URL("../../../test/fixtures/consents-v3-spec.yml", import.meta.url),
  "utf8"
);
const paymentsV5Yaml = readFileSync(
  new URL("../../../test/fixtures/payments-v5-spec.yml", import.meta.url),
  "utf8"
);

describe("parseOpenApiSpec", () => {
  it("gera um item por operação e por schema", () => {
    const items = parseOpenApiSpec(yamlText, "payments");
    expect(items.map((i) => i.id)).toEqual([
      "payments:POST /pix/payments",
      "payments:GET /pix/payments/{paymentId}",
      "payments:schema:CreatePixPayment",
      "payments:schema:PixPayment",
    ]);
  });

  it("operações carregam summary e o nó completo em detail", () => {
    const post = parseOpenApiSpec(yamlText, "payments")[0];
    expect(post.type).toBe("operation");
    expect(post.method).toBe("POST");
    expect(post.summary).toBe("Criar iniciação de pagamento");
    expect(post.detail).toHaveProperty("requestBody");
  });

  it("schemas carregam description, required e detail", () => {
    const items = parseOpenApiSpec(yamlText, "payments");
    const schema = items.find((i) => i.id === "payments:schema:CreatePixPayment")!;
    expect(schema.type).toBe("schema");
    expect(schema.required).toEqual(["data"]);
    expect(schema.detail).toHaveProperty("properties");
  });

  it("indexa components.responses e components.parameters", () => {
    const items = parseOpenApiSpec(webhookYaml, "webhook");
    const response = items.find((i) => i.id === "webhook:response:202Webhook")!;
    expect(response.type).toBe("response");
    expect(response.name).toBe("202Webhook");
    expect(response.description).toBe("Requisição aceita para processamento posterior.");
    expect(response.detail).toHaveProperty("headers");

    const parameter = items.find(
      (i) => i.id === "webhook:parameter:EnrollmentxWebhookInteractionId"
    )!;
    expect(parameter.type).toBe("parameter");
    // a chave do componente (usada no $ref) difere do nome real do header
    expect(parameter.paramName).toBe("x-webhook-interaction-id");
    expect(parameter.in).toBe("header");
    expect(parameter.required).toBe(true);
  });

  it("operações listam em refs os ids dos components que referenciam", () => {
    const items = parseOpenApiSpec(webhookYaml, "webhook");
    const op = items.find(
      (i) => i.id === "webhook:POST /payments/{versionApi}/consents/{consentId}"
    )!;
    expect(op.refs).toEqual([
      "webhook:parameter:consentId",
      "webhook:parameter:versionApi",
      "webhook:parameter:xWebhookInteractionId",
      "webhook:schema:RequestBodyWebhook",
      "webhook:response:202Webhook",
    ]);
  });

  it("refs só contém ids resolvíveis por getItem, sem auto-referência", () => {
    const items = parseOpenApiSpec(consentsYaml, "consents");
    const ids = new Set(items.map((i) => i.id));
    for (const item of items) {
      for (const ref of item.refs as string[]) {
        expect(ids.has(ref)).toBe(true);
        expect(ref).not.toBe(item.id);
      }
    }
    // a cadeia operação → response → schema fica navegável
    const response = items.find((i) => i.id === "consents:response:BadRequest")!;
    expect(response.refs).toContain("consents:schema:ResponseError");
  });

  it("indexa components.headers, referenciados de dentro de um response", () => {
    const items = parseOpenApiSpec(paymentsV5Yaml, "payments");
    const op = items.find((i) => i.id === "payments:POST /consents")!;
    expect(op.refs).toContain("payments:response:201PaymentsConsentsConsentCreated");

    const response = items.find(
      (i) => i.id === "payments:response:201PaymentsConsentsConsentCreated"
    )!;
    expect(response.refs).toEqual(["payments:header:X-V"]);

    const header = items.find((i) => i.id === "payments:header:X-V")!;
    expect(header.type).toBe("header");
    expect(header.required).toBe(true);
    expect(header.refs).toEqual(["payments:schema:X-V"]);
  });
});
