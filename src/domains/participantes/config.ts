export const participantesConfig = {
  id: "participantes",
  title: "Diretório de Participantes",
  description:
    "Diretório público de participantes do Open Finance Brasil: organizações, marcas " +
    "(authorisation servers) e famílias de API suportadas com versões. Um item por organização. " +
    "search devolve resumo (nome, CNPJ, status, famílias de API); use get_item para o nó completo " +
    "com AuthorisationServers, endpoints e certificações.",
  url: "https://data.directory.openbankingbrasil.org.br/participants",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
