# Design: domínio `portal` (busca ao vivo), domínio `participantes` e quick wins de busca/cache/HTTP

## Objetivo

Três frentes complementares, num único ciclo:

1. **`portal`** — busca ao vivo em todo o Portal do Desenvolvedor (Confluence OFB,
   espaço `OF`), para quando os domínios curados não cobrirem o assunto.
2. **`participantes`** — diretório de participantes do Open Finance Brasil
   (quais instituições suportam quais famílias de API e versões).
3. **Quick wins** — melhorias na busca (acentos, tokens), cache (invalidação por
   versão), HTTP (4xx sem retry), paginação (`offset`) e docs de tool.

Ambas as fontes foram validadas com acesso anônimo em 2026-07-05.

## 1. Extensão do contrato: capacidade `live`

O contrato atual (`src/core/types.ts`) é "extrai tudo → busca local síncrona";
busca ao vivo não cabe nele. Extensão mínima e explícita:

```ts
export interface Domain {
  // ... campos atuais inalterados
  /** Ausente em domínios live. */
  extract?(ctx?: ExtractContext): Promise<DomainData>;
  /** Domínio ao vivo: consulta a fonte a cada chamada; sem cache/refresh. */
  live?: {
    search(query: string, filters?: Record<string, string>, ctx?: ExtractContext): Promise<Item[]>;
    getItem(id: string, ctx?: ExtractContext): Promise<Item | null>;
  };
}
```

Invariante: todo domínio tem `extract` **ou** `live`, nunca ambos.

Desvios no core (`src/core/server.ts`):

- `search`/`get_item`: se `d.live`, chama direto os métodos live (passando o
  `ExtractContext` para abort), sem `getDomainData`.
- `search` em domínio live com `query` vazia → erro orientando a informar a query
  (não existe "listar tudo" numa busca ao vivo).
- `list_domains`: domínio live mostra `live: true` no lugar de
  `cachedItems`/`extractedAt`.
- `refresh`: pula domínios live; se for alvo explícito, responde
  "domínio ao vivo, sem cache".
- **Dica no zero-result**: quando um `search` em domínio **não-live** retorna 0
  matches, a resposta ganha
  `hint: "Sem resultados; tente search(domain: 'portal', query: ...) para buscar em todo o Portal do Desenvolvedor."`

Erro em domínio live é direto (`isError: true`) — não há cache para
stale-fallback; a mensagem sugere tentar novamente e deixa claro que `refresh`
não se aplica.

## 2. Domínio `portal`

- **Fonte**: `GET {base}/wiki/rest/api/search?cql=<CQL>&limit=25` com
  `CQL = siteSearch ~ "<query>" AND type = page AND space = "OF"`.
  Aspas e barras invertidas da query são escapadas antes da interpolação no CQL.
- **`live.search`** → um item por página:
  `id` (pageId do Confluence), `title`, `excerpt` (snippet que a própria API de
  busca devolve), `url` (webui absoluta), `lastModified`.
- **`live.getItem`** → reusa `fetchConfluencePage` (`src/core/confluence.ts`) +
  `parseSections` (`src/domains/_confluence-sections/parser.ts`) e devolve a
  página inteira: `{ id, title, url, sections: [{ heading, level, content }] }`.
- **Identidade**: `id: "portal"`, `title: "Portal do Desenvolvedor (busca ao vivo)"`.
  Descrição orienta o agente: usar quando os domínios específicos não cobrirem o
  assunto; resultados sempre atualizados, porém menos estruturados que os
  domínios curados.
- **Filtros**: nenhum (`filters: []`) — a query é o único parâmetro. YAGNI.
- `config.ts` com baseUrl, espaço, limite CQL e `retryDelaysMs`, como nos demais.

Ids de item (pageId) são estáveis entre buscas, mantendo a regra
"id vem de search" do contrato.

## 3. Domínio `participantes`

Domínio convencional (extract + cache 24h), nenhuma mudança de contrato.

- **Fonte**: `GET https://data.directory.openbankingbrasil.org.br/participants`
  (JSON público, ~107 organizações).
