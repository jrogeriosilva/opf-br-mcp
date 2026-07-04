import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readCache } from "./cache.js";
import { getDomainData } from "./data.js";
import { domains } from "./registry.js";
import type { Domain, Item } from "./types.js";
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

export function createServer(): McpServer {
  const server = new McpServer({ name: "opf-br-mcp", version: PACKAGE_VERSION });

  server.registerTool(
    "list_domains",
    {
      description:
        "Lista os domínios de conhecimento do Open Finance Brasil disponíveis neste server, " +
        "com os filtros aceitos por cada um e o estado do cache local. " +
        "Comece por aqui; depois use search(domain, ...) e get_item(domain, id).",
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
      description:
        "Busca filtrada em um domínio. `filters` aceita as chaves listadas em list_domains " +
        "para o domínio (combinadas em AND); `query` busca substring nos campos textuais. " +
        "Retorno compacto (omite nulls). Cada resultado tem `id` para usar em get_item. " +
        "Na primeira consulta o domínio é extraído das fontes públicas (pode levar ~30s).",
      inputSchema: {
        domain: z.string().describe("Id do domínio (ver list_domains)"),
        query: z.string().optional().describe("Substring em campos textuais"),
        filters: z.record(z.string()).optional().describe("Filtros específicos do domínio"),
        limit: z.number().int().positive().optional().describe("Máx. de resultados (default 20)"),
      },
    },
    async ({ domain, query, filters, limit }) => {
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
        const { data, stale, extractedAt } = await getDomainData(d);
        const results = d.search(data, query, filters);
        const max = limit ?? 20;
        return text({
          matches: results.length,
          returned: Math.min(max, results.length),
          ...(stale ? { stale: true, staleNote: `Fontes inacessíveis; usando cache de ${extractedAt}` } : {}),
          results: results.slice(0, max).map(compact),
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
      description:
        "Devolve o registro completo de um item pelo `id` retornado por search " +
        "(no domínio payments-openapi inclui o nó integral da spec em `detail`).",
      inputSchema: {
        domain: z.string().describe("Id do domínio"),
        id: z.string().describe("Id do item (vindo de search)"),
      },
    },
    async ({ domain, id }) => {
      const d = findDomain(domain);
      if (!d) return errorText(`Domínio desconhecido: "${domain}". Válidos: ${validIds()}`);
      try {
        const { data, stale, extractedAt } = await getDomainData(d);
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
      description:
        "Força re-extração das fontes públicas (ignora o TTL de 24h do cache). " +
        "Sem `domain`, atualiza todos. Use quando suspeitar de dados desatualizados.",
      inputSchema: {
        domain: z.string().optional().describe("Id do domínio; omita para todos"),
      },
    },
    async ({ domain }) => {
      const targets = domain ? domains.filter((d) => d.id === domain) : domains;
      if (domain && targets.length === 0) {
        return errorText(`Domínio desconhecido: "${domain}". Válidos: ${validIds()}`);
      }
      const report: Record<string, string> = {};
      for (const d of targets) {
        try {
          const { data } = await getDomainData(d, true);
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
