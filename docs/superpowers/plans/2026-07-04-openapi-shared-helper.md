# Helper OpenAPI compartilhado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colapsar a lógica duplicada dos 5 domínios OpenAPI numa factory + parser compartilhados em `src/domains/_openapi/`, sem mudança de comportamento observável.

**Architecture:** Um módulo `_openapi/` (prefixo `_` = não-registrável) expõe `parseOpenApiSpec` (movido, byte-idêntico) e `createOpenApiDomain(config)`. Cada domínio passa a ser só um `config.ts` completo + um `index.ts` de uma linha. `registry.ts` não muda.

**Tech Stack:** TypeScript strict, ESM (NodeNext, imports com `.js`), vitest, yaml.

## Global Constraints

- ESM com `NodeNext`: imports relativos precisam de extensão `.js` explícita.
- Testes nunca acessam a rede; usam fixtures em `test/fixtures/`.
- Zero mudança de comportamento: mesmos `id`s, textos de `title`/`description` verbatim, `registry.ts` intacto, sem bump de versão.
- Commits em português com prefixo conventional-commit; terminar a mensagem com `Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE`.
- Nomes exportados dos domínios preservados: `paymentsDomain`, `paymentsV5Domain`, `enrollmentsV2Domain`, `automaticPaymentsV2Domain`, `consentsV3Domain`.
- `ttlHours` é `24` nos 5 domínios — a factory fixa `24`.

---

## File Structure

- Create `src/domains/_openapi/parser.ts` — `parseOpenApiSpec` (movido de qualquer domínio; são idênticos).
- Create `src/domains/_openapi/domain.ts` — `OpenApiDomainConfig` + `createOpenApiDomain`.
- Create `src/domains/_openapi/parser.test.ts` — teste único do parser (fixture `payments-spec.yml`).
- Create `src/domains/_openapi/domain.test.ts` — teste único da factory (fixture `payments-spec.yml`).
- Modify os 5 `config.ts` → objeto completo tipado `OpenApiDomainConfig`.
- Modify os 5 `index.ts` → uma linha chamando a factory.
- Delete os 5 `parser.ts` por-domínio; delete `parser.test.ts`/`index.test.ts` de `payments-v4`, `payments-v5`, `consents-v3`.
- `src/core/registry.ts` — inalterado.

---

## Task 1: Módulo compartilhado `_openapi/` (parser + factory)

**Files:**
- Create: `src/domains/_openapi/parser.ts`
- Create: `src/domains/_openapi/domain.ts`
- Create: `src/domains/_openapi/parser.test.ts`
- Create: `src/domains/_openapi/domain.test.ts`

**Interfaces:**
- Consumes: `Item`, `Domain`, `DomainData`, `ExtractContext` de `../../core/types.js`; `fetchWithRetry` de `../../core/http.js`; `parse` de `yaml`.
- Produces:
  - `parseOpenApiSpec(yamlText: string, specName: string): Item[]`
  - `interface OpenApiDomainConfig { id: string; title: string; description: string; pathExample: string; specName: string; specVersion: string; url: string; retryDelaysMs: number[]; }`
  - `createOpenApiDomain(config: OpenApiDomainConfig): Domain`

- [ ] **Step 1: Criar `parser.ts` (conteúdo idêntico ao atual)**

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

- [ ] **Step 2: Criar `domain.ts` (factory)**

```ts
import { fetchWithRetry } from "../../core/http.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { parseOpenApiSpec } from "./parser.js";

export interface OpenApiDomainConfig {
  id: string;
  title: string;
  description: string;
  /** Exemplo interpolado no filters[0].description (ex.: "/pix/payments"). */
  pathExample: string;
  specName: string;
  specVersion: string;
  url: string;
  retryDelaysMs: number[];
}

function summarize(item: Item): Item {
  const { detail: _detail, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export function createOpenApiDomain(config: OpenApiDomainConfig): Domain {
  return {
    id: config.id,
    title: config.title,
    description: config.description,
    ttlHours: 24,
    filters: [
      { name: "path", description: `Substring no path do endpoint (ex.: ${config.pathExample})` },
      { name: "method", description: "Verbo HTTP exato (ex.: POST)" },
      { name: "schema", description: "Substring no nome do schema (case-insensitive)" },
    ],
    async extract(ctx): Promise<DomainData> {
      if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
      ctx?.onProgress?.(0, 1, `Baixando spec ${config.specName} ${config.specVersion}`);
      const response = await fetchWithRetry(config.url, {
        retryDelaysMs: config.retryDelaysMs,
        signal: ctx?.signal,
      });
      const yamlText = await response.text();
      ctx?.onProgress?.(1, 1);
      return { items: parseOpenApiSpec(yamlText, config.specName) };
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
}
```