- **Itens**: um por organização. `id` = `OrganisationId` (UUID estável do
  diretório). Campos do resumo (retornados por `search`):
  - `name` (OrganisationName), `cnpj` (RegistrationNumber), `status`,
  - `apiFamilies`: lista única agregada de `ApiFamilyType` + `ApiVersion` de
    todos os `AuthorisationServers` da organização,
  - `servers`: quantidade de authorisation servers.
  - Nó completo da organização (com AuthorisationServers, logos, endpoints)
    fica em `detail`, entregue só pelo `get_item` — mesmo padrão dos domínios
    OpenAPI.
- **Filtros**:
  - `name` — substring em OrganisationName **e** nos CustomerFriendlyName dos servers;
  - `api` — substring em ApiFamilyType (ex.: `payments`);
  - `status` — igualdade case-insensitive (ex.: `Active`);
  - `cnpj` — prefixo/substring em RegistrationNumber.
- **Identidade**: `id: "participantes"`, `title: "Diretório de Participantes"`.
  Fonte de dados dinâmica (não é spec versionada), portanto id sem versão.
- `retryDelaysMs` iguais aos demais domínios; `ttlHours: 24`.

## 4. Quick wins

1. **Busca com acentos + tokens** — util compartilhado no core
   (`src/core/text.ts`): `normalize()` (NFD, remove diacríticos, lowercase) e
   `matchesQuery(haystack, query)` (query quebrada em termos por whitespace,
   todos devem casar — AND). Aplicado nos dois helpers (`_openapi/domain.ts`,
   `_confluence-sections/domain.ts`) tanto na `query` quanto nos filtros de
   substring. `"vinculo"` passa a achar "vínculo".
2. **Invalidação de cache por versão** — `isFresh` (ou o chamador em
   `src/core/data.ts`) trata entrada com `packageVersion` ≠ atual como
   não-fresca: re-extrai, mas a entrada antiga continua válida como fallback
   stale se a extração falhar.
3. **HTTP: 4xx sem retry** — `fetchWithRetry` não re-tenta status 4xx
   (exceto 429); 5xx e erros de rede seguem com retry.
4. **`offset` no `search`** — novo parâmetro (`min 0, default 0`) combinado com
   `limit`; resposta continua reportando `matches`/`returned`.
5. **Descrição de `get_item`** — deixa de citar só `payments-v4-openapi`; passa
   a dizer que domínios OpenAPI incluem o nó integral da spec em `detail`.

## 5. Testes

- Fixtures novos: `test/fixtures/portal-search.json` (resposta CQL real
  abreviada), `test/fixtures/participants.json` (subconjunto representativo).
- **Suíte de conformidade** (`test/contract.test.ts`): ganha um ramo para
  domínios live — mocka `fetch` global com a fixture e valida o mesmo contrato
  (ids únicos no search, todo id de search resolvível por getItem, zero-match
  vazio). `participantes` entra no mapa `fixtureData` normalmente.
- Unit tests: `normalize`/`matchesQuery` (acentos, multi-termo),
  invalidação por versão no cache, 4xx sem retry (429 com retry),
  escaping de CQL, dica de zero-result no server.
- Nenhum teste toca a rede.

## 6. Docs

- Linhas de `portal` e `participantes` na tabela de domínios do `README.md`.
- Nota no README sobre o domínio live (sem cache) e sobre o `offset`.
- `CLAUDE.md`: registrar a capacidade `live` no resumo do contrato.

## Ordem de implementação

1. Quick wins (pequenos, independentes, melhoram tudo que já existe).
2. `participantes` (sem mudança de contrato).
3. Contrato `live` + domínio `portal` + dica de zero-result.

## Fora de escopo (YAGNI)

- Busca cross-domain (`search` sem `domain`) — fica para um ciclo futuro.
- Cache/memoização de páginas no `portal.getItem`.
- Ranking/fuzzy na busca local (só normalização + AND).
- ETag/If-None-Match nas extrações.
- Detector de novas versões de spec; MCP resources/prompts; publicação npm/MCPB.
