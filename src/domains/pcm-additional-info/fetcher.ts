import { fetchWithRetry } from "../../core/http.js";
import { pcmConfig } from "./config.js";

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

export async function fetchConfluencePage(
  pageId: string,
  signal?: AbortSignal
): Promise<{ html: string; url: string }> {
  const apiUrl = `${pcmConfig.confluenceBaseUrl}/wiki/rest/api/content/${pageId}?expand=body.view`;
  const response = await fetchWithRetry(apiUrl, {
    retryDelaysMs: pcmConfig.retryDelaysMs,
    headers: HEADERS,
    signal,
  });
  const json = (await response.json()) as ConfluenceResponse;
  return {
    html: json.body?.view?.value ?? "",
    url: `${pcmConfig.confluenceBaseUrl}/wiki${json._links?.webui ?? ""}`,
  };
}
