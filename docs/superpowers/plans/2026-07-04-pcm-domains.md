# Domínios PCM (pcm-openapi + pcm-business-rules) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar dois domínios à PCM — `pcm-openapi` (spec OpenAPI) e `pcm-business-rules` (regras de negócio do Confluence, item por seção) — sem criar tools novas.

**Architecture:** Core domain-agnostic com domínios plugáveis. `pcm-openapi` reutiliza o padrão OpenAPI existente (parse de `paths` + `components.schemas`). `pcm-business-rules` introduz um parser de seções (`parseSections`) que quebra páginas Confluence por heading. O fetcher do Confluence é extraído para o core e passa a ser compartilhado pelos dois domínios PCM.

**Tech Stack:** TypeScript strict (ESM, NodeNext), Node ≥ 20, `cheerio` (HTML), `yaml` (spec), `vitest` (testes).

## Global Constraints

- ESM com resolução `NodeNext`: **todo import relativo precisa de extensão `.js`** explícita.
- Testes **nunca** tocam a rede — parsers testados contra fixtures em `test/fixtures/`.
- Strings de usuário, docs e mensagens de commit em **português**.
- Commits seguem conventional-commits (`feat:`, `fix:`, `test:`, `docs:`).
- Todo domínio registrado em `src/core/registry.ts` **precisa** de fixture no mapa `fixtureData` de `test/contract.test.ts`, senão a suíte de conformidade falha.
- Comando de teste único por nome: `npx vitest run -t "nome"`. Suíte inteira: `npm test`. Tipos: `npm run typecheck`.
- `src/core/version.ts` (`PACKAGE_VERSION`) deve ficar em sincronia com `package.json`.
- Domínio que envelopa spec versionada codifica o major no id; `pcm-openapi` é exceção deliberada (arquivo único mistura paths v1/v2).

---

### Task 1: Extrair fetcher do Confluence para o core

Cria `src/core/confluence.ts` com `fetchConfluencePage` genérico (recebe `baseUrl`, `pageId`, `retryDelaysMs`, `signal`) e migra `pcm-additional-info` para usá-lo, removendo o fetcher específico. Sem mudança de comportamento observável — validada por typecheck + suíte existente verde.

**Files:**
- Create: `src/core/confluence.ts`
- Modify: `src/domains/pcm-additional-info/index.ts` (troca do import e da chamada)
- Delete: `src/domains/pcm-additional-info/fetcher.ts`

**Interfaces:**
- Consumes: `fetchWithRetry` de `src/core/http.js`.
- Produces: `fetchConfluencePage(baseUrl: string, pageId: string, retryDelaysMs: number[], signal?: AbortSignal): Promise<{ html: string; url: string }>`.

- [ ] **Step 1: Criar `src/core/confluence.ts`**

```typescript
import { fetchWithRetry } from "./http.js";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; opf-br-mcp/0.1; +opf-br-mcp)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Charset": "UTF-8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

interface ConfluenceResponse {
  body?: { view?: { value?: string } };
  _links?: { webui?: string };
}

/**
 * Busca uma página Confluence via API pública (`?expand=body.view`) e devolve
 * o HTML renderizado e a URL webui absoluta.
 */
export async function fetchConfluencePage(
  baseUrl: string,
  pageId: string,
  retryDelaysMs: number[],
  signal?: AbortSignal
): Promise<{ html: string; url: string }> {
  const apiUrl = `${baseUrl}/wiki/rest/api/content/${pageId}?expand=body.view`;
  const response = await fetchWithRetry(apiUrl, { retryDelaysMs, headers: HEADERS, signal });
  const json = (await response.json()) as ConfluenceResponse;
  return {
    html: json.body?.view?.value ?? "",
    url: `${baseUrl}/wiki${json._links?.webui ?? ""}`,
  };
}
```

- [ ] **Step 2: Migrar o import em `src/domains/pcm-additional-info/index.ts`**

Trocar a linha de import do fetcher local:

```typescript
import { fetchConfluencePage } from "./fetcher.js";
```

por:

```typescript
import { fetchConfluencePage } from "../../core/confluence.js";
```

- [ ] **Step 3: Ajustar a chamada em `extract()` de `pcm-additional-info/index.ts`**

