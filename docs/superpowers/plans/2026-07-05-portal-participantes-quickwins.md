# Portal (busca ao vivo) + Participantes + Quick Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar busca ao vivo no Portal do Desenvolvedor (domínio `portal`), o domínio `participantes` (diretório público), e cinco quick wins de busca/cache/HTTP/paginação.

**Architecture:** O contrato `Domain` vira uma união discriminada `ExtractedDomain | LiveDomain` (discriminante: propriedade `live`). Domínios live consultam a fonte a cada chamada, sem cache/TTL/refresh. O restante segue o padrão existente: core genérico + domínios plugáveis, 4 tools fixas.

**Tech Stack:** TypeScript strict, ESM NodeNext, Node >= 20, vitest, zod, cheerio, @modelcontextprotocol/sdk.

**Spec:** `docs/superpowers/specs/2026-07-05-portal-participantes-quickwins-design.md`

## Global Constraints

- ESM com `NodeNext`: todo import relativo termina em `.js`.
- Testes **nunca** tocam a rede — fontes remotas viram fixtures em `test/fixtures/` ou `vi.stubGlobal("fetch", ...)`.
- Strings voltadas ao usuário, docs e mensagens de commit em português; prefixos conventional-commit (`feat:`, `fix:`, `test:`, `docs:`).
- Cada task termina com `npm test` e `npm run typecheck` passando.
- `src/core/version.ts` hardcoda `PACKAGE_VERSION` — manter em sincronia com `package.json` ao bumpar.
- Mensagens de commit terminam com o trailer `Claude-Session:` exigido pelo harness (se aplicável à sessão executora).

---

### Task 1: util de texto `normalize`/`matchesQuery`

**Files:**
- Create: `src/core/text.ts`
- Test: `src/core/text.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `normalize(s: string): string` (NFD sem diacríticos, lowercase) e `matchesQuery(haystack: string, query: string): boolean` (termos separados por whitespace, todos devem casar — AND). Tasks 2, 6 e 9 importam de `../../core/text.js` / `./text.js`.

- [ ] **Step 1: Write the failing test**

Criar `src/core/text.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { matchesQuery, normalize } from "./text.js";

describe("normalize", () => {
  it("remove acentos e baixa a caixa", () => {
    expect(normalize("Vínculo de Segurança")).toBe("vinculo de seguranca");
  });
});

