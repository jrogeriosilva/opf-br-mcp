import { fetchConfluencePage } from "../../core/confluence.js";
import { fetchWithRetry } from "../../core/http.js";
import type { LiveDomain } from "../../core/types.js";
import { parseSections } from "../_confluence-sections/parser.js";
import { portalConfig } from "./config.js";
import { buildCql, parseSearchResults } from "./parser.js";

export const portalDomain: LiveDomain = {
  id: portalConfig.id,
  title: portalConfig.title,
  description: portalConfig.description,
  filters: [],
  live: {
    async search(query, _filters, ctx) {
      const cql = buildCql(query, portalConfig.space);
      const url =
        `${portalConfig.confluenceBaseUrl}/wiki/rest/api/search` +
        `?cql=${encodeURIComponent(cql)}&limit=${portalConfig.searchLimit}`;
      const response = await fetchWithRetry(url, {
        retryDelaysMs: portalConfig.retryDelaysMs,
        signal: ctx?.signal,
      });
      return parseSearchResults(await response.json(), portalConfig.confluenceBaseUrl);
    },
    async getItem(id, ctx) {
      if (!/^\d+$/.test(id)) return null;
      try {
        const { html, title, url } = await fetchConfluencePage(
          portalConfig.confluenceBaseUrl,
          id,
          portalConfig.retryDelaysMs,
          ctx?.signal
        );
        return { id, title: title ?? null, url, sections: parseSections(html) };
      } catch (err) {
        if ((err as Error).message.includes("HTTP 404")) return null;
        throw err;
      }
    },
  },
};
