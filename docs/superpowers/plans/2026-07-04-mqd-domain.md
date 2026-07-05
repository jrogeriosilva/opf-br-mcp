# Domínio `mqd` (Motor de Qualidade de Dados) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o domínio `mqd`, expondo as páginas Confluence do Motor de Qualidade de Dados como seções buscáveis, reutilizando a fábrica `createConfluenceSectionsDomain`.

**Architecture:** Domínio único construído com `createConfluenceSectionsDomain` (idêntico em forma a `jornada-otimizada`). Um `config.ts` lista as 7 páginas Confluence; `index.ts` instancia a fábrica; registra-se em `registry.ts`. A spec OpenAPI embutida da página "Documentação da API" fica como texto de seção (não é parseada por endpoint). A conformidade é validada pela suíte `describe.each` sobre a registry, alimentada por uma fixture HTML real.

**Tech Stack:** TypeScript strict, ESM (`NodeNext`, imports com `.js`), Vitest, cheerio (já usado pelo parser).

## Global Constraints

- ESM com resolução `NodeNext`: imports relativos exigem extensão `.js` explícita.
- Node >= 20, TypeScript strict.
- Strings voltadas ao usuário e mensagens de commit em português.
- Testes nunca acessam a rede — parsers testados contra fixtures em `test/fixtures/`.
- Commits seguem conventional-commits (`feat:`, `test:`, etc.) em português.
- Não fazer bump de `PACKAGE_VERSION`/`package.json`.

---

### Task 1: Domínio `mqd` (config + index + registro)

Cria o domínio completo e o registra. A fixture já existe em disco
(`test/fixtures/mqd-page.html`, salva durante o planejamento); a validação de
contrato é feita na Task 2. Este é o menor incremento que compila e entrega o
domínio wired.

**Files:**
- Create: `src/domains/mqd/config.ts`
- Create: `src/domains/mqd/index.ts`
- Modify: `src/core/registry.ts`

**Interfaces:**
- Consumes: `createConfluenceSectionsDomain(config: ConfluenceSectionsConfig): Domain` de `src/domains/_confluence-sections/domain.js`. O shape de `ConfluenceSectionsConfig` é: `{ id, title, description, confluenceBaseUrl, interRequestDelayMs, retryDelaysMs: number[], pages: { pageId: string; title: string }[] }`.
- Produces: `export const mqdDomain: Domain` de `src/domains/mqd/index.js`; `export const mqdConfig` de `src/domains/mqd/config.js`.

- [ ] **Step 1: Criar `src/domains/mqd/config.ts`**

```ts
export const mqdConfig = {
  id: "mqd",
  title: "Motor de Qualidade de Dados (MQD)",
  description:
    "Conhecimento regulatório do Motor de Qualidade de Dados (MQD) do Open Finance Brasil, " +
    "extraído das páginas Confluence: Especificação Técnica, Arquitetura, Documentação da API, " +
    "Manual de Instalação, Tabela de Endpoints Validados, FAQ e Troubleshooting. Cada item é uma " +
    "seção (heading) de uma página. search devolve um snippet do conteúdo; use get_item para o " +
    "texto completo da seção. A spec OpenAPI do MQD está incluída como conteúdo da seção da página " +
    "Documentação da API.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "362578617", title: "Especificação Técnica" },
    { pageId: "362578657", title: "Arquitetura" },
    { pageId: "362578918", title: "Documentação da API" },
    { pageId: "362578967", title: "Manual de Instalação" },
    { pageId: "619413971", title: "Tabela de Endpoints Validados" },
    { pageId: "362579143", title: "FAQ" },
    { pageId: "362579195", title: "Troubleshooting" },
  ],
};
```

- [ ] **Step 2: Criar `src/domains/mqd/index.ts`**

```ts
import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { mqdConfig } from "./config.js";

export const mqdDomain = createConfluenceSectionsDomain(mqdConfig);
```

- [ ] **Step 3: Registrar em `src/core/registry.ts`**

Adicionar o import junto aos demais domínios:

```ts
import { mqdDomain } from "../domains/mqd/index.js";
```

