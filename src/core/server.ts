import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { readCache } from "./cache.js";
import { getDomainData } from "./data.js";
import { FILTER_SETS } from "./filter-sets.js";
import { domains } from "./registry.js";
import type { Domain, ExtractContext, ExtractedDomain, Item } from "./types.js";
import { PACKAGE_VERSION } from "./version.js";

function compact(item: Item): Item {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) {
    if (v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Item;
}

function text(obj: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(obj, null, 1) }] };
}

function errorText(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function findDomain(id: string): Domain | undefined {
  return domains.find((d) => d.id === id);
}

const validIds = () => domains.map((d) => d.id).join(", ");

/**
 * Teto para o refresh sem `domain`. Percorrer todos leva 3-4 min (75 páginas do
 * Confluence com 2s de intervalo deliberado entre elas), mas o timeout padrão do
 * cliente MCP é 60s e `resetTimeoutOnProgress` vem desligado: o trabalho
 * terminava e mesmo assim o agente via timeout. Paralelizar não resolveria —
 * todas as páginas saem do mesmo host, e o intervalo existe para ser educado com
 * a fonte. Então o refresh faz o que cabe e devolve o resto em `pendentes`.
 */
const REFRESH_BUDGET_MS = 45_000;

const domainIdSchema = z
  .enum(domains.map((d) => d.id) as [string, ...string[]])
  .describe("Id do domínio (ver list_domains)");

/** Liga o abort e o progressToken do request MCP à extração do domínio. */
function extractContext(
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): ExtractContext {
  const progressToken = extra._meta?.progressToken;
  return {
    signal: extra.signal,
    onProgress:
      progressToken === undefined
        ? undefined
        : (progress, total, message) => {
            extra
              .sendNotification({
                method: "notifications/progress",
                params: { progressToken, progress, total, message },
              })
              .catch(() => {});
          },
  };
}

/** `refreshBudgetMs` só existe para o teste conseguir esgotar o orçamento sem esperar 45s. */
export function createServer(refreshBudgetMs: number = REFRESH_BUDGET_MS): McpServer {
  const server = new McpServer(
    { name: "opf-br-mcp", version: PACKAGE_VERSION },
    {
      instructions:
        "Conhecimento regulatório do Open Finance Brasil. Fluxo: list_domains para descobrir " +
        "domínios e filtros → search(domain, ...) para buscar → get_item(domain, id) para o " +
        "registro completo. Os ids não são adivinháveis — sempre venha de search. A primeira " +
        "consulta a um domínio extrai das fontes públicas e pode levar ~30s; as seguintes usam cache.",
    }
  );

  server.registerTool(
    "list_domains",
    {
      title: "Listar domínios",
      description:
        "Lista os domínios de conhecimento do Open Finance Brasil disponíveis neste server, " +
        "com os filtros aceitos por cada um, a versão da spec de origem e o estado do cache local. " +
        "Devolve também a versão deste server em `server.version`. " +
        "Os filtros aceitos por um domínio são a união de `filters` (os próprios dele, pode vir ausente) " +
        "com `filterSets[<filterSet>]` (o conjunto comum à família, listado uma vez no topo). " +
        "Comece por aqui; depois use search(domain, ...) e get_item(domain, id).",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const out = domains.map((d) => {
        // Os filtros que vêm do conjunto compartilhado saem do payload por domínio;
        // o cliente reconstrói a lista aceita unindo `filters` a filterSets[filterSet].
        const shared = d.filterSet ? FILTER_SETS[d.filterSet] : undefined;
        const own = shared
          ? d.filters.filter((f) => !shared.some((s) => s.name === f.name && s.description === f.description))
          : d.filters;
        const base = {
          id: d.id,
          title: d.title,
          description: d.description,
          ...(d.filterSet ? { filterSet: d.filterSet } : {}),
          ...(own.length > 0 ? { filters: own } : {}),
          ...(d.specVersion ? { specVersion: d.specVersion } : {}),
        };
        if (d.live) {
          return { ...base, live: true };
        }
        const cached = readCache(d.id);
        return {
          ...base,
          cachedItems: cached?.data.items.length ?? 0,
          extractedAt: cached?.extractedAt ?? null,
        };
      });
      const usedSets = Object.fromEntries(
        Object.entries(FILTER_SETS).filter(([name]) => domains.some((d) => d.filterSet === name))
      );
      return text({
        server: { name: "opf-br-mcp", version: PACKAGE_VERSION },
        filterSets: usedSets,
        domains: out,
      });
    }
  );

  server.registerTool(
    "search",
    {
      title: "Buscar em um domínio",
      description:
        "Busca filtrada em um domínio. `filters` aceita as chaves listadas em list_domains " +
        "para o domínio (combinadas em AND); `query` busca substring nos campos textuais. " +
        "Retorno compacto (omite nulls). Cada resultado tem `id` para usar em get_item. " +
        "Na primeira consulta o domínio é extraído das fontes públicas (pode levar ~30s).",
      inputSchema: {
        domain: domainIdSchema,
        query: z.string().optional().describe("Substring em campos textuais"),
        filters: z.record(z.string()).optional().describe("Filtros específicos do domínio"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Máx. de resultados (1-100, default 20)"),
        offset: z
          .number()
          .int()
          .min(0)
          .default(0)
          .describe("Pula os N primeiros resultados (paginação com limit)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ domain, query, filters, limit, offset }, extra) => {
      const d = findDomain(domain);
      if (!d) return errorText(`Domínio desconhecido: "${domain}". Válidos: ${validIds()}`);
      if (filters) {
        const valid = new Set(d.filters.map((f) => f.name));
        const unknown = Object.keys(filters).filter((k) => !valid.has(k));
        if (unknown.length > 0) {
          return errorText(
            `Filtros inválidos para ${domain}: ${unknown.join(", ")}. Válidos: ${[...valid].join(", ")}`
          );
        }
      }
      const max = limit ?? 20;
      const off = offset ?? 0;
      if (d.live) {
        if (!query?.trim()) {
          return errorText(`O domínio ${domain} é busca ao vivo: informe \`query\`.`);
        }
        try {
          const results = await d.live.search(query, filters, extractContext(extra));
          const page = results.slice(off, off + max);
          return text({ matches: results.length, returned: page.length, results: page.map(compact) });
        } catch (err) {
          return errorText(
            `Falha na busca ao vivo em ${domain}: ${(err as Error).message}. ` +
              `Tente novamente (domínios ao vivo não têm cache; refresh não se aplica).`
          );
        }
      }
      try {
        const { data, stale, extractedAt } = await getDomainData(d, false, extractContext(extra));
        const results = d.search(data, query, filters);
        const page = results.slice(off, off + max);
        return text({
          matches: results.length,
          returned: page.length,
          ...(stale ? { stale: true, staleNote: `Fontes inacessíveis; usando cache de ${extractedAt}` } : {}),
          ...(results.length === 0
            ? {
                hint:
                  'Sem resultados; tente search(domain: "portal", query: ...) para buscar ao vivo ' +
                  "em todo o Portal do Desenvolvedor.",
              }
            : {}),
          results: page.map(compact),
        });
      } catch (err) {
        return errorText(
          `Falha ao obter dados de ${domain}: ${(err as Error).message}. ` +
            `Verifique a conexão com a internet e tente novamente (ou use a tool refresh).`
        );
      }
    }
  );

  server.registerTool(
    "get_item",
    {
      title: "Detalhar um item",
      description:
        "Devolve o registro completo de um item pelo `id` retornado por search " +
        "(nos domínios *-openapi e participantes inclui o nó integral da spec em `detail`; " +
        "em pcm-additional-info devolve o registro completo, enquanto search devolve apenas um resumo). " +
        "Nos domínios *-openapi os `$ref` não vêm expandidos: o campo `refs` lista os ids dos " +
        "components referenciados (responses, parameters, schemas) — chame get_item neles para resolver.",
      inputSchema: {
        domain: domainIdSchema,
        id: z.string().describe("Id do item (vindo de search)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ domain, id }, extra) => {
      const d = findDomain(domain);
      if (!d) return errorText(`Domínio desconhecido: "${domain}". Válidos: ${validIds()}`);
      if (d.live) {
        try {
          const item = await d.live.getItem(id, extractContext(extra));
          if (!item) {
            return errorText(`Item não encontrado em ${domain}: "${id}". Use search para descobrir ids.`);
          }
          return text(item);
        } catch (err) {
          return errorText(`Falha ao obter dados de ${domain}: ${(err as Error).message}.`);
        }
      }
      try {
        const { data, stale, extractedAt } = await getDomainData(d, false, extractContext(extra));
        const item = d.getItem(data, id);
        if (!item) {
          return errorText(`Item não encontrado em ${domain}: "${id}". Use search para descobrir ids.`);
        }
        return text(stale ? { stale: true, staleNote: `cache de ${extractedAt}`, item } : item);
      } catch (err) {
        return errorText(`Falha ao obter dados de ${domain}: ${(err as Error).message}.`);
      }
    }
  );

  server.registerTool(
    "refresh",
    {
      title: "Re-extrair fontes",
      description:
        "Força re-extração das fontes públicas (ignora o TTL de 72h do cache). " +
        "Use quando suspeitar de dados desatualizados. Prefira passar `domain`: " +
        "sem ele o server atualiza o que couber em 45s e devolve o restante em " +
        "`pendentes`, que você deve refazer chamando refresh(domain) para cada id.",
      inputSchema: {
        domain: domainIdSchema.optional().describe("Id do domínio; omita para todos"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ domain }, extra) => {
      if (domain) {
        const d = findDomain(domain);
        if (!d) return errorText(`Domínio desconhecido: "${domain}". Válidos: ${validIds()}`);
        if (d.live) return errorText(`O domínio ${domain} é busca ao vivo: não há cache para re-extrair.`);
      }
      const targets = domains.filter(
        (d): d is ExtractedDomain => !d.live && (!domain || d.id === domain)
      );
      const report: Record<string, string> = {};
      const pendentes: string[] = [];
      const inicio = Date.now();
      for (const d of targets) {
        // O orçamento só corta a varredura de todos: quando o `domain` foi pedido
        // explicitamente, o trabalho é um só e vai até o fim.
        if (!domain && Date.now() - inicio > refreshBudgetMs) {
          pendentes.push(d.id);
          continue;
        }
        try {
          const { data, stale, extractedAt } = await getDomainData(d, true, extractContext(extra));
          report[d.id] = stale
            ? `erro: atualização falhou; cache anterior preservado (extraído em ${extractedAt})`
            : `ok: ${data.items.length} itens`;
        } catch (err) {
          report[d.id] = `erro: ${(err as Error).message}`;
        }
      }
      return text({
        atualizados: report,
        ...(pendentes.length > 0
          ? {
              pendentes,
              nota:
                `Parei em ${refreshBudgetMs / 1000}s para não estourar o timeout do cliente. ` +
                `Chame refresh(domain) para cada id em pendentes.`,
            }
          : {}),
      });
    }
  );

  return server;
}
