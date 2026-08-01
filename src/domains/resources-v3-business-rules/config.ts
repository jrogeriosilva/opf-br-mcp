export const resourcesV3BusinessRulesConfig = {
  id: "resources-v3-business-rules",
  title: "API de Recursos v3 — Regras de negócio (DC)",
  specVersion: "3.1.0",
  description:
    "Regras de negócio da API de Recursos (Resources) versão 3.1.0 do Open Finance Brasil, extraídas das " +
    "páginas Confluence de Dados Cadastrais e Transacionais (DC): Informações Gerais (visão geral do " +
    "GET /resources/v3/resources, status do recurso versus status do consentimento) e " +
    "Orientações - [DC] Recursos (quando um recurso volta a ficar disponível, uso do status code de erro " +
    "apropriado quando a transmissora não retorna as informações) — esta última não é versionada e vale " +
    "para todo o major v3. " +
    "Complementa resources-v3-openapi, que traz a spec (endpoints e schemas) do mesmo major. " +
    "Cada item é uma seção (heading) da página. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "1267990545", title: "Informações Gerais - [DC] Recursos - v3.1.0" },
    { pageId: "219512943", title: "Orientações - [DC] Recursos" },
  ],
};
