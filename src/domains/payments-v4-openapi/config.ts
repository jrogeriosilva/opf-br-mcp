import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const paymentsConfig: OpenApiDomainConfig = {
  id: "payments-v4-openapi",
  title: "API de Pagamentos — spec OpenAPI 4.1.0",
  description:
    "Spec OpenAPI oficial da API de Iniciação de Pagamentos (Pix) do Open Finance Brasil, versão 4. " +
    "Mesma família da payments-v5-openapi (major mais recente); escolha o domínio pela versão que seu caso usa. " +
    "Itens type=operation (endpoints, um por método+path), type=schema (payloads) e os components " +
    "reutilizáveis alvos dos $ref: type=response e type=parameter. " +
    "search devolve resumos; use get_item para o nó completo da spec — nas operações o campo " +
    "`refs` traz os ids dos components referenciados, prontos para get_item.",
  pathExample: "/pix/payments",
  specName: "payments",
  specVersion: "4.1.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_payment_initiation_-_open_finance_brasil/4.1.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
