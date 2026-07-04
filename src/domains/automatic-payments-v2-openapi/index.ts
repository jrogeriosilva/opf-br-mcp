import { fetchWithRetry } from "../../core/http.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { automaticPaymentsV2Config } from "./config.js";
import { parseOpenApiSpec } from "./parser.js";

function summarize(item: Item): Item {
  const { detail: _detail, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export const automaticPaymentsV2Domain: Domain = {
  id: "automatic-payments-v2-openapi",
  title: `API de Pagamentos Automáticos (Automatic Payments) — spec OpenAPI ${automaticPaymentsV2Config.specVersion}`,
  description:
    "Spec OpenAPI oficial da API de Automatic Payments do Open Finance Brasil, versão 2. " +
    "Cobre a iniciação de pagamentos automáticos (Pix Automático e Transferências Inteligentes) mediante consentimento recorrente. " +
    "Endpoints /recurring-consents (criação, consulta e edição/revogação) e /pix/recurring-payments (criação, retry, consulta e cancelamento); scope recurring-payments. " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  ttlHours: 24,
  filters: [
    { name: "path", description: "Substring no path do endpoint (ex.: /pix/recurring-payments)" },
    { name: "method", description: "Verbo HTTP exato (ex.: POST)" },
    { name: "schema", description: "Substring no nome do schema (case-insensitive)" },
  ],
  async extract(ctx): Promise<DomainData> {
    if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
    ctx?.onProgress?.(
      0,
      1,
      `Baixando spec ${automaticPaymentsV2Config.specName} ${automaticPaymentsV2Config.specVersion}`,
    );
    const response = await fetchWithRetry(automaticPaymentsV2Config.url, {
      retryDelaysMs: automaticPaymentsV2Config.retryDelaysMs,
      signal: ctx?.signal,
    });
    const yamlText = await response.text();
    ctx?.onProgress?.(1, 1);
    return { items: parseOpenApiSpec(yamlText, automaticPaymentsV2Config.specName) };
  },
  search(data, query, filters = {}) {
    const path = filters.path?.toLowerCase();
    const method = filters.method?.toUpperCase();
    const schema = filters.schema?.toLowerCase();
    const q = query?.toLowerCase();

    return data.items
      .filter((item) => {
        if (path && !String(item.path ?? "").toLowerCase().includes(path)) return false;
        if (method && item.method !== method) return false;
        if (schema && !String(item.name ?? "").toLowerCase().includes(schema)) return false;
        if (q) {
          const haystack = [item.path, item.summary, item.description, item.name]
            .map((v) => String(v ?? ""))
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .map(summarize);
  },
  getItem(data, id) {
    return data.items.find((i) => i.id === id) ?? null;
  },
};
