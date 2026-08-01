export const automaticPaymentsV2BusinessRulesConfig = {
  id: "automatic-payments-v2-business-rules",
  title: "API de Pagamentos Automáticos v2 — Regras de negócio (SV)",
  specVersion: "2.2.0",
  description:
    "Regras de negócio da API de Pagamentos Automáticos (Pix Automático e Transferências Inteligentes) versão 2.2.0 " +
    "do Open Finance Brasil, extraídas das páginas Confluence de Serviços (SV): Informações Gerais (visão geral dos " +
    "endpoints e dicionário de dados), Máquina de Estados (status do consentimento recorrente e do pagamento), " +
    "Edição do consentimento (campos editáveis e condições), Tentativas Intradia e Extradia para Pix Automático " +
    "(janelas de liquidação, retentativas, e2eID) e Adaptações para consultas de recursos entre 1.0.0 e 2.2.0. " +
    "Complementa automatic-payments-v2-openapi, que traz a spec (endpoints e schemas) da mesma versão. " +
    "O guia de implementação passo a passo do Pix Automático está em payments-implementation-guides. " +
    "Cada item é uma seção (heading) da página. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "1178042385", title: "Informações Gerais - Pagamentos Automáticos v2.2.0" },
    { pageId: "1178042440", title: "Máquina de Estados - Pagamentos Automáticos v2.2.0" },
    { pageId: "1178042534", title: "Edição do consentimento - Pagamentos Automáticos v2.2.0" },
    { pageId: "1178042550", title: "Tentativas Intradia e Extradia para Pix Automático - v2.2.0" },
    { pageId: "1178042602", title: "Adaptações para consultas de recursos entre 1.0.0 e 2.2.0" },
  ],
};
