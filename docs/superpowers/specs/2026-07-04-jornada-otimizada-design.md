# Design — Domínio `jornada-otimizada` + fábrica compartilhada `_confluence-sections`

Data: 2026-07-04

## Objetivo

Adicionar um domínio `jornada-otimizada` que expõe o conhecimento regulatório da
**Jornada Otimizada** do Open Finance Brasil, extraído da página Confluence
[Jornada Otimizada](https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/1128890377/Jornada+Otimizada)
e de suas subpáginas.

O conteúdo é textual, organizado por headings (h1–h3), com tabelas ocasionais
dentro das seções — estruturalmente **idêntico** ao domínio `pcm-business-rules`
já existente. Aproveitamos essa identidade extraindo uma fábrica compartilhada
`_confluence-sections`, no mesmo espírito do `_openapi`/`createOpenApiDomain`.

## Páginas

Descobertas via API pública do Confluence (`/child/page`). Sem netos — 1 pai + 3 filhas:

| pageId       | Título                          |
|--------------|---------------------------------|
| `1128890377` | Jornada Otimizada (introdução)  |
| `1129250817` | Orientações Gerais              |
| `1129021472` | Transferências Inteligentes     |
| `1128857617` | Jornada sem Redirecionamento    |

Os IDs ficam **hardcoded** em `config.ts`, como em todos os domínios existentes
(testável com fixtures, sem rede nos testes). Novas subpáginas upstream exigem
atualização do config.

## Arquitetura

Três frentes.

### 1. Módulo compartilhado `src/domains/_confluence-sections/`

Extraído de `pcm-business-rules`, espelhando o layout de `_openapi`:

- **`parser.ts`** — `parseSections(html)` + interface `ConfluenceSection`
  (`{ heading, level, content }`), movido de `pcm-business-rules/parser.ts`.
  Já achata tabelas em linhas `célula | célula` (via `blockText`), então as
  tabelas dentro das páginas da Jornada são tratadas. Cria uma seção sintética
  `intro` (level 0) para o conteúdo antes do primeiro heading.
- **`domain.ts`** — `createConfluenceSectionsDomain(config)` contendo a lógica
  hoje em `pcm-business-rules/index.ts`:
  - `slugify`, `buildItems(pages)` (id `${pageId}:${slug}` com desambiguação
    `-2`, `-3`… para headings repetidos),
  - `summarize` (snippet de 200 chars, remove `content`),
  - `extract(ctx)` — itera as páginas com `interRequestDelayMs` entre requests,
    reporta progresso, respeita `ctx.signal` (abort), usa `fetchConfluencePage`,
  - `search(data, query, filters)` — filtros `page` / `heading` / `contains`
    mais `query` livre; devolve snippets,
  - `getItem(data, id)` — registro completo com `content`.
- **`parser.test.ts`** + **`domain.test.ts`** — a cobertura hoje em
  `pcm-business-rules/{parser,index}.test.ts` migra para cá, parametrizada por
  um config de teste: seção intro, níveis de heading, achatamento de tabela,
  desambiguação de id, `search` devolve snippet e não `content`, `getItem`
  devolve `content` completo, truncamento do snippet, filtro `page`.

**Shape do config** — `ConfluenceSectionsConfig`:

```ts
export interface ConfluenceSectionsConfig {
  id: string;
  title: string;
  description: string;
  confluenceBaseUrl: string;
  interRequestDelayMs: number;
  retryDelaysMs: number[];
  pages: { pageId: string; title: string }[];
}
```

Os filtros (`page`, `heading`, `contains`) são idênticos entre os dois domínios,
então ficam definidos dentro da fábrica, não no config.

### 2. Migração de `pcm-business-rules` para a fábrica

- `config.ts` ganha `id`, `title`, `description` (movidos de `index.ts`).
- `index.ts` colapsa para:
  ```ts
  import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
  import { pcmBusinessRulesConfig } from "./config.js";
  export const pcmBusinessRulesDomain = createConfluenceSectionsDomain(pcmBusinessRulesConfig);
  ```
- Remover `pcm-business-rules/{parser.ts, parser.test.ts, index.test.ts}`
  (cobertura agora no módulo compartilhado).
- `test/contract.test.ts` importa `buildItems` / `parseSections` de
  `_confluence-sections` em vez de `pcm-business-rules`.
- O id do domínio continua `pcm-business-rules` — nenhuma mudança visível ao
  cliente.

### 3. Novo domínio `src/domains/jornada-otimizada/`

- **`config.ts`** — `id: "jornada-otimizada"`, título e descrição em português,
  `confluenceBaseUrl` `https://openfinancebrasil.atlassian.net`,
  `interRequestDelayMs: 2000`, `retryDelaysMs: [2000, 4000, 8000, 16000]`, e as
  4 páginas hardcoded acima.
- **`index.ts`** — one-liner:
  `export const jornadaOtimizadaDomain = createConfluenceSectionsDomain(jornadaOtimizadaConfig);`
- Registrar em `src/core/registry.ts`.
- Adicionar `test/fixtures/jornada-otimizada-page.html` + entrada em
  `fixtureData` de `contract.test.ts` para que a suíte de conformidade
  (`describe.each` sobre o registry) valide o contrato automaticamente.

**Id do domínio:** `jornada-otimizada`, sem sufixo de versão — consistente com os
outros domínios de conhecimento Confluence (`pcm-business-rules`,
`pcm-additional-info`). A regra de versão-no-id do CLAUDE.md é específica para
specs OpenAPI; o "v1.0" nos títulos das páginas é rótulo de documento, não major
de spec.

## Testes

- Nenhum teste bate na rede — tudo contra fixtures em `test/fixtures/`.
- Suíte de conformidade valida: metadados válidos, ids únicos de `search`, todo
  id de `search` resolvível por `getItem`, resultado vazio para query sem match.
- Cobertura de comportamento da fábrica em `_confluence-sections/domain.test.ts`.
- `npm run typecheck` e `npm test` verdes ao final.

## Fora de escopo (YAGNI)

- Descoberta dinâmica de subpáginas em `extract()` (usamos IDs hardcoded).
- Versão no id do domínio.
- Novos filtros além de `page` / `heading` / `contains`.
