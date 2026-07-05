import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const webhookConfig: OpenApiDomainConfig = {
  id: "webhook-v1-openapi",
  title: "API de Webhook — spec OpenAPI 1.3.0",
  description:
    "Spec OpenAPI oficial da API de Webhook do Open Finance Brasil, que notifica " +
    "mudanças de estado das demais APIs. 5 operações POST (type=operation): " +
    "consentNotification e pixPaymentNotification (Pagamentos), enrollmentIdNotification " +
    "(Enrollments), recurringConsentIdNotification e recurringPaymentIdNotification " +
    "(Pagamentos Automáticos); e schemas type=schema (RequestBodyWebhook, " +
    "RequestBodyWebhookEvents, EventType, Timestamp, xWebhookInteractionId). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/payments/{versionApi}/consents/{consentId}",
  specName: "webhook",
  specVersion: "1.3.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_webhook_-_open_finance_brasil/1.3.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
