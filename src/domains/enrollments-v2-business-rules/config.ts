export const enrollmentsV2BusinessRulesConfig = {
  id: "enrollments-v2-business-rules",
  title: "API de Vínculo de Dispositivo v2 — Regras de negócio (SV)",
  specVersion: "2.2.0",
  description:
    "Regras de negócio da API de Vínculo de Dispositivo (Enrollments / Jornada Sem Redirecionamento) versão 2.2.0 " +
    "do Open Finance Brasil, extraídas das páginas Confluence de Serviços (SV): Informações Gerais, " +
    "Máquina de estados (vinculação de conta, autorização de consentimento e do consentimento recorrente), " +
    "Edição do vínculo de dispositivo (campos editáveis e condições) e FAQ - JSR (perguntas e respostas por categoria). " +
    "Complementa enrollments-v2-openapi, que traz a spec (endpoints e schemas) do mesmo major — " +
    "hoje na 2.3.0, enquanto estas páginas do Confluence ainda são as da 2.2.0. " +
    "Cada item é uma seção (heading) da página. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "1436516369", title: "Informações Gerais - Vínculo de dispositivo v2.2.0" },
    { pageId: "1436516401", title: "Máquina de estados - Vínculo de dispositivo v2.2.0" },
    { pageId: "1436516593", title: "Edição do vínculo de dispositivo - v2.2.0" },
    { pageId: "1436516567", title: "FAQ - JSR - Vínculo de dispositivo v2.2.0" },
  ],
};
