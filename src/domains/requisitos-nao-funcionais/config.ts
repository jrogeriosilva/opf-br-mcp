export const requisitosNaoFuncionaisConfig = {
  id: "requisitos-nao-funcionais",
  title: "Requisitos não Funcionais — SLA, disponibilidade e limites (Manual de APIs)",
  description:
    "Requisitos não funcionais que valem para todas as APIs do Open Finance Brasil, extraídos das páginas " +
    "Confluence do Manual de APIs: Desempenho (SLA do percentil 95 do tempo de resposta por faixa de " +
    "frequência do endpoint), Disponibilidade (mínimos por 24h e por trimestre), Timeout, Limites de tráfego " +
    "(TPM por origem e TPS globais), Limites operacionais (teto de consultas por mês, por endpoint e por " +
    "recurso, e paginação com pagination-key) e Indisponibilidade Programada. " +
    "Os números por endpoint (SLA, timeout, TPM, TPS e limite operacional de cada rota) estão em " +
    "limites-por-endpoint, um registro por endpoint. Cada item aqui é uma seção (heading) da página — as " +
    "páginas Desempenho e Timeout não têm headings e viram um único item `intro` cada, então nelas filtre " +
    "por page ou contains, não por heading. " +
    "search devolve um snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  // Fora da lista: a página-mãe "Requisitos não Funcionais" (17956981), que só
  // nomeia as quatro faixas de frequência sem defini-las (página índice), e a
  // página "Referência" (17957025), cujas tabelas de limites por endpoint têm
  // parser próprio no domínio limites-por-endpoint.
  pages: [
    { pageId: "17891396", title: "Desempenho" },
    { pageId: "17891406", title: "Disponibilidade" },
    { pageId: "17891413", title: "Timeout" },
    { pageId: "17989722", title: "Limites de tráfego" },
    { pageId: "17924220", title: "Limites operacionais" },
    { pageId: "1808269313", title: "Indisponibilidade Programada" },
  ],
};
