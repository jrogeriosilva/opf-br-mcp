# payments-v5-openapi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o domínio `payments-v5-openapi` ao `opf-br-mcp`, expondo a spec OpenAPI v5 da API de Iniciação de Pagamentos, mantendo o `payments-v4-openapi` intacto.

**Architecture:** Clone do domínio `payments-v4-openapi`. Parser e `index.ts` são genéricos para qualquer OpenAPI 3.0; o domínio novo só muda `id`, `title`, `specVersion` e `url`. Cada domínio permanece autocontido (parser próprio), conforme convenção do CLAUDE.md.

**Tech Stack:** TypeScript strict, ESM (`NodeNext`), Node ≥ 20, vitest, biblioteca `yaml`.

## Global Constraints

- ESM `NodeNext`: todo import relativo usa extensão `.js` explícita.
- Testes nunca tocam a rede — apenas fixtures locais em `test/fixtures/`.
- Commits em português com prefixos conventional-commit (`feat:`, `test:`).
- Não alterar o domínio `payments-v4-openapi` nem `PACKAGE_VERSION`.
- Fonte da spec v5 (URL exata do `config.ts`):
  `https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_payment_initiation_-_open_finance_brasil/5.0.0.yaml`

---

### Task 1: Fixture + parser do domínio v5

**Files:**
- Create: `test/fixtures/payments-v5-spec.yml`
- Create: `src/domains/payments-v5-openapi/parser.ts`
- Test: `src/domains/payments-v5-openapi/parser.test.ts`

**Interfaces:**
- Consumes: nada (parser é autocontido; usa `parse` de `yaml` e `Item` de `../../core/types.js`).
- Produces: `parseOpenApiSpec(yamlText: string, specName: string): Item[]` em `src/domains/payments-v5-openapi/parser.ts` — idêntico ao do v4. Gera itens `type: "operation"` (id `"<specName>:<METHOD> <path>"`) e `type: "schema"` (id `"<specName>:schema:<Name>"`).

- [ ] **Step 1: Criar a fixture v5**

`test/fixtures/payments-v5-spec.yml`:

```yaml
openapi: 3.0.0
info:
  title: API Payment Initiation - Open Finance Brasil
  version: 5.0.0
paths:
  /consents:
    post:
      tags: [Consents]
      summary: Criar consentimento para a iniciação de pagamento.
      description: Método de criação do consentimento para a iniciação de pagamento.
      requestBody:
        content:
          application/jwt:
            schema:
              $ref: '#/components/schemas/CreatePaymentConsent'
  /consents/{consentId}:
    get:
      tags: [Consents]
      summary: Consultar consentimento para iniciação de pagamento.
      parameters:
        - name: consentId
          in: path
          required: true
          schema:
            type: string
  /pix/payments:
    post:
      tags: [Payments]
      summary: Criar iniciação de pagamento.
      description: Cria a iniciação de pagamento PIX consentida.
      requestBody:
        content:
          application/jwt:
            schema:
              $ref: '#/components/schemas/CreatePixPayment'
components:
  schemas:
    CreatePaymentConsent:
      type: object
      description: Payload de criação de consentimento de pagamento
      required: [data]
      properties:
        data:
          type: object
    CreatePixPayment:
      type: object
      description: Payload de criação de pagamento PIX
      required: [data]
      properties:
        data:
          type: object
```

- [ ] **Step 2: Escrever o teste do parser (falhando)**

`src/domains/payments-v5-openapi/parser.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-v5-spec.yml", import.meta.url),
  "utf8"
);

describe("parseOpenApiSpec (v5)", () => {
  it("gera um item por operação e por schema", () => {
    const items = parseOpenApiSpec(yamlText, "payments");
    expect(items.map((i) => i.id)).toEqual([
      "payments:POST /consents",
      "payments:GET /consents/{consentId}",
      "payments:POST /pix/payments",
      "payments:schema:CreatePaymentConsent",
      "payments:schema:CreatePixPayment",
    ]);
  });

  it("operações carregam summary e o nó completo em detail", () => {
    const post = parseOpenApiSpec(yamlText, "payments")[0];
    expect(post.type).toBe("operation");
    expect(post.method).toBe("POST");
    expect(post.summary).toBe("Criar consentimento para a iniciação de pagamento.");
    expect(post.detail).toHaveProperty("requestBody");
  });

  it("schemas carregam description, required e detail", () => {
    const items = parseOpenApiSpec(yamlText, "payments");
    const schema = items.find((i) => i.id === "payments:schema:CreatePaymentConsent")!;
    expect(schema.type).toBe("schema");
    expect(schema.required).toEqual(["data"]);
    expect(schema.detail).toHaveProperty("properties");
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/domains/payments-v5-openapi/parser.test.ts`
Expected: FAIL — não resolve o módulo `./parser.js` (arquivo ainda não existe).