Trocar:

```typescript
      const { html, url } = await fetchConfluencePage(page.pageId, ctx?.signal);
```

por:

```typescript
      const { html, url } = await fetchConfluencePage(
        pcmConfig.confluenceBaseUrl,
        page.pageId,
        pcmConfig.retryDelaysMs,
        ctx?.signal
      );
```

- [ ] **Step 4: Remover o fetcher específico**

```bash
git rm src/domains/pcm-additional-info/fetcher.ts
```

- [ ] **Step 5: Typecheck e suíte completa**

Run: `npm run typecheck && npm test`
Expected: PASS — sem erros de tipo; todos os testes existentes verdes (nenhum importava `fetcher.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/core/confluence.ts src/domains/pcm-additional-info/index.ts
git commit -m "refactor: extrair fetchConfluencePage para o core"
```

---

### Task 2: Domínio `pcm-openapi`

Envelopa a spec OpenAPI da PCM reutilizando o formato dos domínios OpenAPI existentes. Inclui parser, config, index, fixture, registro e teste.

**Files:**
- Create: `src/domains/pcm-openapi/config.ts`
- Create: `src/domains/pcm-openapi/parser.ts`
- Create: `src/domains/pcm-openapi/index.ts`
- Create: `src/domains/pcm-openapi/index.test.ts`
- Create: `test/fixtures/pcm-openapi-spec.yml`
- Modify: `src/core/registry.ts`
- Modify: `test/contract.test.ts`

**Interfaces:**
- Consumes: `fetchWithRetry` de `src/core/http.js`; `Domain`, `DomainData`, `Item` de `src/core/types.js`.
- Produces: `parseOpenApiSpec(yamlText: string, specName: string): Item[]`; `pcmOpenapiDomain: Domain` (id `pcm-openapi`).

- [ ] **Step 1: Criar a fixture `test/fixtures/pcm-openapi-spec.yml`**

```yaml
openapi: 3.9.2
info:
  title: PCM-Openapi
  version: 1.0.0
paths:
  /report-api/v1/private/report/:
    post:
      summary: Inclusão de reports
      description: Inclusão de reportes na plataforma.
      tags:
        - Private
  /report-api/v1/private/report/{fapiInteractonId}:
    get:
      summary: Consulta um report
      description: Consulta de um reporte específico por identificador.
      tags:
        - Private
components:
  schemas:
    ReportModel:
      type: object
      description: Modelo de um reporte da plataforma.
      required:
        - reportId
      properties:
        reportId:
          type: string
```

- [ ] **Step 2: Criar `src/domains/pcm-openapi/config.ts`**

```typescript
// ATENÇÃO: a URL aponta para o feature branch `feature/correct-paths` do repo
// pcm-specs (fonte indicada como oficial), não para `main`. É um branch
// instável — reavaliar/atualizar caso a spec seja promovida a main.
export const pcmOpenapiConfig = {
  specName: "pcm",
  specVersion: "1.0.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/pcm-specs/refs/heads/feature/correct-paths/PCM-current.openapi.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

- [ ] **Step 3: Criar `src/domains/pcm-openapi/parser.ts`** (mesmo formato dos demais domínios OpenAPI)

```typescript
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

- [ ] **Step 4: Criar `src/domains/pcm-openapi/index.ts`**

```typescript
import { fetchWithRetry } from "../../core/http.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { pcmOpenapiConfig } from "./config.js";
import { parseOpenApiSpec } from "./parser.js";

function summarize(item: Item): Item {
  const { detail: _detail, ...rest } = item as Record<string, unknown> & { id: string };
  return rest as Item;
}

export const pcmOpenapiDomain: Domain = {
  id: "pcm-openapi",
  title: `PCM — spec OpenAPI ${pcmOpenapiConfig.specVersion}`,
  description:
    "Spec OpenAPI oficial da PCM (Plataforma de Coleta de Métricas) do Open Finance Brasil. " +
    "Cobre os endpoints de reporte (report-api v1/v2), hybrid-flow, opendata, consents/stock, " +
    "credit-portabilities, payments/status e token. Itens type=operation (um por método+path) e " +
    "type=schema (payloads). search devolve resumos; use get_item para o nó completo da spec.",
  ttlHours: 24,
  filters: [
    { name: "path", description: "Substring no path do endpoint (ex.: /report-api/v1/private/report)" },
    { name: "method", description: "Verbo HTTP exato (ex.: POST)" },
    { name: "schema", description: "Substring no nome do schema (case-insensitive)" },
  ],
  async extract(ctx): Promise<DomainData> {
    if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
    ctx?.onProgress?.(0, 1, `Baixando spec ${pcmOpenapiConfig.specName} ${pcmOpenapiConfig.specVersion}`);
    const response = await fetchWithRetry(pcmOpenapiConfig.url, {
      retryDelaysMs: pcmOpenapiConfig.retryDelaysMs,
      signal: ctx?.signal,
    });
    const yamlText = await response.text();
    ctx?.onProgress?.(1, 1);
    return { items: parseOpenApiSpec(yamlText, pcmOpenapiConfig.specName) };
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

- [ ] **Step 5: Registrar em `src/core/registry.ts`**

Adicionar o import (após a linha do `consentsV3Domain`):

```typescript
import { pcmOpenapiDomain } from "../domains/pcm-openapi/index.js";
```

e incluir `pcmOpenapiDomain` no array `domains` (após `consentsV3Domain`):

```typescript
export const domains: Domain[] = [
  pcmDomain,
  paymentsDomain,
  paymentsV5Domain,
  enrollmentsV2Domain,
  automaticPaymentsV2Domain,
  consentsV3Domain,
  pcmOpenapiDomain,
];
```

- [ ] **Step 6: Registrar a fixture no `test/contract.test.ts`**

Adicionar o import do parser (junto aos outros imports de parser no topo):

```typescript
import { parseOpenApiSpec as parsePcmOpenapi } from "../src/domains/pcm-openapi/parser.js";
```

Adicionar a leitura da fixture (junto às outras `readFileSync`):

```typescript
const pcmOpenapiYaml = readFileSync(new URL("./fixtures/pcm-openapi-spec.yml", import.meta.url), "utf8");
```

Adicionar a entrada no mapa `fixtureData`:

```typescript
  "pcm-openapi": () => ({ items: parsePcmOpenapi(pcmOpenapiYaml, "pcm") }),
```

- [ ] **Step 7: Escrever o teste do domínio em `src/domains/pcm-openapi/index.test.ts`**

```typescript
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { pcmOpenapiDomain } from "./index.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/pcm-openapi-spec.yml", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return { items: parseOpenApiSpec(yamlText, "pcm") };
}

