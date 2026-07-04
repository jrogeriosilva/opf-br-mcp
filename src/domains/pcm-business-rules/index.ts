import { sleep } from "../../core/http.js";
import { fetchConfluencePage } from "../../core/confluence.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { pcmBusinessRulesConfig } from "./config.js";
import { parseSections, type PcmSection } from "./parser.js";

const SNIPPET_LEN = 200;

export interface PcmRulesPage {
  pageId: string;
  title: string;
  url: string;
  sections: PcmSection[];
}

interface PcmRulesItem extends Item {
  heading: string;
  level: number;
  content: string;
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

export function buildItems(pages: PcmRulesPage[]): Item[] {
  const items: Item[] = [];
  const seen = new Map<string, number>();
  for (const page of pages) {
    for (const section of page.sections) {
      const base = `${page.pageId}:${slugify(section.heading)}`;
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      const id = count > 1 ? `${base}-${count}` : base;
      items.push({
        id,
        heading: section.heading,
        level: section.level,
        content: section.content,
        page: { pageId: page.pageId, title: page.title, url: page.url },
      });
    }
  }
  return items;
}

function summarize(item: PcmRulesItem): Item {
  const { content, ...rest } = item;
  const snippet = content.length > SNIPPET_LEN ? `${content.slice(0, SNIPPET_LEN)}…` : content;
  return { ...rest, snippet };
}

export const pcmBusinessRulesDomain: Domain = {
  id: "pcm-business-rules",
  title: "PCM — Regras de negócio (Reporte, Processamento, Divergências)",
  description:
    "Regras de negócio da PCM (Plataforma de Coleta de Métricas) do Open Finance Brasil, extraídas das " +
    "páginas Confluence: Especificação Técnica, Reporte, Processamento, Divergências e Manual de Integração. " +
    "Cada item é uma seção (heading) da página. search devolve um snippet do conteúdo; " +
    "use get_item para o texto completo da seção.",
  ttlHours: 24,
  filters: [
    { name: "page", description: "Substring no título da página Confluence (ex.: Processamento)" },
    { name: "heading", description: "Substring no título da seção (ex.: PAIRED)" },
    { name: "contains", description: "Substring no conteúdo da seção" },
  ],
  async extract(ctx): Promise<DomainData> {
    const total = pcmBusinessRulesConfig.pages.length;
    const pages: PcmRulesPage[] = [];
    for (const [i, page] of pcmBusinessRulesConfig.pages.entries()) {
      if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
      if (i > 0) await sleep(pcmBusinessRulesConfig.interRequestDelayMs);
      ctx?.onProgress?.(i, total, `Extraindo "${page.title}"`);
      const { html, url } = await fetchConfluencePage(
        pcmBusinessRulesConfig.confluenceBaseUrl,
        page.pageId,
        pcmBusinessRulesConfig.retryDelaysMs,
        ctx?.signal
      );
      pages.push({ pageId: page.pageId, title: page.title, url, sections: parseSections(html) });
    }
    ctx?.onProgress?.(total, total);
    return { items: buildItems(pages) };
  },
  search(data, query, filters = {}) {
    const page = filters.page?.toLowerCase();
    const heading = filters.heading?.toLowerCase();
    const contains = filters.contains?.toLowerCase();
    const q = query?.toLowerCase();

    return (data.items as PcmRulesItem[])
      .filter((item) => {
        if (page && !item.page.title.toLowerCase().includes(page)) return false;
        if (heading && !item.heading.toLowerCase().includes(heading)) return false;
        if (contains && !item.content.toLowerCase().includes(contains)) return false;
        if (q) {
          const haystack = `${item.heading} ${item.content}`.toLowerCase();
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
