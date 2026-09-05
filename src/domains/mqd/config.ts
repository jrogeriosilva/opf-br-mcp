export const mqdConfig = {
  id: "mqd",
  title: "Motor de Qualidade de Dados (MQD)",
  description:
    "Conhecimento regulatório do Motor de Qualidade de Dados (MQD) do Open Finance Brasil, " +
    "extraído das páginas Confluence de especificação técnica, arquitetura (incluindo proxy reverso " +
    "e fluxos de envio de resultados, atualização de configuração, validação e receptora), " +
    "documentação da API, instalação, endpoints validados, FAQ e troubleshooting. Cada item é uma " +
    "seção (heading) de uma página. search devolve um snippet do conteúdo; use get_item para o " +
    "texto completo da seção. A spec OpenAPI do MQD está incluída como conteúdo da seção da página " +
    "Documentação da API.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "362578617", title: "Especificação Técnica" },
    { pageId: "362578657", title: "Arquitetura" },
    { pageId: "362578698", title: "MQD - Proxy reverso" },
    { pageId: "362578754", title: "MQD - Fluxo de Envio de Resultados" },
    { pageId: "362578786", title: "MQD - Fluxo de Atualização de Configuração" },
    { pageId: "362578818", title: "MQD - Fluxo de Validação" },
    { pageId: "362578884", title: "MQD - Fluxo da Receptora" },
    { pageId: "362578918", title: "Documentação da API" },
    { pageId: "362578967", title: "Manual de Instalação" },
    { pageId: "619413971", title: "Tabela de Endpoints Validados" },
    { pageId: "362579143", title: "FAQ" },
    { pageId: "362579195", title: "Troubleshooting" },
  ],
};
