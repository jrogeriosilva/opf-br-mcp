export const paymentsImplementationGuidesConfig = {
  id: "payments-implementation-guides",
  title: "Iniciação de Pagamentos — Guias de Implementação (SV)",
  description:
    "Guias de implementação da Iniciação de Pagamentos do Open Finance Brasil, extraídos das páginas Confluence de " +
    "Serviços (SV). São documentos longos, orientados a jornada, que descrevem regras de negócio, fluxos e casos de " +
    "uso ponta a ponta: Pix Automático (consentimento com/sem pagamento inicial, edição, revogação, ciclos de " +
    "cobrança e retentativas), Agendamento Recorrente, Transferências Inteligentes e Liquidação de QR Codes via API " +
    "Pagamentos (QR estático, dinâmico, Pix Saque/Troco). Seguem versionamento próprio, independente da versão da API. " +
    "Para as regras normativas por versão de API veja payments-v5-business-rules, " +
    "automatic-payments-v2-business-rules e enrollments-v2-business-rules. " +
    "Cuidado: o domínio jornada-otimizada tem uma página homônima de Transferências Inteligentes, com outro recorte " +
    "(Jornada Otimizada); aqui o foco é o guia de implementação do produto. " +
    "Cada item é uma seção (heading) da página. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "1217527809", title: "Pix Automático" },
    { pageId: "213876817", title: "Agendamento Recorrente" },
    { pageId: "628195902", title: "Transferências Inteligentes" },
    { pageId: "1836744705", title: "Liquidação de QR Codes via API Pagamentos" },
  ],
};
