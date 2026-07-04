import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const automaticPaymentsV2Config: OpenApiDomainConfig = {
  id: "automatic-payments-v2-openapi",
  title: "API de Pagamentos Automáticos (Automatic Payments) — spec OpenAPI 2.2.0",
  description:
    "Spec OpenAPI oficial da API de Automatic Payments do Open Finance Brasil, versão 2. " +
    "Cobre a iniciação de pagamentos automáticos (Pix Automático e Transferências Inteligentes) mediante consentimento recorrente. " +
    "Endpoints /recurring-consents (criação, consulta e edição/revogação) e /pix/recurring-payments (criação, retry, consulta e cancelamento); scope recurring-payments. " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/pix/recurring-payments",
  specName: "automatic-payments",
  specVersion: "2.2.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_automatic_payments_-_open_finance_brasil/2.2.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
