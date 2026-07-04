# Domínio `consents-v3-openapi` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o domínio `consents-v3-openapi`, expondo a spec OpenAPI 3.3.1 da API de Consentimentos do Open Finance Brasil pelos 4 tools genéricos.

**Architecture:** Novo domínio em `src/domains/consents-v3-openapi/` espelhando `payments-v5-openapi/` (config + parser genérico + Domain), registrado em `src/core/registry.ts`, com fixture e entrada no suite de conformidade em `test/contract.test.ts`.

**Tech Stack:** TypeScript strict, ESM (NodeNext, imports com `.js`), vitest, lib `yaml`.

## Global Constraints

- ESM `NodeNext`: todo import relativo usa extensão `.js` explícita.
- Testes nunca acessam a rede — apenas fixtures em `test/fixtures/`.
- Strings, título, descrição e mensagens de commit em português.
- Commits com prefixos convencionais (`feat:`, `test:`, `docs:`).
- `specName` do consents = `"consents"`; `id` = `"consents-v3-openapi"`; `specVersion` = `"3.3.1"`.
- Fixture `test/fixtures/consents-v3-spec.yml` já foi copiada da spec real (98359 bytes) durante o planejamento — o parser gera exatamente 5 operações + 24 schemas a partir dela.

---

### Task 1: config, parser e Domain do consents-v3-openapi

**Files:**
- Create: `src/domains/consents-v3-openapi/config.ts`
- Create: `src/domains/consents-v3-openapi/parser.ts`
- Create: `src/domains/consents-v3-openapi/parser.test.ts`
- Create: `src/domains/consents-v3-openapi/index.ts`
- Create: `src/domains/consents-v3-openapi/index.test.ts`
- Pré-existente: `test/fixtures/consents-v3-spec.yml` (spec real, já copiada)

**Interfaces:**
- Consumes: `parseOpenApiSpec(yamlText: string, specName: string): Item[]` (cópia local), `fetchWithRetry` de `../../core/http.js`, tipos `Domain`, `DomainData`, `Item` de `../../core/types.js`.
- Produces: `export const consentsV3Domain: Domain` (id `"consents-v3-openapi"`) — consumido pela Task 2. `export const consentsV3Config`. `export function parseOpenApiSpec` (para a Task 2 importar no contract test).

- [ ] **Step 1: Criar `config.ts`**

```ts
export const consentsV3Config = {
  specName: "consents",
  specVersion: "3.3.1",
  url: "https://openbanking-brasil.github.io/openapi/swagger-apis/consents/3.3.1.yml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

- [ ] **Step 2: Criar `parser.ts` (cópia idêntica do parser genérico)**

```ts
import { parse } from "yaml";
import type { Item } from "../../core/types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

interface OpenApiSpec {
  paths?: Record<string, Record<string, unknown>>;
  components?: { schemas?: Record<string, Record<string, unknown>> };
}

export function parseOpenApiSpec(yamlText: string, specName: string): Item[] {
  const spec = parse(yamlText) as OpenApiSpec;
  const items: Item[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op) continue;
      items.push({
        id: `${specName}:${method.toUpperCase()} ${path}`,
        type: "operation",
        path,
        method: method.toUpperCase(),
        summary: op.summary ?? null,
        description: op.description ?? null,
        tags: op.tags ?? [],
        detail: op,
      });
    }
  }

  for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
    items.push({
      id: `${specName}:schema:${name}`,
      type: "schema",
      name,
      description: schema.description ?? null,
      required: schema.required ?? [],
      detail: schema,
    });
  }

  return items;
}
```

- [ ] **Step 3: Escrever o teste do parser (`parser.test.ts`) — deve falhar**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/consents-v3-spec.yml", import.meta.url),
  "utf8"
);

describe("parseOpenApiSpec (consents v3)", () => {
  it("gera as 5 operações da API Consents com ids estáveis", () => {
    const ops = parseOpenApiSpec(yamlText, "consents").filter((i) => i.type === "operation");
    expect(ops.map((i) => i.id)).toEqual([
      "consents:POST /consents",
      "consents:GET /consents/{consentId}",
      "consents:DELETE /consents/{consentId}",
      "consents:GET /consents/{consentId}/extensions",
      "consents:POST /consents/{consentId}/extends",
    ]);
  });

  it("gera os 24 schemas incluindo CreateConsent e ResponseConsent", () => {
    const schemas = parseOpenApiSpec(yamlText, "consents").filter((i) => i.type === "schema");
    expect(schemas).toHaveLength(24);
    expect(schemas.map((s) => s.name)).toContain("CreateConsent");
    expect(schemas.map((s) => s.name)).toContain("ResponseConsent");
  });

  it("operações carregam summary, method e o nó completo em detail", () => {
    const post = parseOpenApiSpec(yamlText, "consents").find(
      (i) => i.id === "consents:POST /consents"
    )!;
    expect(post.type).toBe("operation");
    expect(post.method).toBe("POST");
    expect(post.summary).toBe("Criar novo pedido de consentimento.");
    expect(post.detail).toHaveProperty("requestBody");
  });
});
```

