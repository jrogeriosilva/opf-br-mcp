import { fetchWithRetry } from "./http.js";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; opf-br-mcp/0.1; +opf-br-mcp)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Charset": "UTF-8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

interface ConfluenceResponse {
  body?: { view?: { value?: string } };
  _links?: { webui?: string };
}

/**
 * Busca uma página Confluence via API pública (`?expand=body.view`) e devolve
 * o HTML renderizado e a URL webui absoluta.
 */
export async function fetchConfluencePage(
  baseUrl: string,
  pageId: string,
  retryDelaysMs: number[],
  signal?: AbortSignal
): Promise<{ html: string; url: string }> {
  const apiUrl = `${baseUrl}/wiki/rest/api/content/${pageId}?expand=body.view`;
  const response = await fetchWithRetry(apiUrl, { retryDelaysMs, headers: HEADERS, signal });
  const json = (await response.json()) as ConfluenceResponse;
  return {
    html: json.body?.view?.value ?? "",
    url: `${baseUrl}/wiki${json._links?.webui ?? ""}`,
  };
}
