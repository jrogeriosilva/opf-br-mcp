import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeCache } from "../src/core/cache.js";
import { createServer } from "../src/core/server.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "opf-server-"));
  process.env.XDG_CACHE_HOME = dir;
});

afterEach(() => {
  delete process.env.XDG_CACHE_HOME;
  rmSync(dir, { recursive: true, force: true });
});

async function connectedClient() {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

function firstText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as Array<{ type: string; text: string }>;
  return content[0].text;
}

describe("opf-br-mcp server", () => {
  it("expõe as 4 tools", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_item",
      "list_domains",
      "refresh",
      "search",
    ]);
  });

  it("list_domains descreve domínios e filtros sem tocar a rede", async () => {
    const client = await connectedClient();
    const result = await client.callTool({ name: "list_domains", arguments: {} });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.map((d: { id: string }) => d.id)).toEqual([
      "pcm-additional-info",
      "payments-openapi",
    ]);
    expect(parsed[0].filters.map((f: { name: string }) => f.name)).toContain("field");
  });

  it("search usa cache semeado e devolve itens compactados", async () => {
    writeCache(
      "pcm-additional-info",
      {
        items: [
          {
            id: "1:tokenid",
            campo: "tokenId",
            definicao: "Token",
            regraDePreenchimento: null,
            metodos: ["POST"],
            endpoints: [],
            page: { pageId: "1", title: "Iniciação de Pagamentos", url: "u" },
          },
        ],
      },
      "0.1.0"
    );
    const client = await connectedClient();
    const result = await client.callTool({
      name: "search",
      arguments: { domain: "pcm-additional-info", filters: { field: "tokenId" } },
    });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.matches).toBe(1);
    // compactação: null e arrays vazios omitidos
    expect(parsed.results[0]).not.toHaveProperty("regraDePreenchimento");
    expect(parsed.results[0]).not.toHaveProperty("endpoints");
    expect(parsed.results[0].campo).toBe("tokenId");
  });

  it("domínio desconhecido retorna isError com os ids válidos", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "search",
      arguments: { domain: "nao-existe" },
    });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain("pcm-additional-info");
  });

  it("filtro inválido retorna isError listando filtros válidos", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "search",
      arguments: { domain: "pcm-additional-info", filters: { banana: "x" } },
    });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain("field");
  });

  it("get_item devolve o item completo do cache", async () => {
    writeCache(
      "payments-openapi",
      { items: [{ id: "payments:schema:X", type: "schema", name: "X", detail: { a: 1 } }] },
      "0.1.0"
    );
    const client = await connectedClient();
    const result = await client.callTool({
      name: "get_item",
      arguments: { domain: "payments-openapi", id: "payments:schema:X" },
    });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.detail).toEqual({ a: 1 });
  });
});
