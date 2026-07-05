import type { Item } from "../../core/types.js";

interface CqlSearchResponse {
  results?: {
    content?: { id?: string; title?: string };
    title?: string;
    excerpt?: string;
    url?: string;
    lastModified?: string;
  }[];
}

/** CQL de busca no espaço, com aspas e barras invertidas da query escapadas. */
export function buildCql(query: string, space: string): string {
  const escaped = query.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `siteSearch ~ "${escaped}" AND type = page AND space = "${space}"`;
}

/** Um item por página encontrada; excerpt sem os marcadores de highlight (@@@hl@@@). */
export function parseSearchResults(json: unknown, baseUrl: string): Item[] {
  const results = (json as CqlSearchResponse).results ?? [];
  return results
    .filter((r) => r.content?.id)
    .map((r) => ({
      id: String(r.content!.id),
      title: r.content?.title ?? r.title ?? "",
      excerpt: (r.excerpt ?? "").replace(/@@@(end)?hl@@@/g, ""),
      url: r.url ? `${baseUrl}/wiki${r.url}` : null,
      lastModified: r.lastModified ?? null,
    }));
}
