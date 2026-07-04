# Jornada Otimizada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o domínio `jornada-otimizada` (4 páginas Confluence do Open Finance Brasil) extraindo uma fábrica compartilhada `_confluence-sections` a partir do domínio `pcm-business-rules`.

**Architecture:** Os dois domínios de conhecimento Confluence são estruturalmente idênticos (páginas → seções por heading → snippet no `search`, texto completo no `get_item`). Extraímos a lógica para `src/domains/_confluence-sections/` (fábrica `createConfluenceSectionsDomain` + `parseSections`), no mesmo padrão de `_openapi`/`createOpenApiDomain`. Migramos `pcm-business-rules` para a fábrica e construímos `jornada-otimizada` sobre ela.

**Tech Stack:** TypeScript strict, ESM (NodeNext, imports com `.js`), cheerio para parsing HTML, vitest para testes.

## Global Constraints

- ESM com resolução NodeNext: imports relativos precisam de extensão `.js` explícita.
- Node >= 20, TypeScript strict.
- Strings voltadas ao usuário, docs e mensagens de commit em **português**.
- Testes **nunca** batem na rede — parsers testados contra fixtures em `test/fixtures/`.
- Commits seguem conventional-commits (`feat:`, `refactor:`, `test:`, `docs:`) em português.
- Cada mensagem de commit termina com: `Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE`
- Domínios de conhecimento Confluence **não** codificam versão no id (diferente das specs OpenAPI).

---

## File Structure

- `src/domains/_confluence-sections/parser.ts` — CREATE. `parseSections(html)` + `ConfluenceSection`.
- `src/domains/_confluence-sections/parser.test.ts` — CREATE. Testes do parser.
- `src/domains/_confluence-sections/domain.ts` — CREATE. `createConfluenceSectionsDomain`, `buildItems`, tipos de config.
- `src/domains/_confluence-sections/domain.test.ts` — CREATE. Testes de comportamento da fábrica.
- `src/domains/pcm-business-rules/config.ts` — MODIFY. Ganha `id`/`title`/`description`.
- `src/domains/pcm-business-rules/index.ts` — MODIFY. Colapsa para one-liner via fábrica.
- `src/domains/pcm-business-rules/parser.ts` — DELETE.
- `src/domains/pcm-business-rules/parser.test.ts` — DELETE.
- `src/domains/pcm-business-rules/index.test.ts` — DELETE.
- `src/domains/jornada-otimizada/config.ts` — CREATE.
- `src/domains/jornada-otimizada/index.ts` — CREATE.
- `src/core/registry.ts` — MODIFY. Registra o novo domínio.
- `test/fixtures/jornada-otimizada-page.html` — CREATE. Fixture sintética.
- `test/contract.test.ts` — MODIFY. Reaponta imports + adiciona fixture do novo domínio.

---

## Task 1: Módulo compartilhado `_confluence-sections` (parser)

