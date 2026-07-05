# Design: domínio `seguranca`

## Objetivo

Dar aos agentes de código acesso token-efficient ao conhecimento regulatório de
**Segurança** do Open Finance Brasil, extraído da árvore Confluence sob a página
[Segurança](https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/240648193/Seguran+a)
(pageId `240648193`).

## Arquitetura

Reaproveita integralmente o factory `createConfluenceSectionsDomain`
(`src/domains/_confluence-sections/domain.ts`), o mesmo usado por
`jornada-otimizada`, `mqd` e `pcm-business-rules`. Nenhuma lógica nova:

- `src/domains/seguranca/config.ts` — id, título, descrição, delays e a lista de páginas.
- `src/domains/seguranca/index.ts` — `export const segurancaDomain = createConfluenceSectionsDomain(segurancaConfig);`
- Registro em `src/core/registry.ts`.

Cada heading de cada página vira um item com id estável `${pageId}:${slug(heading)}`.
`search` devolve snippet (200 chars) + metadados; `get_item` traz a seção completa.
Filtros herdados do factory: `page`, `heading`, `contains`.

## Identidade

Domínio de conhecimento (não é uma spec versionada única), portanto id sem versão,
seguindo o padrão de `jornada-otimizada`:

- `id: "seguranca"`
- `title: "Segurança"`

## Escopo de páginas (curado puro — 18 páginas)

A árvore de Segurança é aninhada e heterogênea. Incluímos apenas as páginas de
**conteúdo real**: os filhos versionados (`v1.0`/`v2.0`), as páginas de tópico
específico, e o topo `Perfil de Segurança` (que tem conteúdo próprio robusto).
Excluídas: as cascas de navegação finas (~650-700 chars, redundantes com o filho
versionado) e **todas** as páginas "Histórico da página" (ruído de page history).

Títulos no config são limpos (sem prefixo `v1.0 -`); páginas de versionamento
recebem prefixo `Versionamento - ` para agruparem no filtro `page` e darem contexto
no resultado de busca.

| Título no config | pageId |
|---|---|
| Visão Geral | 240648227 |
| Introdução | 240648385 |
| Guia do Usuário | 240648471 |
| Perfil de Segurança | 240648789 |
| DCR - Dynamic Client Registration | 240649257 |
| FAPI - Financial-grade API Security Profile | 1799421990 |
| CIBA - Client Initiated Backchannel Authentication | 1799946241 |
| Requisitos de criptografia ID_TOKEN | 240649215 |
| Padrão de Certificados | 240649813 |
| Diretrizes para validação de certificados digitais | 1799946375 |
| Assinaturas | 240650189 |
| Casos de Erro | 240650255 |
| Redirecionamento App-to-App | 240650317 |
| Glossário de Segurança | 240650381 |
| Versionamento - Tipos | 240650571 |
| Versionamento - Ciclo de Vida | 240650601 |
| Versionamento - Fluxo de especificação | 240650643 |
| Versionamento - Change log | 240650712 |

## Extração

- `confluenceBaseUrl: "https://openfinancebrasil.atlassian.net"`
- `interRequestDelayMs: 2000` (18 páginas ≈ 36s; cache 24h + `onProgress` amortizam)
- `retryDelaysMs: [2000, 4000, 8000, 16000]`

Iguais aos demais domínios Confluence.

## Testes

- Fixture `test/fixtures/seguranca-page.html` (HTML representativo com headings/seções).
- Entrada no mapa `fixtureData` de `test/contract.test.ts`, espelhando o padrão de
  `jornada-otimizada` (`buildPcmRulesItems` sobre `parseSections`).
- O `describe.each` sobre o registry valida o contrato automaticamente: metadados
  válidos, ids únicos de `search`, todo id resolvível por `getItem`, resultado vazio
  para query sem match.

Nenhum teste toca a rede.

## Docs

Adicionar linha na tabela de domínios do `README.md`, seguindo o padrão dos commits
recentes (`docs: <domínio> na tabela de domínios do README`).

## Fora de escopo (YAGNI)

- Filtros novos além dos três herdados.
- Extração recursiva automática da árvore Confluence (lista de páginas é curada e fixa).
- Inclusão das cascas de navegação de topo e páginas de histórico.
