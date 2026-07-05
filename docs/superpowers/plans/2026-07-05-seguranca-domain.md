# Domínio `seguranca` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o domínio `seguranca`, expondo o conhecimento regulatório de Segurança do Open Finance Brasil (árvore Confluence sob a página 240648193) via os 4 tools genéricos do servidor MCP.

**Architecture:** Reutiliza o factory `createConfluenceSectionsDomain` (`src/domains/_confluence-sections/domain.ts`), idêntico ao padrão de `jornada-otimizada`/`mqd`. O domínio é só configuração: um `config.ts` com a lista curada de 18 páginas + um `index.ts` de 4 linhas + registro + fixture de teste + linha no README. Nenhuma lógica de parsing/busca nova.

**Tech Stack:** TypeScript strict, ESM (NodeNext, imports com `.js`), Node ≥ 20, Vitest.

## Global Constraints

- ESM com resolução NodeNext: imports relativos exigem extensão `.js` explícita.
- Strings de usuário, docs e mensagens de commit em Português.
- Testes nunca tocam a rede — validam contra fixtures em `test/fixtures/`.
- Commits seguem conventional-commits (`feat:`, `test:`, `docs:`) em Português.
- Domínio de conhecimento (não spec versionada): id sem versão → `seguranca`.
- Toda linha de commit termina com: `Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE`

---

### Task 1: Config e domínio `seguranca`

**Files:**
- Create: `src/domains/seguranca/config.ts`
- Create: `src/domains/seguranca/index.ts`
- Modify: `src/core/registry.ts`

**Interfaces:**
- Consumes: `createConfluenceSectionsDomain(config: ConfluenceSectionsConfig): Domain` de `../_confluence-sections/domain.js`. O tipo `ConfluenceSectionsConfig` exige: `id`, `title`, `description`, `confluenceBaseUrl`, `interRequestDelayMs`, `retryDelaysMs`, `pages: { pageId: string; title: string }[]`.
- Produces: `export const segurancaDomain: Domain` (usado pelo registry e pela suíte de contrato).

- [ ] **Step 1: Criar `src/domains/seguranca/config.ts`**

```typescript
export const segurancaConfig = {
  id: "seguranca",
  title: "Segurança",
  description:
    "Conhecimento regulatório de Segurança do Open Finance Brasil, extraído das páginas " +
    "Confluence sob a árvore Segurança: Visão Geral, Introdução, Guia do Usuário, Perfil de " +
    "Segurança (DCR, FAPI, CIBA, criptografia de ID_TOKEN), Padrão de Certificados e diretrizes " +
    "de validação, Assinaturas, Casos de Erro, Redirecionamento App-to-App, Glossário e Política " +
    "de Versionamento. Cada item é uma seção (heading) de uma página. search devolve um snippet do " +
    "conteúdo; use get_item para o texto completo da seção.",
  confluenceBaseUrl: "https://openfinancebrasil.atlassian.net",
  interRequestDelayMs: 2000,
  retryDelaysMs: [2000, 4000, 8000, 16000],
  pages: [
    { pageId: "240648227", title: "Visão Geral" },
    { pageId: "240648385", title: "Introdução" },
    { pageId: "240648471", title: "Guia do Usuário" },
    { pageId: "240648789", title: "Perfil de Segurança" },
    { pageId: "240649257", title: "DCR - Dynamic Client Registration" },
    { pageId: "1799421990", title: "FAPI - Financial-grade API Security Profile" },
    { pageId: "1799946241", title: "CIBA - Client Initiated Backchannel Authentication" },
    { pageId: "240649215", title: "Requisitos de criptografia ID_TOKEN" },
    { pageId: "240649813", title: "Padrão de Certificados" },
    { pageId: "1799946375", title: "Diretrizes para validação de certificados digitais" },
    { pageId: "240650189", title: "Assinaturas" },
    { pageId: "240650255", title: "Casos de Erro" },
    { pageId: "240650317", title: "Redirecionamento App-to-App" },
    { pageId: "240650381", title: "Glossário de Segurança" },
    { pageId: "240650571", title: "Versionamento - Tipos" },
    { pageId: "240650601", title: "Versionamento - Ciclo de Vida" },
    { pageId: "240650643", title: "Versionamento - Fluxo de especificação" },
    { pageId: "240650712", title: "Versionamento - Change log" },
  ],
};
```

- [ ] **Step 2: Criar `src/domains/seguranca/index.ts`**

```typescript
import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { segurancaConfig } from "./config.js";

export const segurancaDomain = createConfluenceSectionsDomain(segurancaConfig);
```

- [ ] **Step 3: Registrar no `src/core/registry.ts`**

Adicionar o import junto aos demais (após a linha do `webhookDomain`):

```typescript
import { segurancaDomain } from "../domains/seguranca/index.js";
```

