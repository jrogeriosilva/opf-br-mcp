export const accountsV2BusinessRulesConfig = {
  id: "accounts-v2-business-rules",
  title: "API de Contas v2 — Regras de negócio (DC)",
  specVersion: "2.5.0",
  description:
    "Regras de negócio da API de Contas (Accounts) do Open Finance Brasil, extraídas das páginas " +
    "Confluence de Dados Cadastrais e Transacionais (DC): o PRD (Documento de Requisito do Produto) da " +
    "v2.5.0 — escopo, funcionalidades e regras por assunto (listagem de contas, transações, limites e " +
    "saldos reservados/caixinhas), com escopo e permissions de cada um — e Orientações - [DC] Contas " +
    "(obrigatoriedade de informações de contraparte pela IN BCB nº 371, tratamento de transações e casos " +
    "de borda), esta última não versionada e válida para todo o major v2. " +
    "Complementa accounts-v2-openapi, que traz a spec (endpoints e schemas) do mesmo major — hoje na " +
    "2.5.1, enquanto o PRD do Confluence é o da 2.5.0. " +
    "Cada item é uma seção (heading) da página. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  // A árvore [DC] API - Contas foi reorganizada: as páginas "Informações Gerais -
  // [DC] Contas - vX" foram para "Histórico de Especificações" (subárvore arquivada,
  // fora da convenção do projeto) e o container v2.5.0 só guarda swagger e changelogs.
  // O conteúdo normativo passou a ser o PRD, sob "Documentação Negocial - API de Contas".
  // Fora da lista: "Diagrama de Sequencia da Jornada - API Contas" (1739063297), que é
  // só uma imagem, sem headings nem texto.
  pages: [
    { pageId: "1738965008", title: "Documento de Requisito do Produto (PRD) - API de Contas v2.5.0" },
    { pageId: "1739096252", title: "Orientações - [DC] Contas" },
  ],
};
