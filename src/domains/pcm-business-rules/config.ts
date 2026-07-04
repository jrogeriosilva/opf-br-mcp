export const pcmBusinessRulesConfig = {
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
