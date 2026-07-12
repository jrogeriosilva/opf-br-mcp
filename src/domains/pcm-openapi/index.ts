import { fetchWithRetry } from "../../core/http.js";
import type { DomainData, ExtractedDomain, Item } from "../../core/types.js";
import { matchesQuery, normalize } from "../../core/text.js";
import { pcmOpenapiConfig } from "./config.js";
import { parseOpenApiSpec } from "./parser.js";

function summarize(item: Item): Item {
  const { detail: _detail, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export const pcmOpenapiDomain: ExtractedDomain = {
  id: "pcm-openapi",
  title: `PCM — spec OpenAPI ${pcmOpenapiConfig.specVersion}`,
  description:
    "Spec OpenAPI oficial da PCM (Plataforma de Coleta de Métricas) do Open Finance Brasil — a faceta swagger. " +
    "Cobre os endpoints de reporte (report-api v1/v2), hybrid-flow, opendata, consents/stock, " +
    "credit-portabilities, payments/status e token. Itens type=operation (um por método+path) e type=schema (payloads). " +
    "Outras facetas da PCM: tabelas de obrigatoriedade do campo additionalInfo em pcm-additional-info; " +
    "regras de negócio (reporte, processamento, divergências) em pcm-business-rules. " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  ttlHours: 72,
  filters: [
    { name: "path", description: "Substring no path do endpoint (ex.: /report-api/v1/private/report)" },
    { name: "method", description: "Verbo HTTP exato (ex.: POST)" },
    { name: "schema", description: "Substring no nome do schema (case-insensitive)" },
  ],
  async extract(ctx): Promise<DomainData> {
    if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
    ctx?.onProgress?.(0, 1, `Baixando spec ${pcmOpenapiConfig.specName} ${pcmOpenapiConfig.specVersion}`);
    const response = await fetchWithRetry(pcmOpenapiConfig.url, {
      retryDelaysMs: pcmOpenapiConfig.retryDelaysMs,
      signal: ctx?.signal,
    });
    const yamlText = await response.text();
    ctx?.onProgress?.(1, 1);
    return { items: parseOpenApiSpec(yamlText, pcmOpenapiConfig.specName) };
  },
  search(data, query, filters = {}) {
    const path = filters.path ? normalize(filters.path) : undefined;
    const method = filters.method?.toUpperCase();
    const schema = filters.schema ? normalize(filters.schema) : undefined;

    return data.items
      .filter((item) => {
        if (path && !normalize(String(item.path ?? "")).includes(path)) return false;
        if (method && item.method !== method) return false;
        if (schema && !normalize(String(item.name ?? "")).includes(schema)) return false;
        if (query?.trim()) {
          const haystack = [item.path, item.summary, item.description, item.name]
            .map((v) => String(v ?? ""))
            .join(" ");
          if (!matchesQuery(haystack, query)) return false;
        }
        return true;
      })
      .map(summarize);
  },
  getItem(data, id) {
    return data.items.find((i) => i.id === id) ?? null;
  },
};
