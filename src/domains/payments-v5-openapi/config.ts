import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const paymentsV5Config: OpenApiDomainConfig = {
  id: "payments-v5-openapi",
  title: "API de Pagamentos — spec OpenAPI 5.0.0",
  description:
    "Spec OpenAPI oficial da API de Iniciação de Pagamentos (Pix) do Open Finance Brasil, versão 5. " +
    "Inclui endpoints de consentimento (/consents) e de pagamento (/pix/payments). " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/pix/payments",
  specName: "payments",
  specVersion: "5.0.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_payment_initiation_-_open_finance_brasil/5.0.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
