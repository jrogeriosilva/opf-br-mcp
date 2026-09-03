// ATENÇÃO: a spec da PCM só existe no feature branch `feature/correct-paths` do
// repo pcm-specs (fonte indicada como oficial) — `main` traz arquivos mais
// antigos (PCM-v390/PCM-v310). Como branch é ref mutável e some quando mergeado,
// a URL fixa o commit: se o branch for removido, o SHA continua resolvendo.
// Sem isso a extração passaria a falhar e o server serviria cache stale
// indefinidamente. Reavaliar/atualizar o SHA quando a spec for promovida a main.
export const pcmOpenapiConfig = {
  specName: "pcm",
  // A spec da PCM declara `info.version: 1.0.0`, um placeholder que nunca muda —
  // a versão real da PCM vai no campo `openapi:` (3.9.2 neste commit), fora do
  // padrão. Identificar pelo commit é o único rótulo verificável — e deixa
  // explícito, em list_domains, que este domínio está congelado no SHA.
  // Não mover o pin sem checar o conteúdo: o head atual do branch (48e7632) troca
  // `openapi: 3.9.2` por `3.0.0`, ou seja, apaga o único sinal de versão da PCM.
  specVersion: "commit 8a7f7b0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/pcm-specs/8a7f7b03ddfab7eaf97bcfe68e67fac22a5eeb68/PCM-current.openapi.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
