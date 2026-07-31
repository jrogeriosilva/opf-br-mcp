import { createOpenApiDomain } from "../_openapi/domain.js";
import { pcmOpenapiConfig } from "./config.js";

export const pcmOpenapiDomain = createOpenApiDomain({
  id: "pcm-openapi",
  title: `PCM — spec OpenAPI ${pcmOpenapiConfig.specVersion}`,
  description:
    "Spec OpenAPI oficial da PCM (Plataforma de Coleta de Métricas) do Open Finance Brasil — a faceta swagger. " +
    "Cobre os endpoints de reporte (report-api v1/v2), hybrid-flow, opendata, consents/stock, " +
    "credit-portabilities, payments/status e token. Itens type=operation (um por método+path), " +
    "type=schema (payloads) e type=response (components reutilizáveis, alvos dos $ref). " +
    "Outras facetas da PCM: tabelas de obrigatoriedade do campo additionalInfo em pcm-additional-info; " +
    "regras de negócio (reporte, processamento, divergências) em pcm-business-rules. " +
    "search devolve resumos; use get_item para o nó completo da spec (operações trazem `refs` " +
    "com os ids dos components que referenciam).",
  pathExample: "/report-api/v1/private/report",
  ...pcmOpenapiConfig,
});
