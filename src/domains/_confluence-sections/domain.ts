import { sleep } from "../../core/http.js";
import { fetchConfluencePage } from "../../core/confluence.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { parseSections, type ConfluenceSection } from "./parser.js";

const SNIPPET_LEN = 200;

export interface ConfluenceSectionsConfig {
  id: string;
  title: string;
  description: string;
  confluenceBaseUrl: string;
  interRequestDelayMs: number;
  retryDelaysMs: number[];
  pages: { pageId: string; title: string }[];
}

export interface ConfluencePageSections {
  pageId: string;
  title: string;
  url: string;
  sections: ConfluenceSection[];
}

interface ConfluenceSectionItem extends Item {
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

export function buildItems(pages: ConfluencePageSections[]): Item[] {
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

function summarize(item: ConfluenceSectionItem): Item {
  const { content, ...rest } = item;
  const snippet = content.length > SNIPPET_LEN ? `${content.slice(0, SNIPPET_LEN)}…` : content;
  return { ...rest, snippet };
}

export function createConfluenceSectionsDomain(config: ConfluenceSectionsConfig): Domain {
  return {
    id: config.id,
    title: config.title,
    description: config.description,
    ttlHours: 24,
    filters: [
      { name: "page", description: "Substring no título da página Confluence" },
      { name: "heading", description: "Substring no título da seção (heading)" },
      { name: "contains", description: "Substring no conteúdo da seção" },
    ],
    async extract(ctx): Promise<DomainData> {
      const total = config.pages.length;
      const pages: ConfluencePageSections[] = [];
      for (const [i, page] of config.pages.entries()) {
        if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
        if (i > 0) await sleep(config.interRequestDelayMs);
        ctx?.onProgress?.(i, total, `Extraindo "${page.title}"`);
        const { html, url } = await fetchConfluencePage(
          config.confluenceBaseUrl,
          page.pageId,
          config.retryDelaysMs,
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

      return (data.items as ConfluenceSectionItem[])
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
}
