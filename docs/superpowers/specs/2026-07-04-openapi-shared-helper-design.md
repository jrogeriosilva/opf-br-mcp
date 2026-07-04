# Helper OpenAPI compartilhado — design

Data: 2026-07-04
Escopo: refactor interno, sem mudança de comportamento observável.

## Problema

Os 5 domínios que embrulham uma spec OpenAPI — `payments-v4-openapi`,
`payments-v5-openapi`, `enrollments-v2-openapi`, `automatic-payments-v2-openapi`,
`consents-v3-openapi` — duplicam praticamente todo o código:

- **`parser.ts`**: byte-idêntico nos 5 (mesmo md5 `f40472c3bf4a210258f33c5b8fb7adee`).
- **`index.ts`**: `summarize`, `filters`, `extract`, `search` e `getItem` têm lógica
  idêntica. Diferem apenas em `id`, `title`, `description`, o config importado, e o
  exemplo de path em `filters[0].description`.
- **`config.ts`**: já isola o que realmente varia (`specName`, `specVersion`, `url`,
  `retryDelaysMs`).

`pcm-openapi` tem parser próprio (não usa `parseOpenApiSpec`) e **fica fora** deste
refactor.

## Objetivo

Colapsar a lógica repetida numa factory e num parser compartilhados, de forma que cada
domínio OpenAPI seja descrito só por sua configuração. Zero mudança de comportamento:
mesmos `id`s, mesmos resultados de `search`/`getItem`, mesmas descrições de tools.

## Decisões (aprovadas)

1. **Localização**: `src/domains/_openapi/`. Prefixo `_` sinaliza "não é um domínio
   registrável". Fica em `domains/` e não em `core/` porque o core é domain-agnostic
   (CLAUDE.md) e um parser OpenAPI é específico de um formato.
2. **Testes**: consolidar em `_openapi/`. Um `parser.test.ts` e um `domain.test.ts`
   compartilhados; remover os `parser.test.ts`/`index.test.ts` por-domínio. A
   `contract.test.ts` continua validando cada domínio individualmente via fixtures.
3. **Metadata**: tudo em `config.ts`. O `config.ts` de cada domínio vira o objeto
   completo passado à factory; `index.ts` fica com uma linha.

## Arquitetura

### `src/domains/_openapi/`

```
_openapi/
  parser.ts       # parseOpenApiSpec (movido, sem alteração)
  domain.ts       # createOpenApiDomain(config): Domain
  parser.test.ts  # teste único do parser (fixture)
  domain.test.ts  # teste único da factory (fixture)
```

#### `parser.ts`

Movido tal-e-qual do domínio atual (é byte-idêntico nos 5). Assinatura mantida:

```ts
export function parseOpenApiSpec(yamlText: string, specName: string): Item[]
```

#### `domain.ts` — a factory

```ts
export interface OpenApiDomainConfig {
  id: string;
  title: string;
  description: string;
  pathExample: string;   // usado no filters[0].description
  specName: string;
  specVersion: string;
  url: string;
  retryDelaysMs: number[];
}

export function createOpenApiDomain(config: OpenApiDomainConfig): Domain
```

A factory reproduz exatamente o `index.ts` atual, parametrizado:

- `summarize` — helper interno idêntico (drop `detail`).
- `id`, `title`, `description` — de `config`.
- `filters` — os 3 filtros fixos (`path`, `method`, `schema`); só o
  `path.description` interpola `config.pathExample`.
- `extract` — idêntico (abort check, `onProgress`, `fetchWithRetry`, `parseOpenApiSpec`).
- `search`/`getItem` — idênticos.

### Cada domínio OpenAPI

`config.ts` passa a exportar o objeto completo:

```ts
export const paymentsConfig: OpenApiDomainConfig = {
  id: "payments-v4-openapi",
  title: `API de Pagamentos — spec OpenAPI 4.0.0`,
  description: "...",       // texto atual preservado verbatim
  pathExample: "/pix/payments",
  specName: "payments",
  specVersion: "4.0.0",
  url: "https://raw.githubusercontent.com/.../4.0.0.yml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

`index.ts` fica com uma linha:

```ts
import { createOpenApiDomain } from "../_openapi/domain.js";
import { paymentsConfig } from "./config.js";
export const paymentsDomain = createOpenApiDomain(paymentsConfig);
```

`registry.ts` **não muda** (os nomes exportados dos domínios são preservados:
`paymentsDomain`, `paymentsV5Domain`, `enrollmentsV2Domain`,
`automaticPaymentsV2Domain`, `consentsV3Domain`).

## Preservação de comportamento

Pontos que exigem cuidado para manter byte-igualdade de saída:

- **`title`/`description`**: copiar o texto atual de cada `index.ts` verbatim para o
  `config.ts`. Hoje alguns interpolam `${config.specVersion}` no title — manter.
- **`pathExample`**: extrair o exemplo atual de cada `filters[0].description`
  (`/pix/payments`, `/enrollments`, `/consents/{consentId}`,
  `/pix/recurring-payments`, `/pix/payments`).
- **`onProgress`**: a mensagem `Baixando spec ${specName} ${specVersion}` é a mesma nos
  5; `automatic-payments` só quebra a chamada em múltiplas linhas por formatação — a
  string resultante é idêntica.

## Testes

- **Remover**: `parser.test.ts` e `index.test.ts` de `payments-v4`, `payments-v5`,
  `consents-v3` (enrollments e automatic-payments não têm testes próprios hoje).
- **Adicionar**: `_openapi/parser.test.ts` (porta o conteúdo do `parser.test.ts` atual,
  usando a fixture `payments-spec.yml`) e `_openapi/domain.test.ts` (porta o
  `index.test.ts` atual, exercitando `createOpenApiDomain` com uma config de fixture).
- **Inalterado**: `contract.test.ts` — o `describe.each` sobre o registry continua
  validando cada um dos 5 domínios (metadata válida, ids únicos, todo id de `search`
  resolvível por `getItem`, resultado vazio para query sem match).

## Critérios de sucesso

- `npm test` verde (incluindo os testes de contrato dos 5 domínios).
- `npm run typecheck` limpo.
- Nenhum arquivo `parser.ts` duplicado remanescente nos domínios OpenAPI.
- `git grep parseOpenApiSpec` só aponta para `_openapi/` e seus testes.
- Diff não altera nenhum `id`, texto de `title`/`description`, ou `registry.ts`.

## Fora de escopo

- `pcm-openapi`, `pcm-additional-info`, `pcm-business-rules` (parsers próprios).
- Qualquer mudança na API das 4 tools ou no contrato `Domain`.
- Bump de versão (é refactor interno; sem mudança observável).
