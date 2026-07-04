# Design — Domínios PCM (API + regras de negócio)

Data: 2026-07-04
Status: aprovado

## Objetivo

Completar a cobertura da PCM (Plataforma de Coleta de Métricas) no `opf-br-mcp`.
Hoje o projeto só expõe as regras de obrigatoriedade do `additionalInfo`
(`pcm-additional-info`). Faltam dois corpos de conhecimento:

1. **A API da PCM** — a spec OpenAPI oficial (endpoints e schemas de reporte).
2. **As regras de negócio** — como reportar, como a plataforma processa e
   como se resolvem divergências (páginas Confluence do Open Finance Brasil).

Entregamos isso como **dois novos domínios**, sem adicionar nenhuma tool nova
(o servidor continua com as 4 tools genéricas). O `llms.txt`/apidog foi
avaliado e **descartado** por ser conteúdo redundante com a spec OpenAPI.

## Domínio 1 — `pcm-openapi`

Envelopa a spec OpenAPI da PCM. Reutiliza o padrão OpenAPI já consolidado
(`payments-v4-openapi`, `payments-v5-openapi`, `enrollments-v2-openapi`,
`automatic-payments-v2-openapi`, `consents-v3-openapi`) sem novidade estrutural.

- **Fonte:**
  `https://raw.githubusercontent.com/OpenBanking-Brasil/pcm-specs/refs/heads/feature/correct-paths/PCM-current.openapi.yaml`
  - ⚠️ É um *feature branch* (`feature/correct-paths`), não `main`. Foi a fonte
    indicada como "fonte máxima". O `config.ts` deve documentar por comentário
    que a URL aponta para um branch instável e pode precisar de atualização.
- **Spec:** OpenAPI 3.9.2, `info.version: 1.0.0`, ~53 schemas. Um único arquivo
  cobre paths `report-api/v1` e `report-api/v2`, além de `token`, `opendata`,
  `consents/stock`, `credit-portabilities`, `payments/status`, `hybrid-flow`.
- **Id do domínio:** `pcm-openapi` — **sem sufixo de major** (ex.: não
  `pcm-v1-openapi`), porque é um único arquivo de spec que mistura paths v1 e v2;
  não há um major único a codificar. `config.ts` guarda `specName: "pcm"` e
  `specVersion: "1.0.0"` (de `info.version`) só para exibição no título.
- **Parser:** `parseOpenApiSpec(yamlText, "pcm")` no mesmo formato dos demais —
  itens `type=operation` (um por método+path) e `type=schema` (um por schema).
  Segue a convenção do repositório de um `parser.ts` por domínio (cópia do
  parser OpenAPI existente), mantendo o domínio autocontido.
- **Ids de item:** `pcm:POST /report-api/v1/private/report/` (operation),
  `pcm:schema:ReportModel` (schema).
- **`search`** resume (remove o nó pesado `detail`) e o core compacta; **`get_item`**
  devolve o nó integral da spec.
- **Filtros:** `path` (substring no path), `method` (verbo HTTP exato),
  `schema` (substring no nome do schema) — idênticos aos outros domínios OpenAPI.

### Arquivos
- `src/domains/pcm-openapi/config.ts`
- `src/domains/pcm-openapi/parser.ts`
- `src/domains/pcm-openapi/index.ts`

## Domínio 2 — `pcm-business-rules`

As páginas Confluence de regras de negócio, com **um item por seção/heading**
(para busca precisa e revelação progressiva).

- **Fonte:** 5 páginas Confluence (`body.view` via API pública), na ordem:
  | pageId | título |
  |---|---|
  | `37945356` | Especificação Técnica |
  | `37945368` | Reporte, Processamento e Divergências |
  | `37879861` | Reporte |
  | `37912631` | Processamento |
  | `37945515` | Manual de Integração |
- **Estrutura das páginas:** prosa organizada por headings (h1–h3), com algumas
  tabelas e blocos de "cenário" (ex.: ciclo de vida do reporte — `DISCARDED`,
  `ACCEPTED`, `SINGLE`, `UNPAIRED`, `PAIRED_INCONSISTENT`, `PAIRED`).