**Files:**
- Create: `src/domains/_confluence-sections/parser.ts`
- Test: `src/domains/_confluence-sections/parser.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `parseSections(html: string): ConfluenceSection[]`; `interface ConfluenceSection { heading: string; level: number; content: string }`.

- [ ] **Step 1: Criar o parser**

Create `src/domains/_confluence-sections/parser.ts`:

```ts
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export interface ConfluenceSection {
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
export function parseSections(html: string): ConfluenceSection[] {
  const $ = cheerio.load(html);
  const sections: ConfluenceSection[] = [];

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

- [ ] **Step 2: Criar o teste do parser**

Create `src/domains/_confluence-sections/parser.test.ts` (reusa a fixture existente do pcm-business-rules; mesmo nível de diretório, então o caminho `../../../test/fixtures/` continua válido):

```ts
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

- [ ] **Step 3: Rodar o teste do parser**

Run: `npx vitest run src/domains/_confluence-sections/parser.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 4: Commit**

```bash
git add src/domains/_confluence-sections/parser.ts src/domains/_confluence-sections/parser.test.ts
git commit -m "feat: parser de seções Confluence compartilhado (_confluence-sections)

Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE"
```

---

## Task 2: Fábrica `createConfluenceSectionsDomain`

**Files:**
- Create: `src/domains/_confluence-sections/domain.ts`
- Test: `src/domains/_confluence-sections/domain.test.ts`

**Interfaces:**
- Consumes: `parseSections`, `ConfluenceSection` de `./parser.js`; `fetchConfluencePage` de `../../core/confluence.js`; `sleep` de `../../core/http.js`; `Domain`, `DomainData`, `Item` de `../../core/types.js`.
- Produces:
  - `interface ConfluenceSectionsConfig { id; title; description; confluenceBaseUrl: string; interRequestDelayMs: number; retryDelaysMs: number[]; pages: { pageId: string; title: string }[] }`
  - `interface ConfluencePageSections { pageId: string; title: string; url: string; sections: ConfluenceSection[] }`
  - `buildItems(pages: ConfluencePageSections[]): Item[]`
  - `createConfluenceSectionsDomain(config: ConfluenceSectionsConfig): Domain`

- [ ] **Step 1: Criar a fábrica**

Create `src/domains/_confluence-sections/domain.ts`:

```ts
import { sleep } from "../../core/http.js";
import { fetchConfluencePage } from "../../core/confluence.js";
import type { Domain, DomainData, Item } from "../../core/types.js";
import { parseSections, type ConfluenceSection } from "./parser.js";

const SNIPPET_LEN = 200;

export interface ConfluenceSectionsConfig {
  id: string;
  title: string;
  description: string;
  confluenceBaseUrl: string;
  interRequestDelayMs: number;
  retryDelaysMs: number[];
  pages: { pageId: string; title: string }[];
}

export interface ConfluencePageSections {
  pageId: string;
  title: string;
  url: string;
  sections: ConfluenceSection[];
}

interface ConfluenceSectionItem extends Item {
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

export function buildItems(pages: ConfluencePageSections[]): Item[] {
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

function summarize(item: ConfluenceSectionItem): Item {
  const { content, ...rest } = item;
  const snippet = content.length > SNIPPET_LEN ? `${content.slice(0, SNIPPET_LEN)}…` : content;
  return { ...rest, snippet };
}

export function createConfluenceSectionsDomain(config: ConfluenceSectionsConfig): Domain {
  return {
    id: config.id,
    title: config.title,
    description: config.description,
    ttlHours: 24,
    filters: [
      { name: "page", description: "Substring no título da página Confluence" },
      { name: "heading", description: "Substring no título da seção (heading)" },
      { name: "contains", description: "Substring no conteúdo da seção" },
    ],
    async extract(ctx): Promise<DomainData> {
      const total = config.pages.length;
      const pages: ConfluencePageSections[] = [];
      for (const [i, page] of config.pages.entries()) {
        if (ctx?.signal?.aborted) throw new Error("Extração cancelada pelo cliente");
        if (i > 0) await sleep(config.interRequestDelayMs);
        ctx?.onProgress?.(i, total, `Extraindo "${page.title}"`);
        const { html, url } = await fetchConfluencePage(
          config.confluenceBaseUrl,
          page.pageId,
          config.retryDelaysMs,
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

      return (data.items as ConfluenceSectionItem[])
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
}
```

- [ ] **Step 2: Criar o teste da fábrica**

Create `src/domains/_confluence-sections/domain.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import {
  buildItems,
  createConfluenceSectionsDomain,
  type ConfluenceSectionsConfig,
} from "./domain.js";
import { parseSections } from "./parser.js";

const html = readFileSync(
  new URL("../../../test/fixtures/pcm-business-rules-page.html", import.meta.url),
  "utf8"
);

const testConfig: ConfluenceSectionsConfig = {
  id: "test-sections",
  title: "Domínio de teste",
  description: "Config de teste para a fábrica de seções Confluence.",
  confluenceBaseUrl: "http://x",
  interRequestDelayMs: 0,
  retryDelaysMs: [],
  pages: [],
};

const domain = createConfluenceSectionsDomain(testConfig);

function fixtureData(): DomainData {
  return {
    items: buildItems([
      { pageId: "42", title: "Processamento", url: "http://x", sections: parseSections(html) },
    ]),
  };
}

describe("createConfluenceSectionsDomain", () => {
  it("usa o id do config", () => {
    expect(domain.id).toBe("test-sections");
  });

  it("desambigua headings repetidos no id", () => {
    const ids = buildItems([
      { pageId: "42", title: "Processamento", url: "http://x", sections: parseSections(html) },
    ]).map((i) => i.id);
    expect(ids).toContain("42:processamento");
    expect(ids).toContain("42:processamento-2");
  });

  it("search devolve snippet e não o content completo", () => {
    const results = domain.search(fixtureData(), undefined, { heading: "reporte" });
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("snippet");
    expect(results[0]).not.toHaveProperty("content");
  });

  it("filtro contains casa no conteúdo da seção", () => {
    const results = domain.search(fixtureData(), undefined, { contains: "conciliado" });
    expect(results.map((r) => r.heading)).toContain("PAIRED");
  });

  it("getItem devolve a seção completa com content", () => {
    const paired = domain.search(fixtureData(), undefined, { heading: "PAIRED" })[0];
    const item = domain.getItem(fixtureData(), paired.id);
    expect(item).not.toBeNull();
    expect(item!.content).toBe("Reporte conciliado com sucesso.");
  });

  it("trunca o snippet de conteúdo longo mas getItem devolve o content completo", () => {
    const data: DomainData = {
      items: buildItems([
        {
          pageId: "99",
          title: "Longa",
          url: "http://x",
          sections: [{ heading: "Longa", level: 2, content: "x".repeat(250) }],
        },
      ]),
    };
    const results = domain.search(data, undefined, { heading: "Longa" });
    expect(results).toHaveLength(1);
    const snippet = (results[0] as unknown as { snippet: string }).snippet;
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(201);

    const item = domain.getItem(data, results[0].id);
    expect(item).not.toBeNull();
    expect(item!.content).toBe("x".repeat(250));
    expect(item!.content).not.toContain("…");
  });

  it("filtro page casa no título da página e retorna vazio quando não casa", () => {
    const matches = domain.search(fixtureData(), undefined, { page: "Processamento" });
    expect(matches.length).toBeGreaterThan(0);
    const noMatch = domain.search(fixtureData(), undefined, { page: "Inexistente" });
    expect(noMatch).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar o teste da fábrica**

Run: `npx vitest run src/domains/_confluence-sections/domain.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 4: Commit**

```bash
git add src/domains/_confluence-sections/domain.ts src/domains/_confluence-sections/domain.test.ts
git commit -m "feat: fábrica createConfluenceSectionsDomain (_confluence-sections)

Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE"
```

---

## Task 3: Migrar `pcm-business-rules` para a fábrica

**Files:**
- Modify: `src/domains/pcm-business-rules/config.ts`
- Modify: `src/domains/pcm-business-rules/index.ts`
- Delete: `src/domains/pcm-business-rules/parser.ts`, `src/domains/pcm-business-rules/parser.test.ts`, `src/domains/pcm-business-rules/index.test.ts`
- Modify: `test/contract.test.ts` (linhas 10–11, imports)

**Interfaces:**
- Consumes: `createConfluenceSectionsDomain` de `../_confluence-sections/domain.js`.
- Produces: `pcmBusinessRulesDomain: Domain` (id inalterado `pcm-business-rules`); `pcmBusinessRulesConfig` agora inclui `id`/`title`/`description`.

- [ ] **Step 1: Atualizar o config**

Replace the entire contents of `src/domains/pcm-business-rules/config.ts` with:

```ts
export const pcmBusinessRulesConfig = {
  id: "pcm-business-rules",
  title: "PCM — Regras de negócio (Reporte, Processamento, Divergências)",
  description:
    "Regras de negócio da PCM (Plataforma de Coleta de Métricas) do Open Finance Brasil, extraídas das " +
    "páginas Confluence: Especificação Técnica, Reporte, Processamento, Divergências e Manual de Integração. " +
    "Cada item é uma seção (heading) da página. search devolve um snippet do conteúdo; " +
    "use get_item para o texto completo da seção.",
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

- [ ] **Step 2: Colapsar o index**

Replace the entire contents of `src/domains/pcm-business-rules/index.ts` with:

```ts
import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { pcmBusinessRulesConfig } from "./config.js";

export const pcmBusinessRulesDomain = createConfluenceSectionsDomain(pcmBusinessRulesConfig);
```

- [ ] **Step 3: Apagar os arquivos migrados**

```bash
git rm src/domains/pcm-business-rules/parser.ts \
       src/domains/pcm-business-rules/parser.test.ts \
       src/domains/pcm-business-rules/index.test.ts
```

- [ ] **Step 4: Reapontar os imports no contract.test.ts**

In `test/contract.test.ts`, change the two import lines (currently importing from `pcm-business-rules`) to point at the shared module:

Replace:

```ts
import { buildItems as buildPcmRulesItems } from "../src/domains/pcm-business-rules/index.js";
import { parseSections } from "../src/domains/pcm-business-rules/parser.js";
```

with:

```ts
import { buildItems as buildPcmRulesItems } from "../src/domains/_confluence-sections/domain.js";
import { parseSections } from "../src/domains/_confluence-sections/parser.js";
```

- [ ] **Step 5: Rodar a suíte completa + typecheck**

Run: `npm run typecheck && npm test`
Expected: PASS. A suíte de contrato continua validando `pcm-business-rules` (id inalterado); nenhum teste órfão referenciando os arquivos apagados.

- [ ] **Step 6: Commit**

```bash
git add src/domains/pcm-business-rules/ test/contract.test.ts
git commit -m "refactor: migrar pcm-business-rules para createConfluenceSectionsDomain

Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE"
```

---

## Task 4: Novo domínio `jornada-otimizada`

**Files:**
- Create: `src/domains/jornada-otimizada/config.ts`
- Create: `src/domains/jornada-otimizada/index.ts`
- Modify: `src/core/registry.ts`
- Create: `test/fixtures/jornada-otimizada-page.html`
- Modify: `test/contract.test.ts` (fixture + entrada em `fixtureData`)

**Interfaces:**
- Consumes: `createConfluenceSectionsDomain` de `../_confluence-sections/domain.js`; `buildItems`/`parseSections` (já importados no contract.test.ts).
- Produces: `jornadaOtimizadaDomain: Domain` (id `jornada-otimizada`), registrado em `domains`.

- [ ] **Step 1: Criar o config**

Create `src/domains/jornada-otimizada/config.ts`:

```ts
export const jornadaOtimizadaConfig = {
  id: "jornada-otimizada",
  title: "Jornada Otimizada",
  description:
    "Conhecimento regulatório da Jornada Otimizada do Open Finance Brasil, extraído das páginas " +
    "Confluence: Jornada Otimizada (introdução), Orientações Gerais, Transferências Inteligentes e " +
    "Jornada sem Redirecionamento. Cada item é uma seção (heading) da página. search devolve um " +
    "snippet do conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "1128890377", title: "Jornada Otimizada" },
    { pageId: "1129250817", title: "Orientações Gerais" },
    { pageId: "1129021472", title: "Transferências Inteligentes" },
    { pageId: "1128857617", title: "Jornada sem Redirecionamento" },
  ],
};
```

- [ ] **Step 2: Criar o index**

Create `src/domains/jornada-otimizada/index.ts`:

```ts
import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { jornadaOtimizadaConfig } from "./config.js";

export const jornadaOtimizadaDomain = createConfluenceSectionsDomain(jornadaOtimizadaConfig);
```

- [ ] **Step 3: Registrar no registry**

In `src/core/registry.ts`, add the import alongside the other domain imports:

```ts
import { jornadaOtimizadaDomain } from "../domains/jornada-otimizada/index.js";
```

and add `jornadaOtimizadaDomain` as the last entry of the `domains` array:

```ts
export const domains: Domain[] = [
  pcmDomain,
  paymentsDomain,
  paymentsV5Domain,
  enrollmentsV2Domain,
  automaticPaymentsV2Domain,
  consentsV3Domain,
  pcmOpenapiDomain,
  pcmBusinessRulesDomain,
  jornadaOtimizadaDomain,
];
```

- [ ] **Step 4: Criar a fixture**

Create `test/fixtures/jornada-otimizada-page.html` (sintética, modela headings reais + uma tabela dentro de seção):

```html
<h1>Jornada Otimizada</h1>
<p>Introdução à Jornada Otimizada do Open Finance Brasil.</p>
<h2>O que é</h2>
<p>A Jornada Otimizada reduz o número de redirecionamentos na iniciação de pagamentos.</p>
<h2>Serviços de pagamento contemplados</h2>
<p>Pix por aproximação, Transferências Inteligentes e demais serviços elegíveis.</p>
<table>
  <tr><th>Serviço</th><th>Suportado</th></tr>
  <tr><td>Pix</td><td>Sim</td></tr>
  <tr><td>TED</td><td>Não</td></tr>
</table>
<h2>Escopo de dados</h2>
<p>Consentimentos independentes com relacionamento entre si.</p>
```

- [ ] **Step 5: Registrar fixture e entrada no contract.test.ts**

In `test/contract.test.ts`, add a fixture read next to the other `readFileSync` calls (after the `pcmBusinessRulesHtml` block):

```ts
const jornadaOtimizadaHtml = readFileSync(
  new URL("./fixtures/jornada-otimizada-page.html", import.meta.url),
  "utf8"
);
```

and add this entry to the `fixtureData` map (after the `"pcm-business-rules"` entry):

```ts
  "jornada-otimizada": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(jornadaOtimizadaHtml) },
    ]),
  }),
