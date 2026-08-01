export const accountsV2BusinessRulesConfig = {
  id: "accounts-v2-business-rules",
  title: "API de Contas v2 — Regras de negócio (DC)",
  specVersion: "2.4.2",
  description:
    "Regras de negócio da API de Contas (Accounts) versão 2.4.2 do Open Finance Brasil, extraídas das " +
    "páginas Confluence de Dados Cadastrais e Transacionais (DC): Informações Gerais (visão geral dos " +
    "endpoints, contas de depósito à vista/poupança/pagamento pré-paga, saldos, transações e limites) e " +
    "Orientações - [DC] Contas (obrigatoriedade de informações de contraparte pela IN BCB nº 371, " +
    "tratamento de transações e casos de borda) — esta última não é versionada e vale para todo o major v2. " +
    "Complementa accounts-v2-openapi, que traz a spec (endpoints e schemas) do mesmo major. " +
    "Cada item é uma seção (heading) da página. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "979566625", title: "Informações Gerais - [DC] Contas - v2.4.2" },
    { pageId: "1739096252", title: "Orientações - [DC] Contas" },
  ],
};