- [ ] **Step 4: Rodar o teste do parser e confirmar que falha**

Run: `npx vitest run src/domains/consents-v3-openapi/parser.test.ts`
Expected: FAIL — `Cannot find module './parser.js'` só passa a existir se o Step 2 já foi salvo; se o parser já existe, este teste passa direto. (Ordem TDD: se preferir vê-lo falhar, escreva o teste antes do Step 2.)

- [ ] **Step 5: Rodar o teste do parser e confirmar que passa**

Run: `npx vitest run src/domains/consents-v3-openapi/parser.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 6: Criar `index.ts` (Domain)**

```ts
import { fetchWithRetry } from "../../core/http.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { consentsV3Config } from "./config.js";
import { parseOpenApiSpec } from "./parser.js";

function summarize(item: Item): Item {
  const { detail: _detail, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export const consentsV3Domain: Domain = {
  id: "consents-v3-openapi",
  title: `API de Consentimentos — spec OpenAPI ${consentsV3Config.specVersion}`,
  description:
    "Spec OpenAPI oficial da API de Consentimentos (Dados Cadastrais e Transacionais) do Open Finance Brasil, versão 3.3.1. " +
    "Cobre criação (POST /consents), consulta (GET /consents/{consentId}), revogação (DELETE /consents/{consentId}), " +
    "renovação (POST /consents/{consentId}/extends) e histórico de renovações (GET /consents/{consentId}/extensions). " +
    "Itens type=operation (um por método+path) e type=schema (payloads, ex.: CreateConsent, ResponseConsent, LoggedUser, BusinessEntity). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  ttlHours: 24,
  filters: [
    { name: "path", description: "Substring no path do endpoint (ex.: /consents/{consentId})" },
    { name: "method", description: "Verbo HTTP exato (ex.: POST)" },
    { name: "schema", description: "Substring no nome do schema (case-insensitive)" },
  ],
  async extract(ctx): Promise<DomainData> {
    if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
    ctx?.onProgress?.(0, 1, `Baixando spec ${consentsV3Config.specName} ${consentsV3Config.specVersion}`);
    const response = await fetchWithRetry(consentsV3Config.url, {
      retryDelaysMs: consentsV3Config.retryDelaysMs,
      signal: ctx?.signal,
    });
    const yamlText = await response.text();
    ctx?.onProgress?.(1, 1);
    return { items: parseOpenApiSpec(yamlText, consentsV3Config.specName) };
  },
  search(data, query, filters = {}) {
    const path = filters.path?.toLowerCase();
    const method = filters.method?.toUpperCase();
    const schema = filters.schema?.toLowerCase();
    const q = query?.toLowerCase();

    return data.items
      .filter((item) => {
        if (path && !String(item.path ?? "").toLowerCase().includes(path)) return false;
        if (method && item.method !== method) return false;
        if (schema && !String(item.name ?? "").toLowerCase().includes(schema)) return false;
        if (q) {
          const haystack = [item.path, item.summary, item.description, item.name]
            .map((v) => String(v ?? ""))
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
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

- [ ] **Step 7: Escrever o teste do Domain (`index.test.ts`)**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { consentsV3Domain } from "./index.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/consents-v3-spec.yml", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return { items: parseOpenApiSpec(yamlText, "consents") };
}

describe("consentsV3Domain", () => {
  it("tem id versionado v3", () => {
    expect(consentsV3Domain.id).toBe("consents-v3-openapi");
  });

  it("search devolve resumos sem detail, mas com id", () => {
    const results = consentsV3Domain.search(fixtureData(), undefined, { method: "DELETE" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("consents:DELETE /consents/{consentId}");
    expect(results[0]).not.toHaveProperty("detail");
  });

  it("filtro path e schema funcionam", () => {
    expect(
      consentsV3Domain.search(fixtureData(), undefined, { path: "/extends" })
    ).toHaveLength(1);
    const schemas = consentsV3Domain.search(fixtureData(), undefined, { schema: "createconsent" });
    expect(schemas.map((s) => s.name)).toContain("CreateConsent");
  });

  it("query busca em path, summary, description e nome de schema", () => {
    const results = consentsV3Domain.search(fixtureData(), "revogar");
    expect(results.some((r) => r.id === "consents:DELETE /consents/{consentId}")).toBe(true);
  });

  it("getItem devolve o item completo com detail", () => {
    const item = consentsV3Domain.getItem(fixtureData(), "consents:schema:CreateConsent");
    expect(item).not.toBeNull();
    expect(item!.detail).toHaveProperty("properties");
  });
});
```

- [ ] **Step 8: Rodar os testes do domínio e confirmar que passam**

Run: `npx vitest run src/domains/consents-v3-openapi/`
Expected: PASS (parser.test.ts + index.test.ts, todos verdes).

- [ ] **Step 9: Commit**

```bash
git add src/domains/consents-v3-openapi/ test/fixtures/consents-v3-spec.yml
git commit -m "feat: domínio consents-v3-openapi"
```

---

### Task 2: Registro, conformidade e docs

**Files:**
- Modify: `src/core/registry.ts`
- Modify: `test/contract.test.ts`
- Modify: `README.md:14` (adicionar linha na tabela de domínios)

**Interfaces:**
- Consumes: `consentsV3Domain` de `../domains/consents-v3-openapi/index.js`; `parseOpenApiSpec` de `../src/domains/consents-v3-openapi/parser.js`; fixture `test/fixtures/consents-v3-spec.yml`.
- Produces: nada consumido por tarefas posteriores (tarefa final).

- [ ] **Step 1: Registrar o domínio em `src/core/registry.ts`**

Adicionar o import junto aos demais e incluir na lista `domains`:

```ts
import { consentsV3Domain } from "../domains/consents-v3-openapi/index.js";
```

```ts
export const domains: Domain[] = [
  pcmDomain,
  paymentsDomain,
  paymentsV5Domain,
  enrollmentsV2Domain,
  automaticPaymentsV2Domain,
  consentsV3Domain,
];
```

- [ ] **Step 2: Registrar fixture no `test/contract.test.ts`**

Adicionar o import do parser (junto aos demais imports de parser no topo):

```ts
import { parseOpenApiSpec as parseConsentsV3 } from "../src/domains/consents-v3-openapi/parser.js";
```

Adicionar a leitura da fixture (junto às demais leituras de fixture):

```ts
const consentsV3Yaml = readFileSync(new URL("./fixtures/consents-v3-spec.yml", import.meta.url), "utf8");
```

Adicionar a entrada no mapa `fixtureData`:

```ts
"consents-v3-openapi": () => ({ items: parseConsentsV3(consentsV3Yaml, "consents") }),
```

Nota: o import é aliasado (`parseConsentsV3`) porque `parseOpenApiSpec` já é importado de `payments-v4-openapi/parser.js` no topo do arquivo — reusar aquele símbolo também funcionaria (o parser é idêntico), mas o alias deixa explícito de qual domínio vem a fixture.

- [ ] **Step 3: Rodar o suite de conformidade completo**

Run: `npx vitest run test/contract.test.ts`
Expected: PASS — o bloco `describe.each` inclui agora `contrato do domínio consents-v3-openapi` com todos os testes verdes (metadados, fixture registrada, ids únicos, getItem resolve todo id de search, query sem match devolve vazio).

- [ ] **Step 4: Atualizar a tabela de domínios no `README.md`**

Inserir após a linha 14 (`automatic-payments-v2-openapi`):

```markdown
| `consents-v3-openapi` | GitHub Pages openbanking-brasil.github.io | Spec OpenAPI 3.3.1 da API de Consentimentos (Dados Cadastrais e Transacionais) |
```

- [ ] **Step 5: Rodar suite completo + typecheck**

Run: `npm test && npm run typecheck`
Expected: todos os testes PASS e `tsc --noEmit` sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/core/registry.ts test/contract.test.ts README.md
git commit -m "feat: registrar consents-v3-openapi e atualizar README"
```

---

## Self-Review

**1. Spec coverage:**
- Fonte github.io → Task 1 Step 1 (config.url). ✓
- 5 operações + 24 schemas via parser genérico → Task 1 Steps 2–5. ✓
- id `consents-v3-openapi`, filtros path/method/schema, search resumido / getItem completo → Task 1 Steps 6–8. ✓
- description precisa (endpoints e schemas reais) → Task 1 Step 6. ✓
- Registro no registry → Task 2 Step 1. ✓
- Fixture + entrada no contract test → Task 2 Step 2. ✓
- README → Task 2 Step 4. ✓
- Parser duplicado (não extraído) → Task 1 Step 2 segue a decisão do spec. ✓

**2. Placeholder scan:** nenhum TBD/TODO; todo passo de código traz o código completo. ✓

**3. Type consistency:** `parseOpenApiSpec(yamlText, "consents")`, `consentsV3Domain`, `consentsV3Config`, ids `consents:POST /consents` etc. usados de forma consistente entre Task 1 e Task 2. O alias `parseConsentsV3` no contract test é intencional e documentado. ✓
