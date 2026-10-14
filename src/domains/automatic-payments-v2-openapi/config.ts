import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const automaticPaymentsV2Config: OpenApiDomainConfig = {
  id: "automatic-payments-v2-openapi",
  title: "API de Pagamentos Automáticos (Automatic Payments) — spec OpenAPI 2.2.1",
  description:
    "Spec OpenAPI oficial da API de Automatic Payments do Open Finance Brasil, versão 2.2.1. " +
    "Cobre a iniciação de pagamentos automáticos (Pix Automático e Transferências Inteligentes) mediante consentimento recorrente. " +
    "Endpoints /recurring-consents (criação, consulta e edição/revogação) e /pix/recurring-payments (criação, retry, consulta e cancelamento); scope recurring-payments. " +
    "Regras de negócio da mesma versão em automatic-payments-v2-business-rules. " +
    "Itens type=operation (endpoints, um por método+path), type=schema (payloads) e os components " +
    "reutilizáveis alvos dos $ref: type=response, type=parameter e type=header. " +
    "search devolve resumos; use get_item para o nó completo da spec — nas operações o campo " +
    "`refs` traz os ids dos components referenciados, prontos para get_item.",
  pathExample: "/pix/recurring-payments",
  specName: "automatic-payments",
  specVersion: "2.2.1",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_automatic_payments_-_open_finance_brasil/2.2.1.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
