import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export interface EndpointLimit {
  /** Família da API, como aparece na legenda da tabela (ex.: "[DC] API Recursos"). */
  api: string;
  /** Verbo HTTP, quando a célula de endpoint começa por um (ex.: "GET"). */
  metodo: string | null;
  /** Rota, sem o verbo (ex.: "/accounts/{accountId}/balances"). */
  path: string;
  frequencia: string | null;
  slaMs: string | null;
  timeoutS: string | null;
  /** Texto: algumas linhas trazem a tabela de faixas QCA→TPM achatada aqui. */
  tpm: string | null;
  tps: string | null;
  limiteOperacional: string | null;
}

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/**
 * Texto de uma célula. Além de colapsar espaços, remove os caracteres de
 * largura zero que o Confluence injeta no meio das rotas: 57% das linhas da
 * página trazem algo como "GET /consents​/{consentId}", e sem isso o
 * filtro por endpoint e os ids do domínio não casariam com a rota real.
 */
function cellText($: cheerio.CheerioAPI, el: AnyNode): string {
  const clone = $(el).clone();
  clone.find("br").replaceWith("\n");
  return clone
    .text()
    .replace(/[​‌‍﻿]/g, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Mapeia o cabeçalho da coluna para a chave do registro; null se desconhecida. */
function headerKey(raw: string): keyof EndpointLimit | null {
  const h = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  if (h.startsWith("endpoint")) return "path";
  if (h.startsWith("frequencia")) return "frequencia";
  if (h.startsWith("sla")) return "slaMs";
  if (h.startsWith("timeout")) return "timeoutS";
  if (h.startsWith("limite operacional")) return "limiteOperacional";
  if (h === "tpm") return "tpm";
  if (h === "tps") return "tps";
  return null;
}

/** Separa "GET /resources" em verbo e rota. Sem verbo reconhecido, tudo vira path. */
function splitEndpoint(cell: string): { metodo: string | null; path: string } {
  const [first, ...rest] = cell.split(" ");
  if (HTTP_METHODS.has(first.toUpperCase()) && rest.length > 0) {
    return { metodo: first.toUpperCase(), path: rest.join(" ") };
  }
  return { metodo: null, path: cell };
}

/**
 * Extrai as tabelas de limites da página "Referência" do Manual de APIs.
 *
 * Cada tabela tem uma linha de legenda com o nome da família de API, uma linha
 * de cabeçalho e uma linha por endpoint. A linha de cabeçalho é localizada pela
 * coluna "Endpoint" em vez de por posição fixa — assim as linhas de legenda
 * (uma ou mais) nunca viram registros.
 */
export function parseEndpointLimits(html: string): EndpointLimit[] {
  const $ = cheerio.load(html);
  $("style, script").remove();
  const limits: EndpointLimit[] = [];

  for (const table of $("table").toArray()) {
    const rows = $(table).find("tr").toArray();
    const cellsOf = (tr: AnyNode) =>
      $(tr)
        .find("th, td")
        .toArray()
        .map((c) => cellText($, c));

    const headerIdx = rows.findIndex((tr) =>
      cellsOf(tr).some((c) => headerKey(c) === "path")
    );
    if (headerIdx === -1) continue;

    // Legenda: o que vem antes do cabeçalho nomeia a família da API.
    const api = rows
      .slice(0, headerIdx)
      .map((tr) => cellsOf(tr).filter(Boolean).join(" "))
      .filter(Boolean)
      .join(" ")
      .trim();

    const keys = cellsOf(rows[headerIdx]).map(headerKey);

    for (const tr of rows.slice(headerIdx + 1)) {
      const cells = cellsOf(tr);
      const limit: EndpointLimit = {
        api,
        metodo: null,
        path: "",
        frequencia: null,
        slaMs: null,
        timeoutS: null,
        tpm: null,
        tps: null,
        limiteOperacional: null,
      };

      cells.forEach((text, i) => {
        const key = keys[i];
        if (!key || !text) return;
        if (key === "path") {
          const { metodo, path } = splitEndpoint(text);
          limit.metodo = metodo;
          limit.path = path;
        } else {
          limit[key] = text;
        }
      });

      if (limit.path) limits.push(limit);
    }
  }

  return limits;
}
