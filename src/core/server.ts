import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { readCache } from "./cache.js";
import { getDomainData } from "./data.js";
import { domains } from "./registry.js";
import type { Domain, ExtractContext, Item } from "./types.js";
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

export function createServer(): McpServer {
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
        "com os filtros aceitos por cada um e o estado do cache local. " +
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
        const cached = readCache(d.id);
        return {
          id: d.id,
          title: d.title,
          description: d.description,
          filters: d.filters,
          cachedItems: cached?.data.items.length ?? 0,
          extractedAt: cached?.extractedAt ?? null,
        };
      });
      return text(out);
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
      try {
        const { data, stale, extractedAt } = await getDomainData(d, false, extractContext(extra));
        const results = d.search(data, query, filters);
        const max = limit ?? 20;
        const off = offset ?? 0;
        const page = results.slice(off, off + max);
        return text({
          matches: results.length,
          returned: page.length,
          ...(stale ? { stale: true, staleNote: `Fontes inacessíveis; usando cache de ${extractedAt}` } : {}),
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
        "(nos domínios *-openapi inclui o nó integral da spec em `detail`).",
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
        "Força re-extração das fontes públicas (ignora o TTL de 24h do cache). " +
        "Sem `domain`, atualiza todos. Use quando suspeitar de dados desatualizados.",
      inputSchema: {
        domain: domainIdSchema.optional().describe("Id do domínio; omita para todos"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ domain }, extra) => {
      const targets = domain ? domains.filter((d) => d.id === domain) : domains;
      if (domain && targets.length === 0) {
        return errorText(`Domínio desconhecido: "${domain}". Válidos: ${validIds()}`);
      }
      const report: Record<string, string> = {};
      for (const d of targets) {
        try {
          const { data } = await getDomainData(d, true, extractContext(extra));
          report[d.id] = `ok: ${data.items.length} itens`;
        } catch (err) {
          report[d.id] = `erro: ${(err as Error).message}`;
        }
      }
      return text(report);
    }
  );

  return server;
}
