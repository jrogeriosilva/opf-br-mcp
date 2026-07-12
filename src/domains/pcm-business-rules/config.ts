export const pcmBusinessRulesConfig = {
  id: "pcm-business-rules",
  title: "PCM — Regras de negócio (Reporte, Processamento, Divergências)",
  description:
    "Regras de negócio da PCM (Plataforma de Coleta de Métricas) do Open Finance Brasil — como funcionam reporte, " +
    "processamento, fechamento e divergências —, extraídas das páginas Confluence: Especificação Técnica, Reporte, " +
    "Processamento, Divergências e Manual de Integração. Cada item é uma seção (heading) da página. " +
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
  ],
};
