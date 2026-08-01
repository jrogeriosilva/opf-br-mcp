import { fetchWithRetry } from "../../core/http.js";
import { FILTER_SETS } from "../../core/filter-sets.js";
import type { DomainData, ExtractedDomain, Item } from "../../core/types.js";
import { matchesQuery, normalize } from "../../core/text.js";
import { parseOpenApiSpec } from "./parser.js";

export interface OpenApiDomainConfig {
  id: string;
  title: string;
  description: string;
  /** Exemplo interpolado no filters[0].description (ex.: "/pix/payments"). */
  pathExample: string;
  specName: string;
  specVersion: string;
  url: string;
  retryDelaysMs: number[];
}

function summarize(item: Item): Item {
  const { detail: _detail, refs: _refs, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export function createOpenApiDomain(config: OpenApiDomainConfig): ExtractedDomain {
  return {
    id: config.id,
    title: config.title,
    description: config.description,
    specVersion: config.specVersion,
    ttlHours: 72,
    filterSet: "openapi",
    filters: [
      { name: "path", description: `Substring no path do endpoint (ex.: ${config.pathExample})` },
      ...FILTER_SETS.openapi,
    ],
    async extract(ctx): Promise<DomainData> {
      if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
      ctx?.onProgress?.(0, 1, `Baixando spec ${config.specName} ${config.specVersion}`);
      const response = await fetchWithRetry(config.url, {
        retryDelaysMs: config.retryDelaysMs,
        signal: ctx?.signal,
      });
      const yamlText = await response.text();
      ctx?.onProgress?.(1, 1);
      return { items: parseOpenApiSpec(yamlText, config.specName) };
    },
    search(data, query, filters = {}) {
      const path = filters.path ? normalize(filters.path) : undefined;
      const method = filters.method?.toUpperCase();

      return data.items
        .filter((item) => {
          if (path && !normalize(String(item.path ?? "")).includes(path)) return false;
          if (method && item.method !== method) return false;
          for (const type of ["schema", "response", "parameter", "header"] as const) {
            const name = filters[type];
            if (!name) continue;
            if (item.type !== type) return false;
            if (!normalize(String(item.name ?? "")).includes(normalize(name))) return false;
          }
          if (query?.trim()) {
            const haystack = [item.path, item.summary, item.description, item.name, item.paramName]
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
}
