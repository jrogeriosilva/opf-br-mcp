export const mqdConfig = {
  id: "mqd",
  title: "Motor de Qualidade de Dados (MQD)",
  description:
    "Conhecimento regulatório do Motor de Qualidade de Dados (MQD) do Open Finance Brasil, " +
    "extraído das páginas Confluence: Especificação Técnica, Arquitetura, Documentação da API, " +
    "Manual de Instalação, Tabela de Endpoints Validados, FAQ e Troubleshooting. Cada item é uma " +
    "seção (heading) de uma página. search devolve um snippet do conteúdo; use get_item para o " +
    "texto completo da seção. A spec OpenAPI do MQD está incluída como conteúdo da seção da página " +
    "Documentação da API.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "362578617", title: "Especificação Técnica" },
    { pageId: "362578657", title: "Arquitetura" },
    { pageId: "362578918", title: "Documentação da API" },
    { pageId: "362578967", title: "Manual de Instalação" },
    { pageId: "619413971", title: "Tabela de Endpoints Validados" },
    { pageId: "362579143", title: "FAQ" },
    { pageId: "362579195", title: "Troubleshooting" },
  ],
};
