import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readCache, writeCache } from "../src/core/cache.js";
import { domains } from "../src/core/registry.js";
import { PACKAGE_VERSION } from "../src/core/version.js";
import { createServer } from "../src/core/server.js";

// Ids esperados derivados da registry: o teste verifica que o servidor repassa
// os domínios registrados (ordem e conteúdo), sem exigir edição manual a cada
// novo domínio.
const domainIds = domains.map((d) => d.id);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "opf-server-"));
  process.env.XDG_CACHE_HOME = dir;
});

afterEach(() => {
  delete process.env.XDG_CACHE_HOME;
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

const portalSearchJson = readFileSync(
  new URL("./fixtures/portal-search.json", import.meta.url),
  "utf8"
);

function stubPortalFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () =>
        String(url).includes("/rest/api/search")
          ? JSON.parse(portalSearchJson)
          : {
              title: "Página",
              body: { view: { value: "<h2>Seção</h2><p>Conteúdo da seção.</p>" } },
              _links: { webui: "/spaces/OF/pages/1282310227" },
            },
    }))
  );
}

async function connectedClient(refreshBudgetMs?: number) {
  const server = createServer(refreshBudgetMs);
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

  it("tools de leitura anunciam readOnly, não-destrutivas e idempotentes; refresh não é readOnly", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    for (const name of ["list_domains", "search", "get_item"]) {
      expect(byName[name].annotations?.readOnlyHint, name).toBe(true);
      expect(byName[name].annotations?.destructiveHint, name).toBe(false);
      expect(byName[name].annotations?.idempotentHint, name).toBe(true);
    }
    expect(byName.refresh.annotations?.readOnlyHint).toBe(false);
    expect(byName.refresh.annotations?.destructiveHint).toBe(false);
    expect(byName.refresh.annotations?.idempotentHint).toBe(true);
  });

  it("search, get_item e refresh expõem os domínios válidos como enum no schema", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    for (const name of ["search", "get_item", "refresh"]) {
      const schema = byName[name].inputSchema as {
        properties?: Record<string, { enum?: string[] }>;
      };
      expect(schema.properties?.domain?.enum, name).toEqual(domainIds);
    }
  });

  it("list_domains descreve domínios e filtros sem tocar a rede", async () => {
    const client = await connectedClient();
    const result = await client.callTool({ name: "list_domains", arguments: {} });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.domains.map((d: { id: string }) => d.id)).toEqual(domainIds);
    expect(parsed.domains[0].filters.map((f: { name: string }) => f.name)).toContain("field");
  });

  // O list_domains deduplica os filtros comuns a uma família num `filterSets` no
  // topo. Se a referência quebrar (nome inexistente) ou a união divergir do que
  // `search` valida, o agente recebe um contrato falso: filtros anunciados que
  // são rejeitados, ou filtros aceitos que ele nunca descobre. Como `search`
  // valida contra `d.filters`, o invariante é comparar com essa mesma fonte.
  it("list_domains anuncia, por domínio, exatamente os filtros que search aceita", async () => {
    const client = await connectedClient();
    const parsed = JSON.parse(firstText(await client.callTool({ name: "list_domains", arguments: {} })));
    for (const d of domains) {
      const emitted = parsed.domains.find((x: { id: string }) => x.id === d.id);
      if (emitted.filterSet) {
        expect(parsed.filterSets[emitted.filterSet], `${d.id} referencia filterSet inexistente`).toBeDefined();
      }
      const anunciados = [
        ...(emitted.filters ?? []),
        ...(emitted.filterSet ? parsed.filterSets[emitted.filterSet] : []),
      ];
      expect(anunciados, `${d.id}`).toEqual(expect.arrayContaining(d.filters));
      expect(anunciados.length, `${d.id}`).toBe(d.filters.length);
      // A subtração compara name+description: um filtro próprio homônimo a um
      // herdado (mesmo nome, descrição diferente) sobreviveria à subtração e o
      // agente veria duas definições do mesmo filtro. As contas acima batem
      // nesse caso — só a unicidade dos nomes pega.
      const nomes = anunciados.map((f: { name: string }) => f.name);
      expect(new Set(nomes).size, `${d.id} anuncia nome de filtro duplicado`).toBe(nomes.length);
    }
  });

  it("list_domains identifica a versão do server e a spec de cada domínio", async () => {
    const client = await connectedClient();
    const parsed = JSON.parse(firstText(await client.callTool({ name: "list_domains", arguments: {} })));
    expect(parsed.server).toEqual({ name: "opf-br-mcp", version: PACKAGE_VERSION });
    const payments = parsed.domains.find((d: { id: string }) => d.id === "payments-v5-openapi");
    expect(payments.specVersion).toBe("5.0.0");
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
      PACKAGE_VERSION
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

  it("domínio desconhecido é rejeitado pela validação do schema com os ids válidos", async () => {
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
      "payments-v5-openapi",
      { items: [{ id: "payments:schema:X", type: "schema", name: "X", detail: { a: 1 } }] },
      PACKAGE_VERSION
    );
    const client = await connectedClient();
    const result = await client.callTool({
      name: "get_item",
      arguments: { domain: "payments-v5-openapi", id: "payments:schema:X" },
    });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.detail).toEqual({ a: 1 });
  });

  it("offset pagina os resultados do search", async () => {
    writeCache(
      "payments-v5-openapi",
      {
        items: [
          { id: "payments:GET /a", type: "operation", path: "/a" },
          { id: "payments:GET /b", type: "operation", path: "/b" },
          { id: "payments:GET /c", type: "operation", path: "/c" },
        ],
      },
      PACKAGE_VERSION
    );
    const client = await connectedClient();
    const result = await client.callTool({
      name: "search",
      arguments: { domain: "payments-v5-openapi", limit: 2, offset: 2 },
    });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.matches).toBe(3);
    expect(parsed.returned).toBe(1);
    expect(parsed.results.map((r: { id: string }) => r.id)).toEqual(["payments:GET /c"]);
  });

  it("search sem resultados inclui hint apontando o domínio portal", async () => {
    writeCache(
      "payments-v5-openapi",
      { items: [{ id: "payments:GET /a", type: "operation", path: "/a" }] },
      PACKAGE_VERSION
    );
    const client = await connectedClient();
    const result = await client.callTool({
      name: "search",
      arguments: { domain: "payments-v5-openapi", query: "zzz-sem-resultado" },
    });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.matches).toBe(0);
    expect(parsed.hint).toContain("portal");
  });

  it("list_domains marca o portal como live, sem estado de cache", async () => {
    const client = await connectedClient();
    const parsed = JSON.parse(firstText(await client.callTool({ name: "list_domains", arguments: {} })));
    const portal = parsed.domains.find((d: { id: string }) => d.id === "portal");
    expect(portal.live).toBe(true);
    expect(portal).not.toHaveProperty("extractedAt");
  });

  it("search no portal consulta a fonte ao vivo", async () => {
    stubPortalFetch();
    const client = await connectedClient();
    const result = await client.callTool({
      name: "search",
      arguments: { domain: "portal", query: "additionalInfo" },
    });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.matches).toBe(2);
    expect(parsed.results[0].id).toBe("1282310227");
    expect(parsed.results[0].excerpt).not.toContain("@@@hl@@@");
  });

  it("search no portal sem query retorna isError orientando", async () => {
    const client = await connectedClient();
    const result = await client.callTool({ name: "search", arguments: { domain: "portal" } });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain("query");
  });

  it("get_item no portal devolve a página em seções", async () => {
    stubPortalFetch();
    const client = await connectedClient();
    const result = await client.callTool({
      name: "get_item",
      arguments: { domain: "portal", id: "1282310227" },
    });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.sections.length).toBeGreaterThan(0);
    expect(parsed.sections[0].heading).toBe("Seção");
  });

  // Percorrer todos os domínios leva 3-4 min contra um timeout de 60s no cliente:
  // o trabalho terminava e mesmo assim o agente via timeout. Agora o refresh sem
  // `domain` faz o que cabe em 45s e devolve o resto para o agente retomar.
  it("refresh sem domain respeita o orçamento e devolve os pendentes", async () => {
    // Orçamento negativo esgota antes do primeiro domínio: ninguém extrai, nada
    // toca a rede. (Com 0 o primeiro domínio ainda passaria, porque no mesmo
    // milissegundo o decorrido é 0.)
    const client = await connectedClient(-1);
    const parsed = JSON.parse(firstText(await client.callTool({ name: "refresh", arguments: {} })));

    expect(parsed.atualizados).toEqual({});
    expect(parsed.pendentes).toEqual(domains.filter((d) => !d.live).map((d) => d.id));
    expect(parsed.nota).toContain("refresh(domain)");
  });

  it("refresh com domain explícito ignora o orçamento", async () => {
    // 404 é erro permanente: fetchWithRetry lança sem backoff, então a extração
    // falha rápido e o teste não espera os 30s de retry.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, statusText: "Not Found" }))
    );
    const client = await connectedClient(-1);
    const parsed = JSON.parse(
      firstText(await client.callTool({ name: "refresh", arguments: { domain: "mqd" } }))
    );

    // Foi tentado apesar do orçamento zerado, e não virou pendente.
    expect(Object.keys(parsed.atualizados)).toEqual(["mqd"]);
    expect(parsed.atualizados.mqd).toMatch(/^erro:/);
    expect(parsed.pendentes).toBeUndefined();
  });

  it("refresh com falha informa que preservou o cache anterior e sua data", async () => {
    const cached = writeCache("mqd", { items: [{ id: "anterior" }] }, PACKAGE_VERSION);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, statusText: "Not Found" }))
    );
    const client = await connectedClient();
    const parsed = JSON.parse(
      firstText(await client.callTool({ name: "refresh", arguments: { domain: "mqd" } }))
    );

    expect(parsed.atualizados.mqd).toBe(
      `erro: atualização falhou; cache anterior preservado (extraído em ${cached.extractedAt})`
    );
    expect(readCache("mqd")).toEqual(cached);
  });

  it("refresh no portal explica que domínio live não tem cache", async () => {
    const client = await connectedClient();
    const result = await client.callTool({ name: "refresh", arguments: { domain: "portal" } });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain("ao vivo");
  });
});
