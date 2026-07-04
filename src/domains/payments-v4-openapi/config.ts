import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const paymentsConfig: OpenApiDomainConfig = {
  id: "payments-v4-openapi",
  title: "API de Pagamentos — spec OpenAPI 4.0.0",
  description:
    "Spec OpenAPI oficial da API de Pagamentos (Pix) do Open Finance Brasil. " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/pix/payments",
  specName: "payments",
  specVersion: "4.0.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/openapi/main/swagger-apis/payments/4.0.0.yml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
