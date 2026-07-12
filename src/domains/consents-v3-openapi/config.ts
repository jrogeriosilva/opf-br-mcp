import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const consentsV3Config: OpenApiDomainConfig = {
  id: "consents-v3-openapi",
  title: "API de Consentimentos — spec OpenAPI 3.3.1",
  description:
    "Spec OpenAPI oficial da API de Consentimentos de compartilhamento de dados (Dados Cadastrais e Transacionais) do Open Finance Brasil, versão 3.3.1. " +
    "É o consentimento de dados — não cobre consentimento de pagamento, que fica em payments-v4/v5-openapi (/consents) e automatic-payments-v2-openapi (/recurring-consents). " +
    "Cobre criação (POST /consents), consulta (GET /consents/{consentId}), revogação (DELETE /consents/{consentId}), " +
    "renovação (POST /consents/{consentId}/extends) e histórico de renovações (GET /consents/{consentId}/extensions). " +
    "Itens type=operation (um por método+path) e type=schema (payloads, ex.: CreateConsent, ResponseConsent, LoggedUser, BusinessEntity). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/consents/{consentId}",
  specName: "consents",
  specVersion: "3.3.1",
  url: "https://openbanking-brasil.github.io/openapi/swagger-apis/consents/3.3.1.yml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
