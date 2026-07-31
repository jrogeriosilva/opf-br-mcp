import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { createOpenApiDomain, type OpenApiDomainConfig } from "./domain.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-spec.yml", import.meta.url),
  "utf8"
);
const webhookYaml = readFileSync(
  new URL("../../../test/fixtures/webhook-v1-spec.yml", import.meta.url),
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

function webhookData(): DomainData {
  return { items: parseOpenApiSpec(webhookYaml, "webhook") };
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

  it("filtros response e parameter buscam pelo nome do componente", () => {
    const responses = domain.search(webhookData(), undefined, { response: "202webhook" });
    expect(responses.map((r) => r.id)).toEqual([
      "webhook:response:202Webhook",
      "webhook:response:202WebhookPayments",
    ]);
    const params = domain.search(webhookData(), undefined, { parameter: "consentid" });
    expect(params.map((p) => p.name)).toEqual(["consentId", "recurringConsentId"]);
  });

  it("filtro por nome de componente não vaza itens de outro tipo", () => {
    // "202Webhook" também aparece em refs de operações; schema não pode devolver responses
    expect(domain.search(webhookData(), undefined, { schema: "202webhook" })).toEqual([]);
    expect(domain.search(webhookData(), undefined, { response: "requestbodywebhook" })).toEqual([]);
  });

  it("query encontra o componente response e o nome real do header", () => {
    expect(domain.search(webhookData(), "202Webhook").map((r) => r.id)).toEqual([
      "webhook:response:202Webhook",
      "webhook:response:202WebhookPayments",
    ]);
    const byHeader = domain.search(webhookData(), "x-webhook-interaction-id");
    expect(byHeader.map((p) => p.id)).toContain("webhook:parameter:xWebhookInteractionId");
  });

  it("search omite refs, mas getItem devolve os ids referenciados", () => {
    const [op] = domain.search(webhookData(), undefined, { path: "/payments/{versionApi}/consents" });
    expect(op).not.toHaveProperty("refs");
    const item = domain.getItem(webhookData(), op.id)!;
    expect(item.refs).toContain("webhook:response:202Webhook");
    expect(domain.getItem(webhookData(), "webhook:response:202Webhook")).not.toBeNull();
  });

  it("query combina termos com AND", () => {
    // path "/pix/payments" contém os dois termos
    expect(domain.search(fixtureData(), "pix payments").length).toBeGreaterThan(0);
    expect(domain.search(fixtureData(), "pix zzz-inexistente")).toEqual([]);
  });
});