E adicionar `mqdDomain` ao final do array `domains`:

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
  mqdDomain,
];
```

- [ ] **Step 4: Rodar o typecheck**

Run: `npm run typecheck`
Expected: PASS (sem erros).

- [ ] **Step 5: Commit**

```bash
git add src/domains/mqd/config.ts src/domains/mqd/index.ts src/core/registry.ts
git commit -m "feat: domínio mqd (Motor de Qualidade de Dados)"
```

---

### Task 2: Fixture de conformidade + validação da suíte

Registra a fixture do `mqd` na suíte de contrato, fazendo o `describe.each`
sobre a registry validar automaticamente o novo domínio (metadados, ids únicos,
resolubilidade por `getItem`, resultado vazio sem match).

**Files:**
- Modify: `test/contract.test.ts`
- Test: `test/contract.test.ts` (a própria suíte de conformidade)
- (fixture `test/fixtures/mqd-page.html` já está em disco — versionar no commit)

**Interfaces:**
- Consumes: `buildPcmRulesItems` (alias de `buildItems` de `src/domains/_confluence-sections/domain.js`) e `parseSections` de `src/domains/_confluence-sections/parser.js` — ambos já importados no arquivo. Assinatura: `buildPcmRulesItems(pages: { pageId, title, url, sections }[])`, `parseSections(html: string): ConfluenceSection[]`.
- Produces: entrada `"mqd"` no objeto `fixtureData`.

- [ ] **Step 1: Verificar que o teste de fixture faltante FALHA**

Antes de registrar a fixture, a suíte deve reprovar o `mqd` (a registry já o
contém após a Task 1, mas não há builder de fixture).

Run: `npx vitest run test/contract.test.ts`
Expected: FAIL no caso `contrato do domínio mqd > tem fixture registrada para os testes de conformidade` (mensagem: `registre fixture para mqd em test/contract.test.ts`).

- [ ] **Step 2: Adicionar a leitura do fixture HTML**

Em `test/contract.test.ts`, junto aos outros `readFileSync` de fixtures HTML (perto de `jornadaOtimizadaHtml`), adicionar:

```ts
const mqdHtml = readFileSync(new URL("./fixtures/mqd-page.html", import.meta.url), "utf8");
```

- [ ] **Step 3: Registrar o builder em `fixtureData`**

Adicionar a entrada `"mqd"` ao objeto `fixtureData`, após a entrada `"jornada-otimizada"`:

```ts
  "mqd": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(mqdHtml) },
    ]),
  }),
```

- [ ] **Step 4: Rodar a suíte de contrato e verificar PASS**

Run: `npx vitest run test/contract.test.ts`
Expected: PASS em todos os casos `contrato do domínio mqd > ...` (metadados válidos, fixture registrada, ids únicos de `search`, todo id resolvível por `getItem`, query sem match devolve vazio).

- [ ] **Step 5: Rodar a suíte completa e o typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS em ambos.

- [ ] **Step 6: Commit**

```bash
git add test/contract.test.ts test/fixtures/mqd-page.html
git commit -m "test: fixture e conformidade do domínio mqd"
```

---

## Self-Review

**Spec coverage:**
- Arquivos `config.ts` / `index.ts` / registro → Task 1. ✓
- Descrição/filtros/search/getItem herdados → Task 1 (via fábrica). ✓
- Fixture + builder em contract.test.ts → Task 2. ✓
- Tratamento do swagger como texto de seção → coberto por não parsear (nada a fazer; `config.ts` menciona na `description`). ✓
- Fora de escopo (sem parse de openapi, sem bump de versão) → respeitado. ✓
- Critérios de aceite (`npm test`, `npm run typecheck`, `list_domains`, `search`/`get_item`) → validados pela suíte de contrato na Task 2. ✓

**Placeholder scan:** nenhum TBD/TODO; todo passo tem código/comando concreto. ✓

**Type consistency:** `mqdConfig` (config.ts) → consumido por `index.ts`; `mqdDomain` → registrado em `registry.ts` e validado pela registry na `contract.test.ts`. `buildPcmRulesItems`/`parseSections` são os símbolos já existentes no arquivo de teste. ✓
