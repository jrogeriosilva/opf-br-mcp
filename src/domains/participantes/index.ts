import { fetchWithRetry } from "../../core/http.js";
import { matchesQuery, normalize } from "../../core/text.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { participantesConfig } from "./config.js";
import { parseParticipants, type ParticipantItem } from "./parser.js";

function summarize(item: Item): Item {
  const { detail: _detail, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export const participantesDomain: Domain = {
  id: participantesConfig.id,
  title: participantesConfig.title,
  description: participantesConfig.description,
  ttlHours: 24,
  filters: [
    { name: "name", description: "Substring no nome da organização ou na marca (CustomerFriendlyName)" },
    { name: "api", description: "Substring na família de API (ex.: payments, automatic-payments)" },
    { name: "status", description: "Status exato da organização (ex.: Active)" },
    { name: "cnpj", description: "Substring no CNPJ (RegistrationNumber, só dígitos)" },
  ],
  async extract(ctx): Promise<DomainData> {
    if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
    ctx?.onProgress?.(0, 1, "Baixando diretório de participantes");
    const response = await fetchWithRetry(participantesConfig.url, {
      retryDelaysMs: participantesConfig.retryDelaysMs,
      signal: ctx?.signal,
    });
    const jsonText = await response.text();
    ctx?.onProgress?.(1, 1);
    return { items: parseParticipants(jsonText) };
  },
  search(data, query, filters = {}) {
    const name = filters.name ? normalize(filters.name) : undefined;
    const api = filters.api ? normalize(filters.api) : undefined;
    const status = filters.status ? normalize(filters.status) : undefined;
    const cnpj = filters.cnpj?.replace(/\D/g, "");

    return (data.items as ParticipantItem[])
      .filter((item) => {
        if (name && !normalize([item.name, ...item.serverNames].join(" ")).includes(name)) return false;
        if (api && !item.apiFamilies.some((f) => normalize(f).includes(api))) return false;
        if (status && normalize(item.status ?? "") !== status) return false;
        if (cnpj && !(item.cnpj ?? "").includes(cnpj)) return false;
        if (query?.trim()) {
          const haystack = [item.name, ...item.serverNames, ...item.apiFamilies, item.cnpj ?? ""].join(" ");
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
