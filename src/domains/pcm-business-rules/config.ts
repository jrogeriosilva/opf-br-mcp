export const pcmBusinessRulesConfig = {
  id: "pcm-business-rules",
  title: "PCM — Regras de negócio e gestão operacional",
  description:
    "Regras de negócio da PCM (Plataforma de Coleta de Métricas) do Open Finance Brasil — como funcionam reporte, " +
    "processamento, fechamento, divergências, dropReason e gestão operacional de descartes, não pareamento, qualidade " +
    "e SLAs —, extraídas das páginas funcionais e operacionais do Confluence. Cada item é uma seção (heading) da página. " +
    "Outras facetas da PCM: o swagger dos endpoints de reporte em pcm-openapi; " +
    "as tabelas de obrigatoriedade do campo additionalInfo em pcm-additional-info. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "37945356", title: "Especificação Técnica" },
    { pageId: "37945368", title: "Reporte, Processamento e Divergências" },
    { pageId: "37879861", title: "Reporte" },
    { pageId: "37912631", title: "Processamento" },
    { pageId: "37945515", title: "Manual de Integração" },
    { pageId: "1989836847", title: "Campo dropReason — Documentação Funcional para Organizações" },
    { pageId: "1212088347", title: "Reportes Descartados" },
    { pageId: "1212252161", title: "Reportes Não Pareados" },
    { pageId: "1212219393", title: "Qualidade de Dados" },
    { pageId: "1212186625", title: "SLA de Envio de Reportes - 95% até 08:00h de D+1" },
    { pageId: "1506934785", title: "SLA de Envio de Reportes - 99% até 7 dias da transação" },
    { pageId: "1558675457", title: "SLA de Envio - Estados de Pagamento - SV" },
  ],
};