```

- [ ] **Step 6: Rodar a suíte completa + typecheck**

Run: `npm run typecheck && npm test`
Expected: PASS. A suíte de conformidade (`describe.each` sobre o registry) agora inclui `jornada-otimizada`: metadados válidos, ids únicos, `getItem` resolve todo id de `search`, query sem match devolve vazio.

- [ ] **Step 7: Commit**

```bash
git add src/domains/jornada-otimizada/ src/core/registry.ts test/fixtures/jornada-otimizada-page.html test/contract.test.ts
git commit -m "feat: domínio jornada-otimizada (Jornada Otimizada + subpáginas Confluence)

Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE"
```

---

## Self-Review

- **Cobertura do spec:**
  - Módulo compartilhado `_confluence-sections` (parser + fábrica) → Tasks 1–2. ✓
  - Migração de `pcm-business-rules` (config, index one-liner, deletar arquivos, reapontar contract imports, id inalterado) → Task 3. ✓
  - Novo domínio `jornada-otimizada` (config com 4 páginas hardcoded, index, registry, fixture, entrada no contract) → Task 4. ✓
  - Filtros `page`/`heading`/`contains` na fábrica → Task 2. ✓
  - Testes contra fixtures, sem rede → todas as tasks. ✓
- **Placeholders:** nenhum — todo passo mostra conteúdo completo de arquivo ou comando exato.
- **Consistência de tipos:** `ConfluenceSection` (Task 1) consumido por `ConfluencePageSections`/`buildItems`/`parseSections` (Task 2); `ConfluenceSectionsConfig` (Task 2) satisfeito estruturalmente por `pcmBusinessRulesConfig` (Task 3) e `jornadaOtimizadaConfig` (Task 4); `createConfluenceSectionsDomain` e `buildItems` com nomes idênticos em todos os consumidores. ✓
