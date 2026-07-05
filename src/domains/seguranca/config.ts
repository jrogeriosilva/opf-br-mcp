export const segurancaConfig = {
  id: "seguranca",
  title: "Segurança",
  description:
    "Conhecimento regulatório de Segurança do Open Finance Brasil, extraído das páginas " +
    "Confluence sob a árvore Segurança: Visão Geral, Introdução, Guia do Usuário, Perfil de " +
    "Segurança (DCR, FAPI, CIBA, criptografia de ID_TOKEN), Padrão de Certificados e diretrizes " +
    "de validação, Assinaturas, Casos de Erro, Redirecionamento App-to-App, Glossário e Política " +
    "de Versionamento. Cada item é uma seção (heading) de uma página. search devolve um snippet do " +
    "conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "240648227", title: "Visão Geral" },
    { pageId: "240648385", title: "Introdução" },
    { pageId: "240648471", title: "Guia do Usuário" },
    { pageId: "240648789", title: "Perfil de Segurança" },
    { pageId: "240649257", title: "DCR - Dynamic Client Registration" },
    { pageId: "1799421990", title: "FAPI - Financial-grade API Security Profile" },
    { pageId: "1799946241", title: "CIBA - Client Initiated Backchannel Authentication" },
    { pageId: "240649215", title: "Requisitos de criptografia ID_TOKEN" },
    { pageId: "240649813", title: "Padrão de Certificados" },
    { pageId: "1799946375", title: "Diretrizes para validação de certificados digitais" },
    { pageId: "240650189", title: "Assinaturas" },
    { pageId: "240650255", title: "Casos de Erro" },
    { pageId: "240650317", title: "Redirecionamento App-to-App" },
    { pageId: "240650381", title: "Glossário de Segurança" },
    { pageId: "240650571", title: "Versionamento - Tipos" },
    { pageId: "240650601", title: "Versionamento - Ciclo de Vida" },
    { pageId: "240650643", title: "Versionamento - Fluxo de especificação" },
    { pageId: "240650712", title: "Versionamento - Change log" },
  ],
};
