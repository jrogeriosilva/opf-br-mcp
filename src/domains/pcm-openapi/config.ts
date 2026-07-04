// ATENÇÃO: a URL aponta para o feature branch `feature/correct-paths` do repo
// pcm-specs (fonte indicada como oficial), não para `main`. É um branch
// instável — reavaliar/atualizar caso a spec seja promovida a main.
export const pcmOpenapiConfig = {
  specName: "pcm",
  specVersion: "1.0.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/pcm-specs/refs/heads/feature/correct-paths/PCM-current.openapi.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
