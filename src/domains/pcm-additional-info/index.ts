import { sleep } from "../../core/http.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { matchesQuery, normalize } from "../../core/text.js";
import { pcmConfig } from "./config.js";
import { fetchConfluencePage } from "../../core/confluence.js";
import { parseAdditionalInfoTables, type PcmField } from "./parser.js";

interface PcmPage {
  pageId: string;
  title: string;
  url: string;
  fields: PcmField[];
}

interface PcmItem extends Item {
  campo: string | null;
  definicao: string | null;
  regraDePreenchimento: string | null;
  endpoints: string[];
  metodos: string[];
  page: { pageId: string; title: string; url: string };
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildItems(pages: PcmPage[]): Item[] {
  const items: Item[] = [];
  const seen = new Map<string, number>();
  for (const page of pages) {
    for (const field of page.fields) {
      const base = `${page.pageId}:${slugify(String(field.campo ?? ""))}`;
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      const id = count > 1 ? `${base}-${count}` : base;
      items.push({
        ...field,
        id,
        page: { pageId: page.pageId, title: page.title, url: page.url },
      });
    }
  }
  return items;
}

export const pcmDomain: Domain = {
  id: "pcm-additional-info",
  title: "PCM — Regras de obrigatoriedade do additionalInfo",
  description:
    "Regras de preenchimento do campo additionalInfo das páginas PCM (Plataforma de Coleta de Métricas) do Confluence do Open Finance Brasil " +
    "(Iniciação de Pagamentos, Pagamentos Automáticos, Sem Redirecionamento, DC-*). " +
    "Cada item é um campo com regra, métodos, endpoints, versões, tamanho máximo e exemplo.",
  ttlHours: 24,
  filters: [
    { name: "field", description: "Match exato no nome do campo (case-insensitive)" },
    { name: "contains", description: "Substring em campo ou definicao" },
    { name: "endpoint", description: "Substring em endpoints[] (ex.: /pix)" },
    { name: "method", description: "Verbo HTTP presente em metodos[] (ex.: POST)" },
    { name: "page", description: "Substring no título da página Confluence" },
  ],
  async extract(ctx): Promise<DomainData> {
    const total = pcmConfig.pages.length;
    const pages: PcmPage[] = [];
    for (const [i, page] of pcmConfig.pages.entries()) {
      if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
      if (i > 0) await sleep(pcmConfig.interRequestDelayMs);
      ctx?.onProgress?.(i, total, `Extraindo "${page.title}"`);
      const { html, url } = await fetchConfluencePage(
        pcmConfig.confluenceBaseUrl,
        page.pageId,
        pcmConfig.retryDelaysMs,
        ctx?.signal
      );
      pages.push({ pageId: page.pageId, title: page.title, url, fields: parseAdditionalInfoTables(html) });
    }
    ctx?.onProgress?.(total, total);
    return { items: buildItems(pages) };
  },
  search(data, query, filters = {}) {
    const field = filters.field?.trim().toLowerCase();
    const contains = filters.contains ? normalize(filters.contains) : undefined;
    const endpoint = filters.endpoint?.toLowerCase();
    const method = filters.method?.toUpperCase();
    const page = filters.page ? normalize(filters.page) : undefined;

    return (data.items as PcmItem[]).filter((item) => {
      const campo = String(item.campo ?? "");
      if (page && !normalize(item.page.title).includes(page)) return false;
      if (field && campo.trim().toLowerCase() !== field) return false;
      if (contains && !normalize(`${campo} ${item.definicao ?? ""}`).includes(contains)) return false;
      if (endpoint && !item.endpoints.some((e) => e.toLowerCase().includes(endpoint))) return false;
      if (method && !item.metodos.some((m) => m.toUpperCase() === method)) return false;
      if (query?.trim()) {
        const haystack = `${campo} ${item.definicao ?? ""} ${item.regraDePreenchimento ?? ""}`;
        if (!matchesQuery(haystack, query)) return false;
      }
      return true;
    });
  },
  getItem(data, id) {
    return data.items.find((i) => i.id === id) ?? null;
  },
};