- [ ] **Step 3: Criar `parser.test.ts` (porta do teste atual)**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-spec.yml", import.meta.url),
  "utf8"
);

describe("parseOpenApiSpec", () => {
  it("gera um item por operação e por schema", () => {
    const items = parseOpenApiSpec(yamlText, "payments");
    expect(items.map((i) => i.id)).toEqual([
      "payments:POST /pix/payments",
      "payments:GET /pix/payments/{paymentId}",
      "payments:schema:CreatePixPayment",
      "payments:schema:PixPayment",
    ]);
  });

  it("operações carregam summary e o nó completo em detail", () => {
    const post = parseOpenApiSpec(yamlText, "payments")[0];
    expect(post.type).toBe("operation");
    expect(post.method).toBe("POST");
    expect(post.summary).toBe("Criar iniciação de pagamento");
    expect(post.detail).toHaveProperty("requestBody");
  });

  it("schemas carregam description, required e detail", () => {
    const items = parseOpenApiSpec(yamlText, "payments");
    const schema = items.find((i) => i.id === "payments:schema:CreatePixPayment")!;
    expect(schema.type).toBe("schema");
    expect(schema.required).toEqual(["data"]);
    expect(schema.detail).toHaveProperty("properties");
  });
});
```

- [ ] **Step 4: Criar `domain.test.ts` (porta do index.test.ts atual, via factory)**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { createOpenApiDomain, type OpenApiDomainConfig } from "./domain.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-spec.yml", import.meta.url),
  "utf8"
);

const config: OpenApiDomainConfig = {
  id: "test-openapi",
  title: "Spec de teste",
  description: "fixture",
  pathExample: "/pix/payments",
  specName: "payments",
  specVersion: "0.0.0",
  url: "https://example.invalid/spec.yml",
  retryDelaysMs: [1],
};

const domain = createOpenApiDomain(config);

function fixtureData(): DomainData {
  return { items: parseOpenApiSpec(yamlText, "payments") };
}

describe("createOpenApiDomain", () => {
  it("propaga id, title e filtros com o pathExample", () => {
    expect(domain.id).toBe("test-openapi");
    expect(domain.title).toBe("Spec de teste");
    expect(domain.ttlHours).toBe(24);
    expect(domain.filters[0].description).toContain("/pix/payments");
  });

  it("search devolve resumos sem detail, mas com id", () => {
    const results = domain.search(fixtureData(), undefined, { method: "POST" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("payments:POST /pix/payments");
    expect(results[0]).not.toHaveProperty("detail");
  });

  it("filtro path e schema funcionam", () => {
    expect(domain.search(fixtureData(), undefined, { path: "{paymentId}" })).toHaveLength(1);
    const schemas = domain.search(fixtureData(), undefined, { schema: "pix" });
    expect(schemas.map((s) => s.name)).toEqual(["CreatePixPayment", "PixPayment"]);
  });

  it("query busca em path, summary, description e nome de schema", () => {
    const results = domain.search(fixtureData(), "consentida");
    expect(results).toHaveLength(1);
    expect(results[0].method).toBe("POST");
  });

  it("getItem devolve o item completo com detail", () => {
    const item = domain.getItem(fixtureData(), "payments:schema:CreatePixPayment");
    expect(item).not.toBeNull();
    expect(item!.detail).toHaveProperty("properties");
  });
});
```

- [ ] **Step 5: Rodar os testes novos e o typecheck**

Run: `npx vitest run src/domains/_openapi/ && npm run typecheck`
Expected: PASS (8 testes) e typecheck limpo.

- [ ] **Step 6: Commit**

```bash
git add src/domains/_openapi/
git commit -m "feat: módulo _openapi compartilhado (parser + factory createOpenApiDomain)

Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE"
```

---

## Task 2: Migrar os 5 domínios para a factory

**Files:**
- Modify: `src/domains/payments-v4-openapi/config.ts`, `.../index.ts`; Delete `.../parser.ts`, `.../parser.test.ts`, `.../index.test.ts`
- Modify: `src/domains/payments-v5-openapi/config.ts`, `.../index.ts`; Delete `.../parser.ts`, `.../parser.test.ts`, `.../index.test.ts`
- Modify: `src/domains/enrollments-v2-openapi/config.ts`, `.../index.ts`; Delete `.../parser.ts`
- Modify: `src/domains/automatic-payments-v2-openapi/config.ts`, `.../index.ts`; Delete `.../parser.ts`
- Modify: `src/domains/consents-v3-openapi/config.ts`, `.../index.ts`; Delete `.../parser.ts`, `.../parser.test.ts`, `.../index.test.ts`