E adicionar `segurancaDomain` ao final do array `domains`:

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
  jornadaOtimizadaDomain,
  mqdDomain,
  webhookDomain,
  segurancaDomain,
];
```

- [ ] **Step 4: Rodar typecheck**

Run: `npm run typecheck`
Expected: sem erros (exit 0).

- [ ] **Step 5: Rodar a suíte — deve FALHAR por falta de fixture**

Run: `npm test`
Expected: FALHA. O `describe.each` sobre o registry agora inclui `seguranca`, mas não há builder em `fixtureData`, então a asserção `expect(fixtureData[id]).toBeDefined()` (test/contract.test.ts:81) falha com a mensagem `registre fixture para seguranca em test/contract.test.ts`. Isto confirma que o domínio está registrado e sob contrato. Prossiga para a Task 2 (não commite ainda).

---

### Task 2: Fixture e registro no contract test

**Files:**
- Create: `test/fixtures/seguranca-page.html`
- Modify: `test/contract.test.ts`

**Interfaces:**
- Consumes: `buildItems as buildPcmRulesItems` e `parseSections` — ambos já importados no topo de `test/contract.test.ts` (linhas 10-11). Nenhum import novo é necessário.
- Produces: entrada `"seguranca"` no mapa `fixtureData`, satisfazendo o contrato do `describe.each`.

- [ ] **Step 1: Criar o fixture `test/fixtures/seguranca-page.html`**

HTML representativo com múltiplos headings e uma tabela (exercita o parser de seções). Espelha o formato do `jornada-otimizada-page.html`.

```html
<h1>Perfil de Segurança do Open Finance Brasil</h1>
<p>Introdução ao perfil de segurança adotado no Open Finance Brasil.</p>
<h2>FAPI</h2>
<p>O Open Finance Brasil adota o Financial-grade API Security Profile (FAPI) para proteção das APIs.</p>
<h2>DCR - Dynamic Client Registration</h2>
<p>Registro dinâmico de clientes conforme o padrão do diretório de participantes.</p>
<table>
  <tr><th>Componente</th><th>Obrigatório</th></tr>
  <tr><td>mTLS</td><td>Sim</td></tr>
  <tr><td>JARM</td><td>Sim</td></tr>
</table>
<h2>Padrão de Certificados</h2>
<p>Certificados ICP-Brasil e da autoridade certificadora do Open Finance Brasil.</p>
```

- [ ] **Step 2: Registrar o fixture no `test/contract.test.ts`**

Adicionar, junto aos demais `readFileSync` (após a linha do `mqdHtml`, linha 31):

```typescript
const segurancaHtml = readFileSync(new URL("./fixtures/seguranca-page.html", import.meta.url), "utf8");
```

- [ ] **Step 3: Adicionar o builder no mapa `fixtureData`**

Adicionar a entrada `"seguranca"` ao objeto `fixtureData` (após a entrada `"mqd"`, antes de `"webhook-v1-openapi"`), espelhando o padrão do `jornada-otimizada`:

```typescript
  "seguranca": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(segurancaHtml) },
    ]),
  }),
```

- [ ] **Step 4: Rodar a suíte completa — deve PASSAR**

Run: `npm test`
Expected: PASS. O contrato de `seguranca` valida: metadados válidos, ids únicos de `search`, todo id de `search` resolvível por `getItem`, resultado vazio para query sem match.

- [ ] **Step 5: Rodar typecheck**

Run: `npm run typecheck`
Expected: sem erros (exit 0).

- [ ] **Step 6: Commit**

```bash
git add src/domains/seguranca/ src/core/registry.ts test/fixtures/seguranca-page.html test/contract.test.ts
git commit -m "feat: domínio seguranca

Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE"
```

---

### Task 3: Documentar na tabela de domínios do README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: nada.
- Produces: linha do domínio `seguranca` na tabela.

- [ ] **Step 1: Adicionar a linha na tabela de domínios**

Após a linha do `webhook-v1-openapi` na tabela de domínios do `README.md`, adicionar:

```markdown
| `seguranca` | Confluence público OFB | Segurança do Open Finance Brasil (Perfil de Segurança, FAPI, DCR, CIBA, Padrão de Certificados, Assinaturas, Casos de Erro, Redirecionamento App-to-App, Glossário, Versionamento) — item por seção |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: seguranca na tabela de domínios do README

Claude-Session: https://claude.ai/code/session_015LTCCJXBr3uBo6KMJCcBhE"
```

---

## Notas de execução

- A ordem importa: a Task 1 deixa a suíte propositalmente vermelha (domínio registrado sem fixture); a Task 2 a fecha em verde. Não commite entre a Task 1 e a Task 2 — o commit único da Task 2 cobre ambas.
- Nenhum bump de versão é necessário (adicionar domínio não altera `PACKAGE_VERSION`).