- **Parser novo — `parseSections(html)`** (`src/domains/pcm-business-rules/parser.ts`):
  - Percorre a página em ordem de documento; cada heading `h1`–`h3` abre uma
    nova seção. O texto (incluindo tabelas e listas achatadas em texto legível,
    com `<br>` → `\n`) entre um heading e o próximo vira o `content` da seção.
  - Conteúdo antes do primeiro heading vira uma seção sintética `intro`.
  - Cada seção: `{ heading, level, content }` (heading e content podem ser
    strings; nunca array).
  - Headings vazios ou seções sem conteúdo útil são descartados.
- **Shape do item** (`index.ts`, análogo a `pcm-additional-info`):
  `{ id, heading, level, content, page: { pageId, title, url } }`.
  - **Id:** `${pageId}:${slug(heading)}`, com desambiguação por sufixo `-2`,
    `-3` quando o mesmo slug repete na página (mesma estratégia de `buildItems`
    em `pcm-additional-info`).
- **`search`:** devolve resumo — `id`, `page` (título), `heading`, `level` e um
  **snippet** do `content` (ex.: primeiros ~200 caracteres). **Não** devolve o
  `content` completo. **`get_item`:** devolve o item completo com `content`
  integral.
- **Filtros:**
  - `page` — substring no título da página (case-insensitive).
  - `heading` — substring no heading da seção.
  - `contains` — substring no `content` da seção.
  - `query` livre — casa em `heading` + `content`.

### Arquivos
- `src/domains/pcm-business-rules/config.ts` (baseUrl, `pages[]`,
  `interRequestDelayMs`, `retryDelaysMs`)
- `src/domains/pcm-business-rules/parser.ts` (`parseSections`)
- `src/domains/pcm-business-rules/index.ts`

## Melhoria pontual — fetcher Confluence compartilhado

Com dois consumidores do Confluence (`pcm-additional-info` e
`pcm-business-rules`), extrair o fetcher para o core:

- `src/core/confluence.ts` exporta
  `fetchConfluencePage(baseUrl, pageId, retryDelaysMs, signal?)`
  → `{ html, url }`, movendo os headers e a chamada `?expand=body.view` que hoje
  vivem em `src/domains/pcm-additional-info/fetcher.ts`.
- `pcm-additional-info` passa a importar do core; seu `fetcher.ts` é removido (ou
  vira um wrapper fino). Ambos os domínios PCM usam o helper compartilhado.
- Escopo restrito: nenhuma outra refatoração.

## Registro, testes e docs

- **Registry:** adicionar `pcmOpenapiDomain` e `pcmBusinessRulesDomain` em
  `src/core/registry.ts`.
- **Fixtures** (sem rede — obrigatório):
  - `test/fixtures/pcm-openapi-spec.yml` — recorte enxuto da spec (alguns paths +
    schemas), suficiente para o parser.
  - `test/fixtures/pcm-business-rules-page.html` — fragmento com múltiplos
    headings, uma tabela e conteúdo antes do primeiro heading.
- **Contract test:** registrar ambos no mapa `fixtureData` de
  `test/contract.test.ts`. A suíte `describe.each` sobre o registry valida
  automaticamente: metadados válidos, ids únicos de `search`, todo id resolvível
  por `getItem`, e lista vazia para query sem correspondência.
- **Testes unitários:**
  - `pcm-business-rules/parser.test.ts` — seções extraídas, intro, tabela
    achatada, desambiguação de heading repetido.
  - `pcm-business-rules/index.test.ts` — filtros `page`/`heading`/`contains`,
    snippet no `search` vs `content` completo no `get_item`.
  - `pcm-openapi` herda cobertura do contract test; teste unitário opcional só se
    houver comportamento específico.
- **README:** +2 linhas na tabela de domínios.
- **Versão:** bump minor em `package.json` **e** `src/core/version.ts`
  (`PACKAGE_VERSION`) em sincronia.

## Fora de escopo

- `llms.txt` / apidog como domínio (redundante com `pcm-openapi`).
- Uma página separada só de "Divergências" (coberta pela guarda-chuva
  `37945368`); pode ser adicionada depois ao `pages[]` se surgir um pageId.
- Qualquer refatoração do core além do fetcher Confluence compartilhado.

## Critérios de aceite

1. `npm test` verde, incluindo o contract test para os dois novos domínios.
2. `npm run typecheck` sem erros.
3. `list_domains` passa a listar `pcm-openapi` e `pcm-business-rules` com seus
   filtros.
4. `search`/`get_item` funcionam em ambos com revelação progressiva (search
   resume; get_item entrega o payload/section completo).
5. Nenhum teste toca a rede.