**Interfaces:**
- Consumes: `createOpenApiDomain`, `OpenApiDomainConfig` de `../_openapi/domain.js`.
- Produces: exports inalterados `paymentsDomain`, `paymentsV5Domain`, `enrollmentsV2Domain`, `automaticPaymentsV2Domain`, `consentsV3Domain`.

- [ ] **Step 1: `payments-v4-openapi` — reescrever `config.ts`**

```ts
import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const paymentsConfig: OpenApiDomainConfig = {
  id: "payments-v4-openapi",
  title: "API de Pagamentos — spec OpenAPI 4.0.0",
  description:
    "Spec OpenAPI oficial da API de Pagamentos (Pix) do Open Finance Brasil. " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/pix/payments",
  specName: "payments",
  specVersion: "4.0.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/openapi/main/swagger-apis/payments/4.0.0.yml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

- [ ] **Step 2: `payments-v4-openapi` — reescrever `index.ts` e apagar arquivos mortos**

`index.ts`:

```ts
import { createOpenApiDomain } from "../_openapi/domain.js";
import { paymentsConfig } from "./config.js";

export const paymentsDomain = createOpenApiDomain(paymentsConfig);
```

Depois:

```bash
git rm src/domains/payments-v4-openapi/parser.ts \
       src/domains/payments-v4-openapi/parser.test.ts \
       src/domains/payments-v4-openapi/index.test.ts
