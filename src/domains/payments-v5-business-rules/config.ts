export const paymentsV5BusinessRulesConfig = {
  id: "payments-v5-business-rules",
  title: "API de Pagamentos v5 — Regras de negócio (SV)",
  specVersion: "5.0.0",
  description:
    "Regras de negócio da API de Iniciação de Pagamentos (Pix) versão 5.0.0 do Open Finance Brasil, extraídas das " +
    "páginas Confluence de Serviços (SV): Informações Gerais (visão geral dos endpoints e dicionário de dados), " +
    "Escopo da API (formas de iniciação suportadas: Pix imediato, agendado, agendado recorrente, QR Code estático/" +
    "dinâmico, Pix Saque, Pix Troco, Pix Composto), Máquina de Estados (status do consentimento e do pagamento), " +
    "Diagrama de Sequência, Validação de informações no DICT e Adaptações para consultas de recursos entre 4.0.1 e 5.0.0. " +
    "Complementa payments-v5-openapi, que traz a spec (endpoints e schemas) da mesma versão. " +
    "Conteúdo que vale para todos os produtos de iniciação (idempotência, assinatura de payload, polling, formatos de data) " +
    "está em payments-common-rules. Cada item é uma seção (heading) da página. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "1767146135", title: "Informações Gerais - Pagamentos v5.0.0" },
    { pageId: "1767342137", title: "Escopo da API de Pagamentos - v5.0.0" },
    { pageId: "1767146236", title: "Máquina de Estados - Pagamentos v5.0.0" },
    { pageId: "1767146164", title: "Diagrama de Sequência - Pagamentos v5.0.0" },
    { pageId: "1767146321", title: "Validação de informações no DICT - Pagamentos v5.0.0" },
    { pageId: "1861353753", title: "Adaptações para consultas de recursos entre 4.0.1 e 5.0.0" },
  ],
};
