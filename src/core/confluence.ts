import { fetchWithRetry } from "./http.js";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; opf-br-mcp/0.1; +opf-br-mcp)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Charset": "UTF-8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

interface ConfluenceResponse {
  title?: string;
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
): Promise<{ html: string; title?: string; url: string }> {
  const apiUrl = `${baseUrl}/wiki/rest/api/content/${pageId}?expand=body.view`;
  const response = await fetchWithRetry(apiUrl, { retryDelaysMs, headers: HEADERS, signal });
  const json = (await response.json()) as ConfluenceResponse;
  // Sem `body.view.value` a resposta não é o conteúdo expandido que pedimos (erro
  // da API com 200, envelope diferente, expansão negada). Antes isso virava html
  // vazio, 0 seções e um domínio vazio cacheado por 72h em silêncio. Página
  // legitimamente vazia traz `value: ""` e continua passando.
  const html = json?.body?.view?.value;
  if (typeof html !== "string") {
    throw new Error(
      `resposta da página ${pageId} não traz body.view.value; não é conteúdo Confluence expandido`
    );
  }
  return {
    html,
    title: json.title,
    url: `${baseUrl}/wiki${json._links?.webui ?? ""}`,
  };
}