```

- [ ] **Step 3: `payments-v5-openapi` — reescrever `config.ts`**

```ts
import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const paymentsV5Config: OpenApiDomainConfig = {
  id: "payments-v5-openapi",
  title: "API de Pagamentos — spec OpenAPI 5.0.0",
  description:
    "Spec OpenAPI oficial da API de Iniciação de Pagamentos (Pix) do Open Finance Brasil, versão 5. " +
    "Inclui endpoints de consentimento (/consents) e de pagamento (/pix/payments). " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/pix/payments",
  specName: "payments",
  specVersion: "5.0.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_payment_initiation_-_open_finance_brasil/5.0.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

- [ ] **Step 4: `payments-v5-openapi` — `index.ts` e apagar arquivos mortos**

`index.ts`:

```ts
import { createOpenApiDomain } from "../_openapi/domain.js";
import { paymentsV5Config } from "./config.js";

export const paymentsV5Domain = createOpenApiDomain(paymentsV5Config);
```

Depois:

```bash
git rm src/domains/payments-v5-openapi/parser.ts \
       src/domains/payments-v5-openapi/parser.test.ts \
       src/domains/payments-v5-openapi/index.test.ts
```

- [ ] **Step 5: `enrollments-v2-openapi` — reescrever `config.ts`**

```ts
import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const enrollmentsV2Config: OpenApiDomainConfig = {
  id: "enrollments-v2-openapi",
  title: "API de Vínculo de Dispositivo (Enrollments) — spec OpenAPI 2.2.0",
  description:
    "Spec OpenAPI oficial da API de Enrollments (Vínculo de Dispositivo) do Open Finance Brasil, versão 2. " +
    "Cobre o pagamento sem redirecionamento: vínculo de dispositivos (FIDO), autorização de consentimentos e Pix Automático. " +
    "Endpoints /enrollments, /consents/{consentId}/authorise e /recurring-consents/{recurringConsentId}/authorise. " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/enrollments",
  specName: "enrollments",
  specVersion: "2.2.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_enrollments_for_payment_initiation_-_open_finance_brasil/2.2.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

- [ ] **Step 6: `enrollments-v2-openapi` — `index.ts` e apagar `parser.ts`**

`index.ts`:

```ts
import { createOpenApiDomain } from "../_openapi/domain.js";
import { enrollmentsV2Config } from "./config.js";

export const enrollmentsV2Domain = createOpenApiDomain(enrollmentsV2Config);
```

Depois:

```bash
git rm src/domains/enrollments-v2-openapi/parser.ts
```

- [ ] **Step 7: `automatic-payments-v2-openapi` — reescrever `config.ts`**

```ts
import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const automaticPaymentsV2Config: OpenApiDomainConfig = {
  id: "automatic-payments-v2-openapi",
  title: "API de Pagamentos Automáticos (Automatic Payments) — spec OpenAPI 2.2.0",
  description:
    "Spec OpenAPI oficial da API de Automatic Payments do Open Finance Brasil, versão 2. " +
    "Cobre a iniciação de pagamentos automáticos (Pix Automático e Transferências Inteligentes) mediante consentimento recorrente. " +
    "Endpoints /recurring-consents (criação, consulta e edição/revogação) e /pix/recurring-payments (criação, retry, consulta e cancelamento); scope recurring-payments. " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/pix/recurring-payments",
  specName: "automatic-payments",
  specVersion: "2.2.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_automatic_payments_-_open_finance_brasil/2.2.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

- [ ] **Step 8: `automatic-payments-v2-openapi` — `index.ts` e apagar `parser.ts`**

`index.ts`:

```ts
import { createOpenApiDomain } from "../_openapi/domain.js";
import { automaticPaymentsV2Config } from "./config.js";

export const automaticPaymentsV2Domain = createOpenApiDomain(automaticPaymentsV2Config);
```

Depois:

```bash
git rm src/domains/automatic-payments-v2-openapi/parser.ts
```

- [ ] **Step 9: `consents-v3-openapi` — reescrever `config.ts`**

```ts
import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const consentsV3Config: OpenApiDomainConfig = {
  id: "consents-v3-openapi",
  title: "API de Consentimentos — spec OpenAPI 3.3.1",
  description:
    "Spec OpenAPI oficial da API de Consentimentos (Dados Cadastrais e Transacionais) do Open Finance Brasil, versão 3.3.1. " +
    "Cobre criação (POST /consents), consulta (GET /consents/{consentId}), revogação (DELETE /consents/{consentId}), " +
    "renovação (POST /consents/{consentId}/extends) e histórico de renovações (GET /consents/{consentId}/extensions). " +
    "Itens type=operation (um por método+path) e type=schema (payloads, ex.: CreateConsent, ResponseConsent, LoggedUser, BusinessEntity). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/consents/{consentId}",
  specName: "consents",
  specVersion: "3.3.1",
  url: "https://openbanking-brasil.github.io/openapi/swagger-apis/consents/3.3.1.yml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

- [ ] **Step 10: `consents-v3-openapi` — `index.ts` e apagar arquivos mortos**

`index.ts`:

```ts
import { createOpenApiDomain } from "../_openapi/domain.js";
import { consentsV3Config } from "./config.js";

export const consentsV3Domain = createOpenApiDomain(consentsV3Config);
```

Depois:

```bash
git rm src/domains/consents-v3-openapi/parser.ts \
       src/domains/consents-v3-openapi/parser.test.ts \
       src/domains/consents-v3-openapi/index.test.ts
```

- [ ] **Step 11: Redirecionar imports de `parseOpenApiSpec` em `contract.test.ts`**

O `test/contract.test.ts` importa o parser de dois domínios que agora perdem seu `parser.ts` próprio. Trocar essas duas linhas para o parser compartilhado (a linha do `pcm-openapi` **não** muda — ele tem parser próprio).

Substituir:

```ts
import { parseOpenApiSpec } from "../src/domains/payments-v4-openapi/parser.js";
import { parseOpenApiSpec as parseConsentsV3 } from "../src/domains/consents-v3-openapi/parser.js";
```

por:

```ts
import { parseOpenApiSpec } from "../src/domains/_openapi/parser.js";
import { parseOpenApiSpec as parseConsentsV3 } from "../src/domains/_openapi/parser.js";
```

(`parseConsentsV3` é só um alias do mesmo símbolo; os dois imports podem ficar como estão acima, ou colapsar para um só — manter os dois é mais próximo do diff mínimo.)

- [ ] **Step 12: Verificação total**

Run: `npm test && npm run typecheck`
Expected: toda a suíte verde (incluindo `contract.test.ts` validando os 5 domínios) e typecheck limpo.

- [ ] **Step 13: Verificar que não sobrou duplicação**

Run: `git grep -l "parseOpenApiSpec" src/`
Expected: só `src/domains/_openapi/parser.ts`, `src/domains/_openapi/domain.ts`, `src/domains/_openapi/parser.test.ts`, `src/domains/_openapi/domain.test.ts`.

Run: `git status --porcelain src/domains/*/parser.ts`
Expected: nenhum `parser.ts` remanescente fora de `_openapi/`.

- [ ] **Step 14: Commit**

```bash
git add -A src/domains/ test/contract.test.ts
git commit -m "refactor: migrar os 5 domínios OpenAPI para createOpenApiDomain

Elimina parser.ts duplicado e index.ts repetido; config.ts vira o objeto
completo passado à factory. Sem mudança de comportamento.

Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE"
```

---

## Notas de preservação de comportamento

- `title` deixa de interpolar `${specVersion}` e passa a ser literal — o texto resultante é idêntico ao atual em cada domínio.
- `pathExample` reproduz o exemplo que estava em `filters[0].description` de cada domínio.
- `automatic-payments` hoje quebra a chamada `onProgress` em múltiplas linhas por formatação; a factory usa uma linha só, mas a string emitida é a mesma.
- `contract.test.ts` continua sendo a rede de segurança por-domínio (fixtures em `test/fixtures/*-spec.yml` permanecem).