describe("pcmOpenapiDomain", () => {
  it("tem id pcm-openapi", () => {
    expect(pcmOpenapiDomain.id).toBe("pcm-openapi");
  });

  it("search devolve resumos sem detail, mas com id", () => {
    const results = pcmOpenapiDomain.search(fixtureData(), undefined, { method: "POST" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("pcm:POST /report-api/v1/private/report/");
    expect(results[0]).not.toHaveProperty("detail");
  });

  it("filtro path e schema funcionam", () => {
    expect(
      pcmOpenapiDomain.search(fixtureData(), undefined, { path: "{fapiInteractonId}" })
    ).toHaveLength(1);
    const schemas = pcmOpenapiDomain.search(fixtureData(), undefined, { schema: "reportmodel" });
    expect(schemas.map((s) => s.name)).toContain("ReportModel");
  });

  it("getItem devolve o item completo com detail", () => {
    const item = pcmOpenapiDomain.getItem(fixtureData(), "pcm:schema:ReportModel");
    expect(item).not.toBeNull();
    expect(item!.detail).toHaveProperty("properties");
  });
});
```

- [ ] **Step 8: Rodar os testes**

Run: `npx vitest run src/domains/pcm-openapi/index.test.ts test/contract.test.ts && npm run typecheck`
Expected: PASS — testes do domínio e contrato (incluindo `pcm-openapi`) verdes; sem erros de tipo.

- [ ] **Step 9: Commit**

```bash
git add src/domains/pcm-openapi test/fixtures/pcm-openapi-spec.yml src/core/registry.ts test/contract.test.ts
git commit -m "feat: domínio pcm-openapi (spec OpenAPI da PCM)"
```

---

### Task 3: Parser de seções do `pcm-business-rules`

Introduz `parseSections(html)` — quebra o HTML de uma página Confluence em seções por heading (h1–h3), achatando tabelas em texto. Testado contra fixture.

**Files:**
- Create: `src/domains/pcm-business-rules/parser.ts`
- Create: `src/domains/pcm-business-rules/parser.test.ts`
- Create: `test/fixtures/pcm-business-rules-page.html`

**Interfaces:**
- Consumes: `cheerio`, `AnyNode` de `domhandler`.
- Produces: `interface PcmSection { heading: string; level: number; content: string }`; `parseSections(html: string): PcmSection[]`.

- [ ] **Step 1: Criar a fixture `test/fixtures/pcm-business-rules-page.html`**

```html
<p>Introdução geral antes de qualquer heading.</p>
<h2>Reporte</h2>
<p>Um reporte representa uma chamada entre instituições.</p>
<table>
  <tbody>
    <tr><th>Campo</th><th>Descrição</th></tr>
    <tr><td>reportId</td><td>Identificador do reporte</td></tr>
  </tbody>
</table>
<h2>Processamento</h2>
<p>A plataforma processa os reportes de forma assíncrona.</p>
<h3>PAIRED</h3>
<p>Reporte conciliado com sucesso.</p>
<h2>Processamento</h2>
<p>Segunda seção com heading repetido para testar desambiguação.</p>
```

- [ ] **Step 2: Escrever o teste `src/domains/pcm-business-rules/parser.test.ts` (deve falhar primeiro)**

```typescript
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSections } from "./parser.js";

const html = readFileSync(
  new URL("../../../test/fixtures/pcm-business-rules-page.html", import.meta.url),
  "utf8"
);

describe("parseSections", () => {
  it("cria uma seção intro para o conteúdo antes do primeiro heading", () => {
    const [intro] = parseSections(html);
    expect(intro.heading).toBe("intro");
    expect(intro.level).toBe(0);
    expect(intro.content).toBe("Introdução geral antes de qualquer heading.");
  });

  it("extrai uma seção por heading com nível correto", () => {
    const sections = parseSections(html);
    const headings = sections.map((s) => `${s.level}:${s.heading}`);
    expect(headings).toEqual([
      "0:intro",
      "2:Reporte",
      "2:Processamento",
      "3:PAIRED",
      "2:Processamento",
    ]);
  });

  it("achata tabelas em texto legível dentro do content da seção", () => {
    const reporte = parseSections(html).find((s) => s.heading === "Reporte")!;
    expect(reporte.content).toContain("Um reporte representa uma chamada entre instituições.");
    expect(reporte.content).toContain("Campo | Descrição");
    expect(reporte.content).toContain("reportId | Identificador do reporte");
  });

  it("limita cada seção ao conteúdo até o próximo heading", () => {
    const paired = parseSections(html).find((s) => s.heading === "PAIRED")!;
    expect(paired.content).toBe("Reporte conciliado com sucesso.");
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/domains/pcm-business-rules/parser.test.ts`
Expected: FAIL — `parseSections` ainda não existe (erro de importação/módulo não encontrado).

- [ ] **Step 4: Implementar `src/domains/pcm-business-rules/parser.ts`**

```typescript
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export interface PcmSection {
  heading: string;
  level: number;
  content: string;
}

const HEADING_SELECTOR = "h1, h2, h3";

/**
 * Extrai o texto de um elemento, trocando <br> por \n e colapsando espaços.
 */
function cellText($: cheerio.CheerioAPI, el: AnyNode): string {
  const clone = $(el).clone();
  clone.find("br").replaceWith("\n");
  return clone.text().replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
}

/**
 * Converte um nó de bloco em texto. Tabelas viram linhas "célula | célula".
 */
function blockText($: cheerio.CheerioAPI, node: AnyNode): string {
  const $node = $(node);
  if ((node as { tagName?: string }).tagName === "table") {
    return $node
      .find("tr")
      .toArray()
      .map((tr) =>
        $(tr)
          .find("th, td")
          .toArray()
          .map((c) => cellText($, c))
          .join(" | ")
      )
      .filter((line) => line.replace(/[ |]/g, "").length > 0)
      .join("\n");
  }
  return cellText($, node);
}

/**
 * Quebra o HTML renderizado de uma página Confluence em seções por heading
 * (h1–h3). O conteúdo antes do primeiro heading vira uma seção sintética
 * `intro` (level 0). Seções sem heading e sem conteúdo são descartadas.
 */
export function parseSections(html: string): PcmSection[] {
  const $ = cheerio.load(html);
  const sections: PcmSection[] = [];

  const headings = $(HEADING_SELECTOR).toArray();

  // Seção intro: nós irmãos antes do primeiro heading (ou a página toda se não há heading).
  const first = headings[0];
  const introNodes = first ? $(first).prevAll().toArray().reverse() : $("body").contents().toArray();
  const introParts = introNodes.map((n) => blockText($, n)).filter(Boolean);
  const introContent = introParts.join("\n\n").trim();
  if (introContent) sections.push({ heading: "intro", level: 0, content: introContent });

  for (const el of headings) {
    const heading = cellText($, el);
    if (!heading) continue;
    const level = Number((el as { tagName: string }).tagName.slice(1));
    const parts = $(el)
      .nextUntil(HEADING_SELECTOR)
      .toArray()
      .map((n) => blockText($, n))
      .filter(Boolean);
    sections.push({ heading, level, content: parts.join("\n\n").trim() });
  }

  return sections;
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/domains/pcm-business-rules/parser.test.ts`
Expected: PASS — as 4 asserções verdes.

- [ ] **Step 6: Commit**

```bash
git add src/domains/pcm-business-rules/parser.ts src/domains/pcm-business-rules/parser.test.ts test/fixtures/pcm-business-rules-page.html
git commit -m "feat: parser de seções para pcm-business-rules"
```

---

### Task 4: Domínio `pcm-business-rules`

Monta os itens (um por seção, com id estável e desambiguação), o objeto `Domain` (search com snippet, get_item completo), registro e teste.

**Files:**
- Create: `src/domains/pcm-business-rules/config.ts`
- Create: `src/domains/pcm-business-rules/index.ts`
- Create: `src/domains/pcm-business-rules/index.test.ts`
- Modify: `src/core/registry.ts`
- Modify: `test/contract.test.ts`

**Interfaces:**
- Consumes: `fetchConfluencePage` de `src/core/confluence.js` (Task 1); `parseSections`/`PcmSection` de `./parser.js` (Task 3); `sleep` de `src/core/http.js`; `Domain`, `DomainData`, `Item`.
- Produces: `buildItems(pages: PcmRulesPage[]): Item[]`; `pcmBusinessRulesDomain: Domain` (id `pcm-business-rules`). Tipo exportado `interface PcmRulesPage { pageId: string; title: string; url: string; sections: PcmSection[] }`.

- [ ] **Step 1: Criar `src/domains/pcm-business-rules/config.ts`**

```typescript
export const pcmBusinessRulesConfig = {
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "37945356", title: "Especificação Técnica" },
    { pageId: "37945368", title: "Reporte, Processamento e Divergências" },
    { pageId: "37879861", title: "Reporte" },
    { pageId: "37912631", title: "Processamento" },
    { pageId: "37945515", title: "Manual de Integração" },
  ],
};
```

- [ ] **Step 2: Criar `src/domains/pcm-business-rules/index.ts`**

```typescript
import { sleep } from "../../core/http.js";
import { fetchConfluencePage } from "../../core/confluence.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { pcmBusinessRulesConfig } from "./config.js";
import { parseSections, type PcmSection } from "./parser.js";

const SNIPPET_LEN = 200;

export interface PcmRulesPage {
  pageId: string;
  title: string;
  url: string;
  sections: PcmSection[];
}

interface PcmRulesItem extends Item {
  heading: string;
  level: number;
  content: string;
  page: { pageId: string; title: string; url: string };
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildItems(pages: PcmRulesPage[]): Item[] {
  const items: Item[] = [];
  const seen = new Map<string, number>();
  for (const page of pages) {
    for (const section of page.sections) {
      const base = `${page.pageId}:${slugify(section.heading)}`;
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      const id = count > 1 ? `${base}-${count}` : base;
      items.push({
        id,
        heading: section.heading,
        level: section.level,
        content: section.content,
        page: { pageId: page.pageId, title: page.title, url: page.url },
      });
    }
  }
  return items;
}

function summarize(item: PcmRulesItem): Item {
  const { content, ...rest } = item;
  const snippet = content.length > SNIPPET_LEN ? `${content.slice(0, SNIPPET_LEN)}…` : content;
  return { ...rest, snippet };
}

export const pcmBusinessRulesDomain: Domain = {
  id: "pcm-business-rules",
  title: "PCM — Regras de negócio (Reporte, Processamento, Divergências)",
  description:
    "Regras de negócio da PCM (Plataforma de Coleta de Métricas) do Open Finance Brasil, extraídas das " +
    "páginas Confluence: Especificação Técnica, Reporte, Processamento, Divergências e Manual de Integração. " +
    "Cada item é uma seção (heading) da página. search devolve um snippet do conteúdo; " +
    "use get_item para o texto completo da seção.",
  ttlHours: 24,
  filters: [
    { name: "page", description: "Substring no título da página Confluence (ex.: Processamento)" },
    { name: "heading", description: "Substring no título da seção (ex.: PAIRED)" },
    { name: "contains", description: "Substring no conteúdo da seção" },
  ],
  async extract(ctx): Promise<DomainData> {
    const total = pcmBusinessRulesConfig.pages.length;
    const pages: PcmRulesPage[] = [];
    for (const [i, page] of pcmBusinessRulesConfig.pages.entries()) {
      if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
      if (i > 0) await sleep(pcmBusinessRulesConfig.interRequestDelayMs);
      ctx?.onProgress?.(i, total, `Extraindo "${page.title}"`);
      const { html, url } = await fetchConfluencePage(
        pcmBusinessRulesConfig.confluenceBaseUrl,
        page.pageId,
        pcmBusinessRulesConfig.retryDelaysMs,
        ctx?.signal
      );
      pages.push({ pageId: page.pageId, title: page.title, url, sections: parseSections(html) });
    }
    ctx?.onProgress?.(total, total);
    return { items: buildItems(pages) };
  },
  search(data, query, filters = {}) {
    const page = filters.page?.toLowerCase();
    const heading = filters.heading?.toLowerCase();
    const contains = filters.contains?.toLowerCase();
    const q = query?.toLowerCase();

    return (data.items as PcmRulesItem[])
      .filter((item) => {
        if (page && !item.page.title.toLowerCase().includes(page)) return false;
        if (heading && !item.heading.toLowerCase().includes(heading)) return false;
        if (contains && !item.content.toLowerCase().includes(contains)) return false;
        if (q) {
          const haystack = `${item.heading} ${item.content}`.toLowerCase();
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

- [ ] **Step 3: Registrar em `src/core/registry.ts`**

Adicionar o import (após a linha do `pcmOpenapiDomain`):

```typescript
import { pcmBusinessRulesDomain } from "../domains/pcm-business-rules/index.js";
```

e incluir `pcmBusinessRulesDomain` no fim do array `domains`:

```typescript
export const domains: Domain[] = [
  pcmDomain,
  paymentsDomain,
  paymentsV5Domain,
  enrollmentsV2Domain,
  automaticPaymentsV2Domain,
  consentsV3Domain,
  pcmOpenapiDomain,
  pcmBusinessRulesDomain,
];
```

- [ ] **Step 4: Registrar a fixture no `test/contract.test.ts`**

Adicionar os imports (junto aos outros no topo):

```typescript
import { buildItems as buildPcmRulesItems } from "../src/domains/pcm-business-rules/index.js";
import { parseSections } from "../src/domains/pcm-business-rules/parser.js";
```

Adicionar a leitura da fixture:

```typescript
const pcmBusinessRulesHtml = readFileSync(
  new URL("./fixtures/pcm-business-rules-page.html", import.meta.url),
  "utf8",
);
```

Adicionar a entrada no mapa `fixtureData`:

```typescript
  "pcm-business-rules": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(pcmBusinessRulesHtml) },
    ]),
  }),
```

- [ ] **Step 5: Escrever o teste `src/domains/pcm-business-rules/index.test.ts`**

```typescript
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { buildItems, pcmBusinessRulesDomain } from "./index.js";
import { parseSections } from "./parser.js";

const html = readFileSync(
  new URL("../../../test/fixtures/pcm-business-rules-page.html", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return {
    items: buildItems([
      { pageId: "42", title: "Processamento", url: "http://x", sections: parseSections(html) },
    ]),
  };
}

describe("pcmBusinessRulesDomain", () => {
  it("tem id pcm-business-rules", () => {
    expect(pcmBusinessRulesDomain.id).toBe("pcm-business-rules");
  });

  it("desambigua headings repetidos no id", () => {
    const ids = buildItems([
      { pageId: "42", title: "Processamento", url: "http://x", sections: parseSections(html) },
    ]).map((i) => i.id);
    expect(ids).toContain("42:processamento");
    expect(ids).toContain("42:processamento-2");
  });

  it("search devolve snippet e não o content completo", () => {
    const results = pcmBusinessRulesDomain.search(fixtureData(), undefined, { heading: "reporte" });
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("snippet");
    expect(results[0]).not.toHaveProperty("content");
  });

  it("filtro contains casa no conteúdo da seção", () => {
    const results = pcmBusinessRulesDomain.search(fixtureData(), undefined, { contains: "conciliado" });
    expect(results.map((r) => r.heading)).toContain("PAIRED");
  });

  it("getItem devolve a seção completa com content", () => {
    const paired = pcmBusinessRulesDomain.search(fixtureData(), undefined, { heading: "PAIRED" })[0];
    const item = pcmBusinessRulesDomain.getItem(fixtureData(), paired.id);
    expect(item).not.toBeNull();
    expect(item!.content).toBe("Reporte conciliado com sucesso.");
  });
});
```

- [ ] **Step 6: Rodar os testes**

Run: `npx vitest run src/domains/pcm-business-rules/index.test.ts test/contract.test.ts && npm run typecheck`
Expected: PASS — testes do domínio e contrato (incluindo `pcm-business-rules`) verdes; sem erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add src/domains/pcm-business-rules/config.ts src/domains/pcm-business-rules/index.ts src/domains/pcm-business-rules/index.test.ts src/core/registry.ts test/contract.test.ts
git commit -m "feat: domínio pcm-business-rules (regras de negócio da PCM)"
```

---

### Task 5: Docs e bump de versão

Atualiza a tabela de domínios no README e sobe a versão (minor) em sincronia entre `package.json` e `src/core/version.ts`.

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Modify: `src/core/version.ts`

**Interfaces:** nenhuma (documentação e metadados).

- [ ] **Step 1: Adicionar as duas linhas na tabela de domínios do `README.md`**

Após a linha `| \`consents-v3-openapi\` | ... |`, inserir:

```markdown
| `pcm-openapi` | GitHub OpenBanking-Brasil/pcm-specs | Spec OpenAPI da PCM (reportes, hybrid-flow, opendata, consents/stock, credit-portabilities, payments/status) |
| `pcm-business-rules` | Confluence público OFB | Regras de negócio da PCM (Reporte, Processamento, Divergências, Especificação Técnica, Manual de Integração) — item por seção |
```

- [ ] **Step 2: Subir a versão em `package.json`**

Trocar `"version": "0.2.0"` por `"version": "0.3.0"`.

- [ ] **Step 3: Subir a versão em `src/core/version.ts`**

Trocar:

```typescript
export const PACKAGE_VERSION = "0.2.0";
```

por:

```typescript
export const PACKAGE_VERSION = "0.3.0";
```

- [ ] **Step 4: Rodar a suíte completa e o typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS — todos os testes verdes, sem erros de tipo. Os 8 domínios listados no contract test.

- [ ] **Step 5: Commit**

```bash
git add README.md package.json src/core/version.ts
git commit -m "docs: registrar domínios pcm-openapi e pcm-business-rules; bump 0.3.0"
```

---

## Notas de verificação final

Ao concluir todas as tasks, confirmar manualmente (sem rede, opcional):

```bash
npm run build
node -e "import('./dist/index.js')" 2>/dev/null || true
```

E revisar que `list_domains` exporia os 8 domínios via inspeção de `src/core/registry.ts`. Os critérios de aceite do spec (npm test verde, typecheck limpo, dois domínios novos com revelação progressiva, nenhum teste na rede) devem estar todos satisfeitos.