describe("matchesQuery", () => {
  it("ignora acentos dos dois lados", () => {
    expect(matchesQuery("Regras do vínculo de dispositivo", "VINCULO")).toBe(true);
  });

  it("combina termos com AND", () => {
    expect(matchesQuery("Regras do vínculo de dispositivo", "vinculo dispositivo")).toBe(true);
    expect(matchesQuery("Regras do vínculo de dispositivo", "vinculo carro")).toBe(false);
  });

  it("query vazia ou só espaços casa tudo", () => {
    expect(matchesQuery("qualquer coisa", "")).toBe(true);
    expect(matchesQuery("qualquer coisa", "   ")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/text.test.ts`
Expected: FAIL — `Cannot find module './text.js'`

- [ ] **Step 3: Write minimal implementation**

Criar `src/core/text.ts`:

```ts
/** NFD sem diacríticos, lowercase — busca acento-insensível em conteúdo pt-BR. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Todos os termos da query (separados por whitespace) devem ocorrer no haystack (AND). */
export function matchesQuery(haystack: string, query: string): boolean {
  const h = normalize(haystack);
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => h.includes(normalize(term)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/text.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add src/core/text.ts src/core/text.test.ts
git commit -m "feat: util de busca acento-insensível com termos AND"
```

---

### Task 2: aplicar normalização nos quatro pontos de busca

**Files:**
- Modify: `src/domains/_openapi/domain.ts:44-65` (função `search`)
- Modify: `src/domains/_confluence-sections/domain.ts:97-115` (função `search`)
- Modify: `src/domains/pcm-openapi/index.ts:36-57` (função `search`)
- Modify: `src/domains/pcm-additional-info/index.ts:84-105` (função `search`)
- Test: `src/domains/_openapi/domain.test.ts`, `src/domains/_confluence-sections/domain.test.ts`

**Interfaces:**
- Consumes: `normalize`, `matchesQuery` de `../../core/text.js` (Task 1).
- Produces: comportamento de busca — filtros de substring e `query` acento-insensíveis; `query` multi-termo em AND. Assinaturas inalteradas.

- [ ] **Step 1: Write the failing tests**

Em `src/domains/_confluence-sections/domain.test.ts`, adicionar ao `describe`:

```ts
it("query ignora acentos e combina termos com AND", () => {
  const data: DomainData = {
    items: buildItems([
      {
        pageId: "7",
        title: "Página",
        url: "http://x",
        sections: [
          { heading: "Vínculo de Dispositivo", level: 2, content: "Regras de vínculo por aproximação." },
          { heading: "Outra seção", level: 2, content: "Nada relacionado." },
        ],
      },
    ]),
  };
  expect(domain.search(data, "vinculo dispositivo")).toHaveLength(1);
  expect(domain.search(data, "vinculo inexistente")).toEqual([]);
  expect(domain.search(data, undefined, { heading: "vinculo" })).toHaveLength(1);
});
```

Em `src/domains/_openapi/domain.test.ts`, adicionar ao `describe`:

```ts
it("query combina termos com AND", () => {
  // path "/pix/payments" contém os dois termos
  expect(domain.search(fixtureData(), "pix payments").length).toBeGreaterThan(0);
  expect(domain.search(fixtureData(), "pix zzz-inexistente")).toEqual([]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domains/_confluence-sections/domain.test.ts src/domains/_openapi/domain.test.ts`
Expected: FAIL — os novos testes quebram (busca atual é substring literal da frase inteira, com acento).

- [ ] **Step 3: Implement**

Em `src/domains/_openapi/domain.ts`, adicionar import e trocar o corpo de `search`:

```ts
import { matchesQuery, normalize } from "../../core/text.js";
```

```ts
    search(data, query, filters = {}) {
      const path = filters.path ? normalize(filters.path) : undefined;
      const method = filters.method?.toUpperCase();
      const schema = filters.schema ? normalize(filters.schema) : undefined;

      return data.items
        .filter((item) => {
          if (path && !normalize(String(item.path ?? "")).includes(path)) return false;
          if (method && item.method !== method) return false;
          if (schema && !normalize(String(item.name ?? "")).includes(schema)) return false;
          if (query?.trim()) {
            const haystack = [item.path, item.summary, item.description, item.name]
              .map((v) => String(v ?? ""))
              .join(" ");
            if (!matchesQuery(haystack, query)) return false;
          }
          return true;
        })
        .map(summarize);
    },
```

Em `src/domains/pcm-openapi/index.ts`, mesma mudança (import de `../../core/text.js` e corpo de `search` idêntico ao acima — este domínio não usa o factory por ter parser próprio, mas a lógica de busca é a mesma).

Em `src/domains/_confluence-sections/domain.ts`, adicionar import e trocar o corpo de `search`:

```ts
import { matchesQuery, normalize } from "../../core/text.js";
```

```ts
    search(data, query, filters = {}) {
      const page = filters.page ? normalize(filters.page) : undefined;
      const heading = filters.heading ? normalize(filters.heading) : undefined;
      const contains = filters.contains ? normalize(filters.contains) : undefined;

      return (data.items as ConfluenceSectionItem[])
        .filter((item) => {
          if (page && !normalize(item.page.title).includes(page)) return false;
          if (heading && !normalize(item.heading).includes(heading)) return false;
          if (contains && !normalize(item.content).includes(contains)) return false;
          if (query?.trim()) {
            if (!matchesQuery(`${item.heading} ${item.content}`, query)) return false;
          }
          return true;
        })
        .map(summarize);
    },
```

Em `src/domains/pcm-additional-info/index.ts`, adicionar import e trocar em `search` apenas `page`, `contains` e `q` (filtros `field`/`endpoint`/`method` ficam como estão):

```ts
import { matchesQuery, normalize } from "../../core/text.js";
```

```ts
  search(data, query, filters = {}) {
    const field = filters.field?.trim().toLowerCase();
    const contains = filters.contains ? normalize(filters.contains) : undefined;
    const endpoint = filters.endpoint?.toLowerCase();
    const method = filters.method?.toUpperCase();
    const page = filters.page ? normalize(filters.page) : undefined;

    return (data.items as PcmItem[]).filter((item) => {
      const campo = String(item.campo ?? "");
      if (page && !normalize(item.page.title).includes(page)) return false;
      if (field && campo.trim().toLowerCase() !== field) return false;
      if (contains && !normalize(`${campo} ${item.definicao ?? ""}`).includes(contains)) return false;
      if (endpoint && !item.endpoints.some((e) => e.toLowerCase().includes(endpoint))) return false;
      if (method && !item.metodos.some((m) => m.toUpperCase() === method)) return false;
      if (query?.trim()) {
        const haystack = `${campo} ${item.definicao ?? ""} ${item.regraDePreenchimento ?? ""}`;
        if (!matchesQuery(haystack, query)) return false;
      }
      return true;
    });
  },
```

- [ ] **Step 4: Run full suite**

Run: `npm test && npm run typecheck`
Expected: PASS (a suíte de contrato usa query de um só termo, segue passando)

- [ ] **Step 5: Commit**

```bash
git add src/domains/_openapi/domain.ts src/domains/_confluence-sections/domain.ts src/domains/pcm-openapi/index.ts src/domains/pcm-additional-info/index.ts src/domains/_openapi/domain.test.ts src/domains/_confluence-sections/domain.test.ts
git commit -m "feat: busca acento-insensível com termos AND em todos os domínios"
```

---

### Task 3: invalidação de cache por versão do pacote

**Files:**
- Modify: `src/core/data.ts:17-20`
- Modify: `src/core/data.test.ts` (seeds `"0.1.0"` → `PACKAGE_VERSION`, novos testes)
- Modify: `test/server.test.ts:104,143` (seeds `"0.1.0"` → `PACKAGE_VERSION`)

**Interfaces:**
- Consumes: `PACKAGE_VERSION` de `./version.js` (já importado em `data.ts`).
- Produces: cache com `packageVersion` ≠ atual é tratado como não-fresco (re-extrai), mas segue servindo como fallback stale.

- [ ] **Step 1: Write the failing tests**

Em `src/core/data.test.ts`, importar a versão e adicionar testes:

```ts
import { PACKAGE_VERSION } from "./version.js";
```

```ts
  it("cache de versão antiga do pacote é re-extraído", async () => {
    writeCache("fake", { items: [{ id: "velho" }] }, "0.0.1");
    const extract = vi.fn().mockResolvedValue({ items: [{ id: "novo" }] });
    const result = await getDomainData(fakeDomain(extract));
    expect(result.data.items[0].id).toBe("novo");
    expect(result.stale).toBe(false);
  });

  it("cache de versão antiga ainda serve como fallback stale", async () => {
    writeCache("fake", { items: [{ id: "velho" }] }, "0.0.1");
    const extract = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await getDomainData(fakeDomain(extract));
    expect(result.stale).toBe(true);
    expect(result.data.items[0].id).toBe("velho");
  });
```

E trocar os quatro seeds existentes `writeCache(..., "0.1.0")` por `writeCache(..., PACKAGE_VERSION)` (testes "usa cache fresco sem chamar extract", "force=true re-extrai", "cache expirado + extract falhando" — este último pode manter `"0.1.0"`, mas padronize com `PACKAGE_VERSION`; o TTL 0 já garante o cenário).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/data.test.ts`
Expected: FAIL — "cache de versão antiga do pacote é re-extraído" devolve `velho`.

- [ ] **Step 3: Implement**

Em `src/core/data.ts`, trocar a condição de cache fresco:

```ts
  const cached = readCache(domain.id);
  if (
    !force &&
    cached &&
    cached.packageVersion === PACKAGE_VERSION &&
    isFresh(cached, domain.ttlHours)
  ) {
    return { data: cached.data, extractedAt: cached.extractedAt, stale: false };
  }
```

- [ ] **Step 4: Fix seeds em `test/server.test.ts`**

Sem isso, os testes "search usa cache semeado" e "get_item devolve o item completo do cache" passariam a ignorar o cache e tocar a rede. Importar e usar a versão real:

```ts
import { PACKAGE_VERSION } from "../src/core/version.js";
```

Trocar os dois `"0.1.0"` (linhas ~104 e ~143) por `PACKAGE_VERSION`.

- [ ] **Step 5: Run full suite**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/data.ts src/core/data.test.ts test/server.test.ts
git commit -m "fix: cache de versão antiga do pacote é re-extraído (fallback stale preservado)"
```

---

### Task 4: `fetchWithRetry` não re-tenta 4xx (exceto 429)

**Files:**
- Modify: `src/core/http.ts:12-30`
- Test: `src/core/http.test.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces: mesmo contrato `fetchWithRetry(url, opts): Promise<Response>`; 4xx ≠ 429 lança imediatamente.

- [ ] **Step 1: Write the failing tests**

Em `src/core/http.test.ts`, adicionar ao `describe`:

```ts
  it("não re-tenta 4xx (erro permanente)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchWithRetry("https://example.test/x", { retryDelaysMs: [0, 0] })
    ).rejects.toThrow("HTTP 404");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("429 continua com retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: "Too Many Requests" })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: "OK" });
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("https://example.test/x", { retryDelaysMs: [0] });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/http.test.ts`
Expected: FAIL — 404 é chamado 3 vezes.

- [ ] **Step 3: Implement**

Novo corpo de `fetchWithRetry` em `src/core/http.ts` (separa erro de rede, que re-tenta, de status HTTP):

```ts
export async function fetchWithRetry(url: string, opts: RetryOptions): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= opts.retryDelaysMs.length; attempt++) {
    if (opts.signal?.aborted) break;
    if (attempt > 0) await sleep(opts.retryDelaysMs[attempt - 1]);
    const timeout = AbortSignal.timeout(30_000);
    const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await fetch(url, { headers: opts.headers, signal });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
    if (response.ok) return response;
    lastError = new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    // 4xx (exceto 429) é permanente: re-tentar não muda o resultado
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      throw lastError;
    }
  }
  throw lastError ?? new Error(`requisição cancelada: ${url}`);
}
```

- [ ] **Step 4: Run full suite**

Run: `npm test && npm run typecheck`
Expected: PASS (os testes existentes usam 503/erros de rede, seguem re-tentando)

- [ ] **Step 5: Commit**

```bash
git add src/core/http.ts src/core/http.test.ts
git commit -m "fix: fetchWithRetry não re-tenta 4xx (exceto 429)"
```

---

### Task 5: `offset` no search + descrição do `get_item`

**Files:**
- Modify: `src/core/server.ts:112-159` (inputSchema e handler do search), `src/core/server.ts:166-168` (descrição do get_item)
- Test: `test/server.test.ts`

**Interfaces:**
- Consumes: seeds de cache com `PACKAGE_VERSION` (Task 3).
- Produces: parâmetro `offset` (int ≥ 0, default 0) no tool `search`; a Task 8 reusa `off`/`max` no branch live.

- [ ] **Step 1: Write the failing test**

Em `test/server.test.ts`:

```ts
  it("offset pagina os resultados do search", async () => {
    writeCache(
      "payments-v4-openapi",
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
      arguments: { domain: "payments-v4-openapi", limit: 2, offset: 2 },
    });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.matches).toBe(3);
    expect(parsed.returned).toBe(1);
    expect(parsed.results.map((r: { id: string }) => r.id)).toEqual(["payments:GET /c"]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/server.test.ts`
Expected: FAIL — `offset` é ignorado, devolve `["payments:GET /a", "payments:GET /b"]`.

- [ ] **Step 3: Implement**

No inputSchema do `search` em `src/core/server.ts`, após `limit`:

```ts
        offset: z
          .number()
          .int()
          .min(0)
          .default(0)
          .describe("Pula os N primeiros resultados (paginação com limit)"),
```

No handler, receber `offset` e paginar:

```ts
    async ({ domain, query, filters, limit, offset }, extra) => {
```

```ts
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
```

Na descrição do `get_item` (linha ~166), trocar por:

```ts
      description:
        "Devolve o registro completo de um item pelo `id` retornado por search " +
        "(nos domínios *-openapi inclui o nó integral da spec em `detail`).",
```

- [ ] **Step 4: Run full suite**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/server.ts test/server.test.ts
git commit -m "feat: paginação com offset no search e descrição do get_item atualizada"
```

---

### Task 6: parser do diretório de participantes

**Files:**
- Create: `src/domains/participantes/parser.ts`
- Create: `test/fixtures/participants.json`
- Test: `src/domains/participantes/parser.test.ts`

**Interfaces:**
- Consumes: nada do core.
- Produces: `parseParticipants(jsonText: string): ParticipantItem[]` com `ParticipantItem = { id, name, cnpj, status, servers, serverNames: string[], apiFamilies: string[], detail: unknown }`. A Task 7 importa ambos de `./parser.js`.

- [ ] **Step 1: Criar a fixture**

`test/fixtures/participants.json` (formato real do diretório, abreviado — 2 organizações):

```json
[
  {
    "OrganisationId": "b43131be-6a7f-5bfb-b436-c3ac5c5c2dac",
    "Status": "Active",
    "OrganisationName": "EFI S.A. - INSTITUICAO DE PAGAMENTO",
    "RegistrationNumber": "09089356000118",
    "AuthorisationServers": [
      {
        "AuthorisationServerId": "as-1",
        "CustomerFriendlyName": "Efí S.A.",
        "ApiResources": [
          { "ApiResourceId": "r1", "ApiFamilyType": "payments", "ApiVersion": "4.0.0", "Status": "Active" },
          { "ApiResourceId": "r2", "ApiFamilyType": "payments-consents", "ApiVersion": "5.0.0", "Status": "Active" },
          { "ApiResourceId": "r3", "ApiFamilyType": "payments", "ApiVersion": "4.0.0", "Status": "Active" }
        ]
      },
      {
        "AuthorisationServerId": "as-2",
        "CustomerFriendlyName": "Efí Empresas",
        "ApiResources": [
          { "ApiResourceId": "r4", "ApiFamilyType": "automatic-payments", "ApiVersion": "2.0.0", "Status": "Active" }
        ]
      }
    ]
  },
  {
    "OrganisationId": "11111111-2222-3333-4444-555555555555",
    "Status": "Inactive",
    "OrganisationName": "INSTITUIÇÃO EXEMPLO CRÉDITO S.A.",
    "RegistrationNumber": "12345678000199",
    "AuthorisationServers": null
  }
]
```

- [ ] **Step 2: Write the failing test**

Criar `src/domains/participantes/parser.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseParticipants } from "./parser.js";

const json = readFileSync(
  new URL("../../../test/fixtures/participants.json", import.meta.url),
  "utf8"
);

describe("parseParticipants", () => {
  it("um item por organização, com id estável (OrganisationId)", () => {
    const items = parseParticipants(json);
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("b43131be-6a7f-5bfb-b436-c3ac5c5c2dac");
    expect(items[0].name).toBe("EFI S.A. - INSTITUICAO DE PAGAMENTO");
    expect(items[0].cnpj).toBe("09089356000118");
    expect(items[0].status).toBe("Active");
  });

  it("agrega famílias de API únicas e ordenadas de todos os servers", () => {
    const [efi] = parseParticipants(json);
    expect(efi.servers).toBe(2);
    expect(efi.serverNames).toEqual(["Efí S.A.", "Efí Empresas"]);
    expect(efi.apiFamilies).toEqual([
      "automatic-payments 2.0.0",
      "payments 4.0.0",
      "payments-consents 5.0.0",
    ]);
  });

  it("organização sem servers vira item com listas vazias", () => {
    const [, semServers] = parseParticipants(json);
    expect(semServers.servers).toBe(0);
    expect(semServers.apiFamilies).toEqual([]);
  });

  it("retém a organização completa em detail", () => {
    const [efi] = parseParticipants(json);
    expect((efi.detail as { OrganisationName: string }).OrganisationName).toBe(
      "EFI S.A. - INSTITUICAO DE PAGAMENTO"
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/domains/participantes/parser.test.ts`
Expected: FAIL — `Cannot find module './parser.js'`

- [ ] **Step 4: Implement**

Criar `src/domains/participantes/parser.ts`:

```ts
import type { Item } from "../../core/types.js";

interface ApiResource {
  ApiFamilyType?: string;
  ApiVersion?: string;
}

interface AuthorisationServer {
  CustomerFriendlyName?: string;
  ApiResources?: ApiResource[] | null;
}

interface Organisation {
  OrganisationId: string;
  OrganisationName?: string;
  RegistrationNumber?: string;
  Status?: string;
  AuthorisationServers?: AuthorisationServer[] | null;
}

export interface ParticipantItem extends Item {
  name: string;
  cnpj: string | null;
  status: string | null;
  servers: number;
  serverNames: string[];
  apiFamilies: string[];
  detail: unknown;
}

/** Um item por organização; famílias de API agregadas de todos os authorisation servers. */
export function parseParticipants(jsonText: string): ParticipantItem[] {
  const orgs = JSON.parse(jsonText) as Organisation[];
  return orgs.map((org) => {
    const servers = org.AuthorisationServers ?? [];
    const families = new Set<string>();
    for (const server of servers) {
      for (const resource of server.ApiResources ?? []) {
        if (!resource.ApiFamilyType) continue;
        families.add(
          resource.ApiVersion ? `${resource.ApiFamilyType} ${resource.ApiVersion}` : resource.ApiFamilyType
        );
      }
    }
    return {
      id: org.OrganisationId,
      name: org.OrganisationName ?? "",
      cnpj: org.RegistrationNumber ?? null,
      status: org.Status ?? null,
      servers: servers.length,
      serverNames: servers.map((s) => s.CustomerFriendlyName ?? "").filter(Boolean),
      apiFamilies: [...families].sort(),
      detail: org,
    };
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/domains/participantes/parser.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/domains/participantes/parser.ts src/domains/participantes/parser.test.ts test/fixtures/participants.json
git commit -m "feat: parser do diretório de participantes"
```

---

### Task 7: domínio `participantes` registrado

**Files:**
- Create: `src/domains/participantes/config.ts`
- Create: `src/domains/participantes/index.ts`
- Modify: `src/core/registry.ts`
- Modify: `test/contract.test.ts` (entrada no `fixtureData`)
- Modify: `README.md` (linha na tabela de domínios)

**Interfaces:**
- Consumes: `parseParticipants`/`ParticipantItem` (Task 6), `fetchWithRetry` de `../../core/http.js`, `normalize`/`matchesQuery` (Task 1).
- Produces: `participantesDomain: Domain` exportado de `src/domains/participantes/index.js`, registrado no registry.

- [ ] **Step 1: Write the failing test (contrato)**

Em `test/contract.test.ts`, adicionar no topo:

```ts
const participantsJson = readFileSync(new URL("./fixtures/participants.json", import.meta.url), "utf8");
```

```ts
import { parseParticipants } from "../src/domains/participantes/parser.js";
```

E no mapa `fixtureData`:

```ts
  "participantes": () => ({ items: parseParticipants(participantsJson) }),
```

- [ ] **Step 2: Implement config e domínio**

Criar `src/domains/participantes/config.ts`:

```ts
export const participantesConfig = {
  id: "participantes",
  title: "Diretório de Participantes",
  description:
    "Diretório público de participantes do Open Finance Brasil: organizações, marcas " +
    "(authorisation servers) e famílias de API suportadas com versões. Um item por organização. " +
    "search devolve resumo (nome, CNPJ, status, famílias de API); use get_item para o nó completo " +
    "com AuthorisationServers, endpoints e certificações.",
  url: "https://data.directory.openbankingbrasil.org.br/participants",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

Criar `src/domains/participantes/index.ts`:

```ts
import { fetchWithRetry } from "../../core/http.js";
import { matchesQuery, normalize } from "../../core/text.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { participantesConfig } from "./config.js";
import { parseParticipants, type ParticipantItem } from "./parser.js";

function summarize(item: Item): Item {
  const { detail: _detail, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export const participantesDomain: Domain = {
  id: participantesConfig.id,
  title: participantesConfig.title,
  description: participantesConfig.description,
  ttlHours: 24,
  filters: [
    { name: "name", description: "Substring no nome da organização ou na marca (CustomerFriendlyName)" },
    { name: "api", description: "Substring na família de API (ex.: payments, automatic-payments)" },
    { name: "status", description: "Status exato da organização (ex.: Active)" },
    { name: "cnpj", description: "Substring no CNPJ (RegistrationNumber, só dígitos)" },
  ],
  async extract(ctx): Promise<DomainData> {
    if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
    ctx?.onProgress?.(0, 1, "Baixando diretório de participantes");
    const response = await fetchWithRetry(participantesConfig.url, {
      retryDelaysMs: participantesConfig.retryDelaysMs,
      signal: ctx?.signal,
    });
    const jsonText = await response.text();
    ctx?.onProgress?.(1, 1);
    return { items: parseParticipants(jsonText) };
  },
  search(data, query, filters = {}) {
    const name = filters.name ? normalize(filters.name) : undefined;
    const api = filters.api ? normalize(filters.api) : undefined;
    const status = filters.status ? normalize(filters.status) : undefined;
    const cnpj = filters.cnpj?.replace(/\D/g, "");

    return (data.items as ParticipantItem[])
      .filter((item) => {
        if (name && !normalize([item.name, ...item.serverNames].join(" ")).includes(name)) return false;
        if (api && !item.apiFamilies.some((f) => normalize(f).includes(api))) return false;
        if (status && normalize(item.status ?? "") !== status) return false;
        if (cnpj && !(item.cnpj ?? "").includes(cnpj)) return false;
        if (query?.trim()) {
          const haystack = [item.name, ...item.serverNames, ...item.apiFamilies, item.cnpj ?? ""].join(" ");
          if (!matchesQuery(haystack, query)) return false;
        }
        return true;
      })
      .map(summarize);
  },
  getItem(data, id) {
    return data.items.find((i) => i.id === id) ?? null;
  },
};
```

Em `src/core/registry.ts`, importar e adicionar ao final do array:

```ts
import { participantesDomain } from "../domains/participantes/index.js";
```

```ts
  participantesDomain,
```

- [ ] **Step 3: Run full suite**

Run: `npm test && npm run typecheck`
Expected: PASS — a suíte de contrato valida `participantes` automaticamente.

- [ ] **Step 4: README**

Adicionar à tabela de domínios do `README.md`:

```markdown
| `participantes` | Diretório OFB (data.directory.openbankingbrasil.org.br) | Organizações participantes, marcas (authorisation servers) e famílias de API suportadas com versões — um item por organização |
```

- [ ] **Step 5: Commit**

```bash
git add src/domains/participantes/ src/core/registry.ts test/contract.test.ts README.md
git commit -m "feat: domínio participantes (diretório de participantes do OFB)"
```

---

### Task 8: contrato live (`ExtractedDomain | LiveDomain`) + branches no server + hint de zero-result

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/data.ts` (assinatura `ExtractedDomain`)
- Modify: `src/core/data.test.ts` (tipagem do `fakeDomain`)
- Modify: `src/core/server.ts` (list_domains, search, get_item, refresh)
- Modify: `src/domains/_openapi/domain.ts`, `src/domains/_confluence-sections/domain.ts` (tipo de retorno `ExtractedDomain`)
- Modify: `src/domains/pcm-additional-info/index.ts`, `src/domains/pcm-openapi/index.ts`, `src/domains/participantes/index.ts` (anotação `ExtractedDomain`)
- Modify: `test/contract.test.ts` (suíte extract só para domínios não-live)
- Test: `test/server.test.ts` (hint de zero-result)

**Interfaces:**
- Consumes: `offset`/paginação do search (Task 5).
- Produces: `Domain = ExtractedDomain | LiveDomain` (discriminante `live`); `LiveDomain.live = { search(query, filters?, ctx?): Promise<Item[]>, getItem(id, ctx?): Promise<Item | null> }`; `getDomainData(domain: ExtractedDomain, ...)`. A Task 9 implementa o primeiro `LiveDomain`.

- [ ] **Step 1: Write the failing test (hint)**

Em `test/server.test.ts`:

```ts
  it("search sem resultados inclui hint apontando o domínio portal", async () => {
    writeCache(
      "payments-v4-openapi",
      { items: [{ id: "payments:GET /a", type: "operation", path: "/a" }] },
      PACKAGE_VERSION
    );
    const client = await connectedClient();
    const result = await client.callTool({
      name: "search",
      arguments: { domain: "payments-v4-openapi", query: "zzz-sem-resultado" },
    });
    const parsed = JSON.parse(firstText(result));
    expect(parsed.matches).toBe(0);
    expect(parsed.hint).toContain("portal");
  });
```

Run: `npx vitest run test/server.test.ts` — Expected: FAIL (`hint` undefined).

- [ ] **Step 2: Novo `src/core/types.ts`**

Substituir a interface `Domain` (mantendo `FilterSpec`, `Item`, `DomainData`, `ExtractContext` como estão):

```ts
interface DomainBase {
  id: string;
  title: string;
  description: string;
  /** Filtros aceitos por search (pode ser vazio em domínios live). */
  filters: FilterSpec[];
}

/** Domínio extraído: extract() busca tudo, cache local com TTL, busca síncrona sobre os dados. */
export interface ExtractedDomain extends DomainBase {
  live?: undefined;
  ttlHours: number;
  /** Busca as fontes remotas e devolve os registros estruturados. */
  extract(ctx?: ExtractContext): Promise<DomainData>;
  /** Busca filtrada; pode devolver itens resumidos, mas sempre com `id`. */
  search(data: DomainData, query?: string, filters?: Record<string, string>): Item[];
  /** Registro completo por id estável (ids vêm dos resultados de search). */
  getItem(data: DomainData, id: string): Item | null;
}

/** Domínio ao vivo: consulta a fonte a cada chamada; sem cache/TTL/refresh. */
export interface LiveDomain extends DomainBase {
  live: {
    search(query: string, filters?: Record<string, string>, ctx?: ExtractContext): Promise<Item[]>;
    getItem(id: string, ctx?: ExtractContext): Promise<Item | null>;
  };
}

export type Domain = ExtractedDomain | LiveDomain;
```

- [ ] **Step 3: Ajustar anotações de tipo**

- `src/core/data.ts`: `import type { DomainData, ExtractContext, ExtractedDomain } from "./types.js";` e `getDomainData(domain: ExtractedDomain, ...)`.
- `src/core/data.test.ts`: `import type { ExtractedDomain } from "./types.js";` e

```ts
function fakeDomain(extract: ExtractedDomain["extract"], ttlHours = 24): ExtractedDomain {
```

- `src/domains/_openapi/domain.ts`: `createOpenApiDomain(config: OpenApiDomainConfig): ExtractedDomain` (trocar import de `Domain` por `ExtractedDomain`).
- `src/domains/_confluence-sections/domain.ts`: idem, `createConfluenceSectionsDomain(...): ExtractedDomain`.
- `src/domains/pcm-additional-info/index.ts`: `export const pcmDomain: ExtractedDomain = {...}`.
- `src/domains/pcm-openapi/index.ts`: `export const pcmOpenapiDomain: ExtractedDomain = {...}`.
- `src/domains/participantes/index.ts`: `export const participantesDomain: ExtractedDomain = {...}`.

- [ ] **Step 4: Branches live em `src/core/server.ts`**

`list_domains` — dentro do `domains.map`:

```ts
      const out = domains.map((d) => {
        if (d.live) {
          return { id: d.id, title: d.title, description: d.description, filters: d.filters, live: true };
        }
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
```

`search` — após a validação de filtros, antes do fluxo atual (o `else` é o fluxo existente da Task 5, agora com o hint):

```ts
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
      } catch (err) { /* inalterado */ }
```

Obs.: o hint cita `portal`, registrado na Task 9 (mesma branch, commits sequenciais).

`get_item` — após o `findDomain`:

```ts
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
```

`refresh` — trocar o cálculo de alvos:

```ts
      if (domain) {
        const d = findDomain(domain);
        if (!d) return errorText(`Domínio desconhecido: "${domain}". Válidos: ${validIds()}`);
        if (d.live) return errorText(`O domínio ${domain} é busca ao vivo: não há cache para re-extrair.`);
      }
      const targets = domains.filter(
        (d): d is ExtractedDomain => !d.live && (!domain || d.id === domain)
      );
```

Importar `ExtractedDomain` no server: `import type { Domain, ExtractContext, ExtractedDomain, Item } from "./types.js";`

Se o `if (d.live)` não estreitar o tipo no seu tsc, usar `if (d.live !== undefined)` — o discriminante é `live?: undefined` vs `live: {...}`.

- [ ] **Step 5: Suíte de contrato só para domínios extract**

Em `test/contract.test.ts`, trocar a linha do `describe.each`:

```ts
import type { DomainData, ExtractedDomain } from "../src/core/types.js";
```

```ts
const extractDomains = domains.filter((d): d is ExtractedDomain => d.live === undefined);

describe.each(extractDomains.map((d) => [d.id, d] as const))("contrato do domínio %s", (id, domain) => {
```

(o corpo dos testes fica igual; a conformidade dos domínios live entra na Task 9).

- [ ] **Step 6: Run full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, incluindo o teste do hint.

- [ ] **Step 7: Commit**

```bash
git add src/core/types.ts src/core/data.ts src/core/data.test.ts src/core/server.ts src/domains/_openapi/domain.ts src/domains/_confluence-sections/domain.ts src/domains/pcm-additional-info/index.ts src/domains/pcm-openapi/index.ts src/domains/participantes/index.ts test/contract.test.ts test/server.test.ts
git commit -m "feat: contrato de domínio live (ExtractedDomain | LiveDomain) e hint de zero-result"
```

---

### Task 9: domínio `portal` (busca CQL ao vivo)

**Files:**
- Modify: `src/core/confluence.ts` (devolver `title`)
- Create: `src/domains/portal/parser.ts`
- Create: `src/domains/portal/config.ts`
- Create: `src/domains/portal/index.ts`
- Create: `test/fixtures/portal-search.json`
- Modify: `src/core/registry.ts`
- Modify: `test/contract.test.ts` (bloco de conformidade live)
- Test: `src/domains/portal/parser.test.ts`

**Interfaces:**
- Consumes: `LiveDomain` (Task 8), `fetchWithRetry`, `fetchConfluencePage`, `parseSections` de `../_confluence-sections/parser.js`.
- Produces: `portalDomain: LiveDomain`; `buildCql(query: string, space: string): string`; `parseSearchResults(json: unknown, baseUrl: string): Item[]`.

- [ ] **Step 1: Fixture**

Criar `test/fixtures/portal-search.json` (resposta real da API de busca, abreviada; o terceiro resultado sem `content.id` testa o descarte):

```json
{
  "results": [
    {
      "content": { "id": "1282310227", "type": "page", "title": "Especificações additionalInfo Descontinuadas" },
      "title": "Especificações additionalInfo Descontinuadas",
      "excerpt": "Planilha de @@@hl@@@additionalInfo@@@endhl@@@ (v20)",
      "url": "/spaces/OF/pages/1282310227/Especifica+es+additionalInfo+Descontinuadas",
      "lastModified": "2025-11-18T13:52:28.000Z"
    },
    {
      "content": { "id": "873333409", "type": "page", "title": "Histórico - Tabela de AdditionalInfo PIX Automático" },
      "title": "Histórico - Tabela de AdditionalInfo PIX Automático",
      "excerpt": "Esta é a documentação legada, e deve ser consultada apenas para fins de histórico.",
      "url": "/spaces/OF/pages/873333409/Hist+rico+-+Tabela+de+AdditionalInfo+PIX+Autom+tico",
      "lastModified": "2025-10-01T10:00:00.000Z"
    },
    { "content": {}, "title": "sem content.id — deve ser ignorado", "excerpt": "", "url": "/x" }
  ]
}
```

- [ ] **Step 2: Write the failing tests (parser)**

Criar `src/domains/portal/parser.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCql, parseSearchResults } from "./parser.js";

const searchJson = JSON.parse(
  readFileSync(new URL("../../../test/fixtures/portal-search.json", import.meta.url), "utf8")
);

describe("buildCql", () => {
  it("monta o CQL com espaço e tipo page", () => {
    expect(buildCql("pix automatico", "OF")).toBe(
      'siteSearch ~ "pix automatico" AND type = page AND space = "OF"'
    );
  });

  it("escapa aspas e barras invertidas da query", () => {
    expect(buildCql('pagamento "instantâneo" a\\b', "OF")).toBe(
      'siteSearch ~ "pagamento \\"instantâneo\\" a\\\\b" AND type = page AND space = "OF"'
    );
  });
});

describe("parseSearchResults", () => {
  it("mapeia id, título, excerpt limpo, url absoluta e lastModified", () => {
    const items = parseSearchResults(searchJson, "https://x.test");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: "1282310227",
      title: "Especificações additionalInfo Descontinuadas",
      excerpt: "Planilha de additionalInfo (v20)",
      url: "https://x.test/wiki/spaces/OF/pages/1282310227/Especifica+es+additionalInfo+Descontinuadas",
      lastModified: "2025-11-18T13:52:28.000Z",
    });
  });

  it("ignora resultados sem content.id", () => {
    const ids = parseSearchResults(searchJson, "https://x.test").map((i) => i.id);
    expect(ids).toEqual(["1282310227", "873333409"]);
  });
});
```

Run: `npx vitest run src/domains/portal/parser.test.ts` — Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implement parser**

Criar `src/domains/portal/parser.ts`:

```ts
import type { Item } from "../../core/types.js";

interface CqlSearchResponse {
  results?: {
    content?: { id?: string; title?: string };
    title?: string;
    excerpt?: string;
    url?: string;
    lastModified?: string;
  }[];
}

/** CQL de busca no espaço, com aspas e barras invertidas da query escapadas. */
export function buildCql(query: string, space: string): string {
  const escaped = query.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `siteSearch ~ "${escaped}" AND type = page AND space = "${space}"`;
}

/** Um item por página encontrada; excerpt sem os marcadores de highlight (@@@hl@@@). */
export function parseSearchResults(json: unknown, baseUrl: string): Item[] {
  const results = (json as CqlSearchResponse).results ?? [];
  return results
    .filter((r) => r.content?.id)
    .map((r) => ({
      id: String(r.content!.id),
      title: r.content?.title ?? r.title ?? "",
      excerpt: (r.excerpt ?? "").replace(/@@@(end)?hl@@@/g, ""),
      url: r.url ? `${baseUrl}/wiki${r.url}` : null,
      lastModified: r.lastModified ?? null,
    }));
}
```

Run: `npx vitest run src/domains/portal/parser.test.ts` — Expected: PASS.

- [ ] **Step 4: `fetchConfluencePage` devolve `title`**

Em `src/core/confluence.ts`, adicionar `title` à interface e ao retorno:

```ts
interface ConfluenceResponse {
  title?: string;
  body?: { view?: { value?: string } };
  _links?: { webui?: string };
}
```

```ts
  return {
    html: json.body?.view?.value ?? "",
    title: json.title,
    url: `${baseUrl}/wiki${json._links?.webui ?? ""}`,
  };
```

E o tipo de retorno: `Promise<{ html: string; title?: string; url: string }>`. Chamadores existentes desestruturam `{ html, url }` — não quebram.

- [ ] **Step 5: Config e domínio**

Criar `src/domains/portal/config.ts`:

```ts
export const portalConfig = {
  id: "portal",
  title: "Portal do Desenvolvedor (busca ao vivo)",
  description:
    "Busca ao vivo em todo o Portal do Desenvolvedor do Open Finance Brasil (Confluence, espaço OF). " +
    "Use quando os domínios específicos não cobrirem o assunto. search exige query e consulta a fonte " +
    "a cada chamada (sempre atualizado, sem cache); get_item baixa a página inteira estruturada em seções.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  space: "OF",
  searchLimit: 25,
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

Criar `src/domains/portal/index.ts`:

```ts
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
```

Em `src/core/registry.ts`, importar e adicionar ao final do array:

```ts
import { portalDomain } from "../domains/portal/index.js";
```

```ts
  portalDomain,
```

- [ ] **Step 6: Bloco de conformidade live em `test/contract.test.ts`**

Adicionar imports (`vi`, `afterEach` de vitest; `LiveDomain` do types) e o bloco no fim do arquivo:

```ts
const portalSearchJson = readFileSync(new URL("./fixtures/portal-search.json", import.meta.url), "utf8");

// Todo domínio live novo DEVE registrar aqui um responder de fetch por URL.
const liveFixtureFetch: Record<string, (url: string) => unknown> = {
  portal: (url) =>
    url.includes("/rest/api/search")
      ? JSON.parse(portalSearchJson)
      : {
          title: "Página Fixture",
          body: { view: { value: segurancaHtml } },
          _links: { webui: "/spaces/OF/pages/1" },
        },
};

const liveDomains = domains.filter((d): d is LiveDomain => d.live !== undefined);

describe.each(liveDomains.map((d) => [d.id, d] as const))("contrato do domínio live %s", (id, domain) => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch() {
    const respond = liveFixtureFetch[id];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => respond(String(url)),
      }))
    );
  }

  it("tem metadados válidos", () => {
    expect(domain.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(domain.title.length).toBeGreaterThan(0);
    expect(domain.description.length).toBeGreaterThan(20);
  });

  it("tem fixture live registrada para os testes de conformidade", () => {
    expect(liveFixtureFetch[id], `registre fixture live para ${id} em test/contract.test.ts`).toBeDefined();
  });

  it("live.search devolve itens com ids únicos", async () => {
    stubFetch();
    const results = await domain.live.search("additionalInfo");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("live.getItem resolve todo id devolvido por live.search", async () => {
    stubFetch();
    for (const result of await domain.live.search("additionalInfo")) {
      expect(await domain.live.getItem(result.id)).not.toBeNull();
    }
  });
});
```

- [ ] **Step 7: Run full suite**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/core/confluence.ts src/domains/portal/ src/core/registry.ts test/fixtures/portal-search.json test/contract.test.ts
git commit -m "feat: domínio portal — busca CQL ao vivo no Portal do Desenvolvedor"
```

---

### Task 10: integração server↔portal, docs e bump de versão

**Files:**
- Test: `test/server.test.ts`
- Modify: `README.md`, `CLAUDE.md`
- Modify: `package.json`, `src/core/version.ts` (0.3.0 → 0.4.0)

**Interfaces:**
- Consumes: tudo das tasks anteriores.
- Produces: release 0.4.0 documentada.

- [ ] **Step 1: Write the failing tests (integração via MCP client)**

Em `test/server.test.ts`, adicionar imports (`readFileSync` de `node:fs`, `vi` de vitest) e no `afterEach` existente incluir `vi.unstubAllGlobals();`. Depois:

```ts
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
```

```ts
  it("list_domains marca o portal como live, sem estado de cache", async () => {
    const client = await connectedClient();
    const parsed = JSON.parse(firstText(await client.callTool({ name: "list_domains", arguments: {} })));
    const portal = parsed.find((d: { id: string }) => d.id === "portal");
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

  it("refresh no portal explica que domínio live não tem cache", async () => {
    const client = await connectedClient();
    const result = await client.callTool({ name: "refresh", arguments: { domain: "portal" } });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain("ao vivo");
  });
```

Obs.: não há teste MCP de `refresh` sem `domain` (re-extração de todos) porque dispararia as extrações reais dos 13 domínios extract com retries/delays reais — a exclusão dos live no cálculo de `targets` já é coberta por tipo e revisão.

Run: `npx vitest run test/server.test.ts` — Expected: PASS direto se as Tasks 8–9 estão corretas; qualquer FAIL aqui é regressão a corrigir antes de seguir.

- [ ] **Step 2: Docs**

`README.md`:
- Tabela de domínios, nova linha:

```markdown
| `portal` | Confluence público OFB (busca ao vivo) | Busca CQL em todo o Portal do Desenvolvedor (espaço OF) — sem cache, `query` obrigatória; fallback quando os domínios específicos não cobrem o assunto |
```

- Seção Tools: atualizar a assinatura do search para `search(domain, query?, filters?, limit?, offset?)` e acrescentar ao final da lista:

```markdown
Domínios marcados como `live` (ex.: `portal`) consultam a fonte a cada chamada:
não têm cache nem `refresh`, e `search` exige `query`. Quando um `search` em
domínio comum retorna 0 resultados, a resposta inclui um `hint` sugerindo o
`portal`.
```

`CLAUDE.md`, seção Architecture, atualizar o bullet de `src/core/types.ts` para:

```markdown
- `src/core/types.ts` — the `Domain` contract, a discriminated union: `ExtractedDomain` (`extract()` fetch + structure remote data, sync `search`/`getItem` over cached data, `ttlHours`) or `LiveDomain` (`live.search`/`live.getItem` hit the source on every call; no cache/refresh; `search` requires a query). Every result of either `search` has a stable `id`.
```

E na seção "Adding a new domain", acrescentar:

```markdown
4. Live domains (no `extract`) register a fetch responder in the `liveFixtureFetch` map of `test/contract.test.ts` instead of `fixtureData`.
```

- [ ] **Step 3: Bump 0.4.0**

- `package.json`: `"version": "0.4.0"`.
- `src/core/version.ts`: `export const PACKAGE_VERSION = "0.4.0";`

(Com a Task 3, o bump invalida caches gravados por 0.3.0 na próxima consulta.)

- [ ] **Step 4: Run full suite + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS; `dist/index.js` gerado.

- [ ] **Step 5: Commit**

```bash
git add test/server.test.ts README.md CLAUDE.md package.json src/core/version.ts
git commit -m "feat: integração do domínio portal no server, docs e versão 0.4.0"
```
