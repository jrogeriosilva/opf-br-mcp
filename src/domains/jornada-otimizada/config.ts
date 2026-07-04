export const jornadaOtimizadaConfig = {
  id: "jornada-otimizada",
  title: "Jornada Otimizada",
  description:
    "Conhecimento regulatório da Jornada Otimizada do Open Finance Brasil, extraído das páginas " +
    "Confluence: Jornada Otimizada (introdução), Orientações Gerais, Transferências Inteligentes e " +
    "Jornada sem Redirecionamento. Cada item é uma seção (heading) da página. search devolve um " +
    "snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "1128890377", title: "Jornada Otimizada" },
    { pageId: "1129250817", title: "Orientações Gerais" },
    { pageId: "1129021472", title: "Transferências Inteligentes" },
    { pageId: "1128857617", title: "Jornada sem Redirecionamento" },
  ],
};
