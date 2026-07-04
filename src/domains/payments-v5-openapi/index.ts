import { fetchWithRetry } from "../../core/http.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { paymentsV5Config } from "./config.js";
import { parseOpenApiSpec } from "./parser.js";

function summarize(item: Item): Item {
  const { detail: _detail, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export const paymentsV5Domain: Domain = {
  id: "payments-v5-openapi",
  title: `API de Pagamentos — spec OpenAPI ${paymentsV5Config.specVersion}`,
  description:
    "Spec OpenAPI oficial da API de Iniciação de Pagamentos (Pix) do Open Finance Brasil, versão 5. " +
    "Inclui endpoints de consentimento (/consents) e de pagamento (/pix/payments). " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  ttlHours: 24,
  filters: [
    { name: "path", description: "Substring no path do endpoint (ex.: /pix/payments)" },
    { name: "method", description: "Verbo HTTP exato (ex.: POST)" },
    { name: "schema", description: "Substring no nome do schema (case-insensitive)" },
  ],
  async extract(ctx): Promise<DomainData> {
    if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
    ctx?.onProgress?.(0, 1, `Baixando spec ${paymentsV5Config.specName} ${paymentsV5Config.specVersion}`);
    const response = await fetchWithRetry(paymentsV5Config.url, {
      retryDelaysMs: paymentsV5Config.retryDelaysMs,
      signal: ctx?.signal,
    });
    const yamlText = await response.text();
    ctx?.onProgress?.(1, 1);
    return { items: parseOpenApiSpec(yamlText, paymentsV5Config.specName) };
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
