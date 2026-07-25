export const paymentsCommonRulesConfig = {
  id: "payments-common-rules",
  title: "Iniciação de Pagamentos — Conteúdo comum entre os produtos (SV)",
  description:
    "Regras que valem para todos os produtos de Iniciação de Pagamentos do Open Finance Brasil (Pagamentos, " +
    "Pagamentos Automáticos e Vínculo de Dispositivo), independentes de versão da API, extraídas das páginas " +
    "Confluence de Serviços (SV): conceitos e atores da iniciação (detentora de conta, iniciadora de transação de " +
    "pagamento, iniciação pelo recebedor), Idempotência, Assinatura de Mensagem vs Idempotência, Como Assinar o " +
    "Payload (JWS, claims, validação), Convenções de formatação e fuso horário de campos de data e hora, e " +
    "Recomendação de Uso de Polling e Controle de Acesso. " +
    "Regras específicas de cada API estão em payments-v5-business-rules, automatic-payments-v2-business-rules e " +
    "enrollments-v2-business-rules. Cada item é uma seção (heading) da página. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "17375910", title: "Iniciação de Pagamentos - conceitos e atores" },
    { pageId: "728301590", title: "Idempotência" },
    { pageId: "728301669", title: "Assinatura de Mensagem vs Idempotência" },
    { pageId: "728301632", title: "Como Assinar o Payload" },
    { pageId: "728301690", title: "Convenções de formatação e fuso horário de campos de data e hora" },
    { pageId: "728301611", title: "Recomendação Uso de Polling e Controle de Acesso" },
  ],
};
