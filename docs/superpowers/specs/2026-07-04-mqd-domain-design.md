# Design: domínio `mqd` (Motor de Qualidade de Dados)

Data: 2026-07-04

## Objetivo

Expor o conhecimento regulatório do **Motor de Qualidade de Dados (MQD)** do Open
Finance Brasil como um novo domínio do `opf-br-mcp`, extraído das páginas Confluence
sob a página-mãe [Motor de Qualidade de Dados][mqd] (id `362578565`).

[mqd]: https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/362578565/Motor+de+Qualidade+de+Dados

## Decisão de arquitetura

Domínio único construído com a fábrica existente `createConfluenceSectionsDomain`
(`src/domains/_confluence-sections/domain.ts`), idêntico em forma ao
`jornada-otimizada`. Cada item é uma seção (heading) de uma das páginas.

Nenhum código de core novo, nenhuma ferramenta nova, nenhuma alteração na fábrica.

### Tratamento do swagger

A página "Documentação da API" (`362578918`) embute a spec OpenAPI 3.0.3 do MQD
(`Motor de Qualidade de Dados - Cliente`, versão 2.3.0) como um **bloco de código YAML**
dentro do HTML da própria página — não há URL `.yaml` separada (ao contrário dos
domínios `*-openapi`). Por decisão do usuário, **não** parseamos essa spec por
endpoint/schema: o YAML fica como conteúdo textual de uma seção da página, buscável via
`search`/`get_item` como qualquer outra seção. A spec é pequena (um endpoint
`/ValidateResponse`, dois schemas).

## Arquivos

### `src/domains/mqd/config.ts`

Exporta `mqdConfig` no shape de `ConfluenceSectionsConfig`:

- `id: "mqd"`
- `title: "Motor de Qualidade de Dados (MQD)"`
- `description`: no estilo do `jornadaOtimizadaConfig` — explica que o domínio cobre as
  páginas Confluence do MQD, que cada item é uma seção (heading), que `search` devolve
  snippet e `get_item` o texto completo. Menciona que a spec OpenAPI do MQD está incluída
  como conteúdo da seção da página "Documentação da API".
- `confluenceBaseUrl: "https://openfinancebrasil.atlassian.net"`
- `interRequestDelayMs: 2000`
- `retryDelaysMs: [2000, 4000, 8000, 16000]`
- `pages` (7, títulos normalizados — corrigindo os "MDQ"/"MDQTroubleshooting" da fonte):

  | pageId      | title                          |
  | ----------- | ------------------------------ |
  | `362578617` | Especificação Técnica          |
  | `362578657` | Arquitetura                    |
  | `362578918` | Documentação da API            |
  | `362578967` | Manual de Instalação           |
  | `619413971` | Tabela de Endpoints Validados  |
  | `362579143` | FAQ                            |
  | `362579195` | Troubleshooting                |

### `src/domains/mqd/index.ts`

```ts
import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { mqdConfig } from "./config.js";

export const mqdDomain = createConfluenceSectionsDomain(mqdConfig);
```

### `src/core/registry.ts`

Importar `mqdDomain` e acrescentá-lo ao array `domains`.

## Comportamento herdado da fábrica

- **Filtros** surfaçados por `list_domains`: `page` (substring no título da página),
  `heading` (substring no heading da seção), `contains` (substring no conteúdo).
- **`search(data, query?, filters?)`**: aplica filtros + query textual sobre
  `heading + content`; devolve resumos com `snippet` (200 chars) e `id` estável.
- **`getItem(data, id)`**: devolve a seção completa (com `content`).
- **`ttlHours: 24`**, cache por domínio no core existente.

## Testes

- Adicionar fixture `test/fixtures/mqd-page.html` — HTML `body.view` real de uma página
  MQD rica em headings (a "Tabela de Endpoints Validados", `619413971`, tem ~18 headings),
  garantindo que `parseSections` produza múltiplas seções com ids únicos.
- Registrar um builder em `fixtureData` de `test/contract.test.ts`, no mesmo shape do
  `jornada-otimizada`:

  ```ts
  "mqd": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(mqdHtml) },
    ]),
  }),
  ```

- A suíte de conformidade (`describe.each` sobre a registry) valida automaticamente:
  metadados válidos, ids únicos de `search`, todo id resolvível por `getItem`, resultado
  vazio para query sem match.

## Fora de escopo

- Parsear a spec OpenAPI embutida por endpoint/schema (fica como texto de seção).
- Bump de versão do pacote (`PACKAGE_VERSION` / `package.json`).
- Páginas fora da árvore MQD.

## Critérios de aceite

- `npm test`, `npm run typecheck` passam.
- `list_domains` mostra `mqd` com os três filtros.
- `search`/`get_item` funcionam sobre as seções extraídas das 7 páginas.
