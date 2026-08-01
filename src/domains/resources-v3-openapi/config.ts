import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const resourcesV3Config: OpenApiDomainConfig = {
  id: "resources-v3-openapi",
  title: "API de Recursos — spec OpenAPI 3.1.0",
  description:
    "Spec OpenAPI oficial da API de Recursos (Resources) do Open Finance Brasil, versão 3.1.0. " +
    "Endpoint único (GET /resources) que lista os recursos compartilhados pelo cliente e o status de cada um, " +
    "considerando a disponibilidade do recurso e o status do consentimento relacionado — é o ponto de partida " +
    "de qualquer jornada de Dados Cadastrais e Transacionais, pois diz o que a receptora pode de fato consultar. " +
    "O consentimento que a habilita fica em consents-v3-openapi; as contas em si, em accounts-v2-openapi. " +
    "Itens type=operation, type=schema (ex.: ResponseResourceList, ResourceData com enum de status) " +
    "e os components alvos dos $ref: type=response e type=parameter. " +
    "Regras de negócio da mesma API em resources-v3-business-rules. " +
    "search devolve resumos; use get_item para o nó completo da spec — nas operações o campo " +
    "`refs` traz os ids dos components referenciados, prontos para get_item.",
  pathExample: "/resources",
  specName: "resources",
  specVersion: "3.1.0",
  url: "https://openbanking-brasil.github.io/openapi/swagger-apis/resources/3.1.0.yml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