- [ ] **Step 4: Criar o parser (cópia idêntica do v4)**

`src/domains/payments-v5-openapi/parser.ts`:

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

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/domains/payments-v5-openapi/parser.test.ts`
Expected: PASS (3 testes verdes).

- [ ] **Step 6: Commit**

```bash
git add test/fixtures/payments-v5-spec.yml src/domains/payments-v5-openapi/parser.ts src/domains/payments-v5-openapi/parser.test.ts
git commit -m "test: parser e fixture do domínio payments-v5-openapi"
```

---

### Task 2: Config + domínio v5 (index)

**Files:**
- Create: `src/domains/payments-v5-openapi/config.ts`
- Create: `src/domains/payments-v5-openapi/index.ts`
- Test: `src/domains/payments-v5-openapi/index.test.ts`

**Interfaces:**
- Consumes: `parseOpenApiSpec` da Task 1 (`./parser.js`); `paymentsV5Config` de `./config.js`; `fetchWithRetry` de `../../core/http.js`; tipos `Domain, DomainData, Item` de `../../core/types.js`.
- Produces: `paymentsV5Config` (objeto com `specName`, `specVersion`, `url`, `retryDelaysMs`) e `paymentsV5Domain: Domain` (id `"payments-v5-openapi"`), consumidos pela Task 3.

- [ ] **Step 1: Criar o config**

`src/domains/payments-v5-openapi/config.ts`:

```ts
export const paymentsV5Config = {
  specName: "payments",
  specVersion: "5.0.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_payment_initiation_-_open_finance_brasil/5.0.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

- [ ] **Step 2: Escrever o teste do domínio (falhando)**

`src/domains/payments-v5-openapi/index.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { paymentsV5Domain } from "./index.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/payments-v5-spec.yml", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return { items: parseOpenApiSpec(yamlText, "payments") };
}

describe("paymentsV5Domain", () => {
  it("tem id versionado v5", () => {
    expect(paymentsV5Domain.id).toBe("payments-v5-openapi");
  });

  it("search devolve resumos sem detail, mas com id", () => {
    const results = paymentsV5Domain.search(fixtureData(), undefined, { method: "GET" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("payments:GET /consents/{consentId}");
    expect(results[0]).not.toHaveProperty("detail");
  });

  it("filtro path e schema funcionam", () => {
    expect(paymentsV5Domain.search(fixtureData(), undefined, { path: "{consentId}" })).toHaveLength(1);
    const schemas = paymentsV5Domain.search(fixtureData(), undefined, { schema: "pix" });
    expect(schemas.map((s) => s.name)).toEqual(["CreatePixPayment"]);
  });

  it("query busca em path, summary, description e nome de schema", () => {
    const results = paymentsV5Domain.search(fixtureData(), "consentida");
    expect(results).toHaveLength(1);
    expect(results[0].method).toBe("POST");
  });

  it("getItem devolve o item completo com detail", () => {
    const item = paymentsV5Domain.getItem(fixtureData(), "payments:schema:CreatePixPayment");
    expect(item).not.toBeNull();
    expect(item!.detail).toHaveProperty("properties");
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/domains/payments-v5-openapi/index.test.ts`
Expected: FAIL — não resolve `./index.js` (arquivo ainda não existe).

- [ ] **Step 4: Criar o index do domínio**

`src/domains/payments-v5-openapi/index.ts`:

```ts
import { fetchWithRetry } from "../../core/http.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { paymentsV5Config } from "./config.js";
import { parseOpenApiSpec } from "./parser.js";

function summarize(item: Item): Item {
  const { detail: _detail, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export const paymentsV5Domain: Domain = {
  id: "payments-v5-openapi",
  title: `API de Pagamentos — spec OpenAPI ${paymentsV5Config.specVersion}`,
  description:
    "Spec OpenAPI oficial da API de Iniciação de Pagamentos (Pix) do Open Finance Brasil, versão 5. " +
    "Inclui endpoints de consentimento (/consents) e de pagamento (/pix/payments). " +
    "Itens type=operation (endpoints, um por método+path) e type=schema (payloads). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  ttlHours: 24,
  filters: [
    { name: "path", description: "Substring no path do endpoint (ex.: /pix/payments)" },
    { name: "method", description: "Verbo HTTP exato (ex.: POST)" },
    { name: "schema", description: "Substring no nome do schema (case-insensitive)" },
  ],
  async extract(ctx): Promise<DomainData> {
    if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
    ctx?.onProgress?.(0, 1, `Baixando spec ${paymentsV5Config.specName} ${paymentsV5Config.specVersion}`);
    const response = await fetchWithRetry(paymentsV5Config.url, {
      retryDelaysMs: paymentsV5Config.retryDelaysMs,
      signal: ctx?.signal,
    });
    const yamlText = await response.text();
    ctx?.onProgress?.(1, 1);
    return { items: parseOpenApiSpec(yamlText, paymentsV5Config.specName) };
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

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/domains/payments-v5-openapi/index.test.ts`
Expected: PASS (5 testes verdes).

- [ ] **Step 6: Commit**

```bash
git add src/domains/payments-v5-openapi/config.ts src/domains/payments-v5-openapi/index.ts src/domains/payments-v5-openapi/index.test.ts
git commit -m "feat: domínio payments-v5-openapi (config e index)"
```

---

### Task 3: Registrar o domínio + conformidade

**Files:**
- Modify: `src/core/registry.ts`
- Modify: `test/contract.test.ts`

**Interfaces:**
- Consumes: `paymentsV5Domain` da Task 2 (`../domains/payments-v5-openapi/index.js`); `parseOpenApiSpec` já importado no `contract.test.ts` (do v4 — função idêntica, reutilizada como helper de teste).
- Produces: nada (ponto de wiring final).

- [ ] **Step 1: Registrar o domínio no registry**

Editar `src/core/registry.ts` para o conteúdo completo abaixo:

```ts
import type { Domain } from "./types.js";
import { pcmDomain } from "../domains/pcm-additional-info/index.js";
import { paymentsDomain } from "../domains/payments-v4-openapi/index.js";
import { paymentsV5Domain } from "../domains/payments-v5-openapi/index.js";

export const domains: Domain[] = [pcmDomain, paymentsDomain, paymentsV5Domain];
```

- [ ] **Step 2: Registrar a fixture v5 na suíte de conformidade**

Em `test/contract.test.ts`:

Adicionar, logo após a linha que lê `paymentsYaml` (`const paymentsYaml = readFileSync(...)`):

```ts
const paymentsV5Yaml = readFileSync(new URL("./fixtures/payments-v5-spec.yml", import.meta.url), "utf8");
```

E adicionar, dentro do objeto `fixtureData`, após a entrada `"payments-v4-openapi": ...`:

```ts
  "payments-v5-openapi": () => ({ items: parseOpenApiSpec(paymentsV5Yaml, "payments") }),
```

(O `parseOpenApiSpec` importado do v4 é idêntico ao do v5 e serve como helper de teste; não é necessário novo import.)

- [ ] **Step 3: Rodar a suíte inteira e confirmar verde**

Run: `npm test`
Expected: PASS — inclui os testes de conformidade `describe.each` para `payments-v5-openapi` (metadados válidos, fixture registrada, ids únicos, getItem resolve todo id, query sem match devolve vazio).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/core/registry.ts test/contract.test.ts
git commit -m "feat: registrar domínio payments-v5-openapi e conformidade"
```

---

## Verificação final

- `npm test` verde (parser, index e conformidade do v5).
- `npm run typecheck` limpo.
- `payments-v4-openapi` inalterado; ambos os domínios coexistem no registry.
