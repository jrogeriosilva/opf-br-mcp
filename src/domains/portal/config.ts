export const portalConfig = {
  id: "portal",
  title: "Portal do Desenvolvedor (busca ao vivo)",
  description:
    "Busca ao vivo em todo o Portal do Desenvolvedor do Open Finance Brasil (Confluence, espaço OF). " +
    "Use quando os domínios específicos não cobrirem o assunto. search exige query e consulta a fonte " +
    "a cada chamada (sempre atualizado, sem cache); get_item baixa a página inteira estruturada em seções. " +
    "Retorna no máximo os 25 resultados mais relevantes; matches nunca excede 25.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  space: "OF",
  searchLimit: 25,
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
