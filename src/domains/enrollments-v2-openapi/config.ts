import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const enrollmentsV2Config: OpenApiDomainConfig = {
  id: "enrollments-v2-openapi",
  title: "API de Vínculo de Dispositivo (Enrollments) — spec OpenAPI 2.2.0",
  description:
    "Spec OpenAPI oficial da API de Enrollments (Vínculo de Dispositivo) do Open Finance Brasil, versão 2. " +
    "Cobre o pagamento sem redirecionamento: vínculo de dispositivos (FIDO), autorização de consentimentos e Pix Automático. " +
    "Endpoints /enrollments, /consents/{consentId}/authorise e /recurring-consents/{recurringConsentId}/authorise. " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/enrollments",
  specName: "enrollments",
  specVersion: "2.2.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_enrollments_for_payment_initiation_-_open_finance_brasil/2.2.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
