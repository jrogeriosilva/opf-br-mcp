# opf-br-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/opf-br-mcp.svg)](https://www.npmjs.com/package/opf-br-mcp)

MCP server local que dá a agentes de codificação (Claude Code, GitHub Copilot)
acesso token-eficiente às regras do Open Finance Brasil.

## Domínios disponíveis

| Domínio | Fonte | Conteúdo |
|---|---|---|
| `pcm-additional-info` | Confluence público OFB | Regras de obrigatoriedade do `additionalInfo` (PCM) |
| `payments-v4-openapi` | GitHub OpenBanking-Brasil/openapi | Spec OpenAPI 4.0.0 da API de Pagamentos |
| `payments-v5-openapi` | GitHub OpenBanking-Brasil/all-services-repo | Spec OpenAPI 5.0.0 da API de Iniciação de Pagamentos (consentimentos + Pix) |
| `enrollments-v2-openapi` | GitHub OpenBanking-Brasil/all-services-repo | Spec OpenAPI 2.2.0 da API de Vínculo de Dispositivo (Enrollments, FIDO, Pix Automático) |
| `automatic-payments-v2-openapi` | GitHub OpenBanking-Brasil/all-services-repo | Spec OpenAPI 2.2.0 da API de Pagamentos Automáticos (Pix Automático e Transferências Inteligentes) |
| `consents-v3-openapi` | GitHub Pages openbanking-brasil.github.io | Spec OpenAPI 3.3.1 da API de Consentimentos (Dados Cadastrais e Transacionais) |
| `pcm-openapi` | GitHub OpenBanking-Brasil/pcm-specs | Spec OpenAPI da PCM (reportes, hybrid-flow, opendata, consents/stock, credit-portabilities, payments/status) |
| `pcm-business-rules` | Confluence público OFB | Regras de negócio da PCM (Reporte, Processamento, Divergências, Especificação Técnica, Manual de Integração) — item por seção |
| `jornada-otimizada` | Confluence público OFB | Regras da Jornada Otimizada (Orientações Gerais, Transferências Inteligentes, Jornada sem Redirecionamento) — item por seção |
| `mqd` | Confluence público OFB | Motor de Qualidade de Dados (Especificação Técnica, Arquitetura, Documentação da API, Manual de Instalação, Endpoints Validados, FAQ, Troubleshooting) — item por seção |
| `webhook-v1-openapi` | GitHub OpenBanking-Brasil/all-services-repo | Spec OpenAPI 1.3.0 da API de Webhook (notificações de mudança de estado: pagamentos, enrollments, pagamentos automáticos) |
| `seguranca` | Confluence público OFB | Segurança do Open Finance Brasil (Perfil de Segurança, FAPI, DCR, CIBA, Padrão de Certificados, Assinaturas, Casos de Erro, Redirecionamento App-to-App, Glossário, Versionamento) — item por seção |
| `participantes` | Diretório OFB (data.directory.openbankingbrasil.org.br) | Organizações participantes, marcas (authorisation servers) e famílias de API suportadas com versões — um item por organização |
| `portal` | Confluence público OFB (busca ao vivo) | Busca CQL em todo o Portal do Desenvolvedor (espaço OF) — sem cache, `query` obrigatória; fallback quando os domínios específicos não cobrem o assunto |

## Tools

- `list_domains()` — descoberta: domínios, filtros e estado do cache
- `search(domain, query?, filters?, limit?, offset?)` — busca filtrada, retorno compacto
- `get_item(domain, id)` — registro completo
- `refresh(domain?)` — força re-extração das fontes

Fluxo recomendado para o agente: `list_domains` → `search` → `get_item`.

Domínios marcados como `live` (ex.: `portal`) consultam a fonte a cada chamada:
não têm cache nem `refresh`, e `search` exige `query`. Quando um `search` em
domínio comum retorna 0 resultados, a resposta inclui um `hint` sugerindo o
`portal`.

## Progressive disclosure (por que economiza contexto)

O problema que este servidor resolve: uma spec Swagger/OpenAPI inteira não cabe
bem na janela de contexto de um agente, e despejá-la desperdiça tokens. A solução
é **revelação progressiva** — o agente nunca recebe a spec completa de uma vez,
apenas o mínimo necessário em cada etapa do funil:

1. **`list_domains`** — catálogo barato: quais domínios e filtros existem.
2. **`search`** — índice **pesquisável e resumido**. Cada resultado traz só
   `id`, `path`, `method`, `summary`/`name` e `required`; o nó pesado da spec
   (`detail`) é removido do resumo, e o retorno ainda é compactado (omite `null`
   e arrays vazios).
3. **`get_item`** — só aqui o nó integral da spec é entregue, e apenas para o
   `id` que o agente escolheu.

Como o Swagger/OpenAPI vira dados pesquisáveis: o parser "achata" a spec em itens
com `id` estável — um por endpoint (`type: operation`, ex.
`payments-v4:POST /pix/payments`) e um por schema (`type: schema`, ex.
`payments-v4:schema:PixPayment`). O JSON completo de cada nó fica retido em
`detail` até um `get_item` explícito. Os `id`s não são adivinháveis: sempre vêm
de um `search`. Assim o agente localiza o endpoint/schema certo pagando poucos
tokens e só "paga" o payload integral quando pede um item nomeado.

Dados: extraídos das fontes públicas na primeira consulta (lazy), cache em
`~/.cache/opf-br-mcp/` com TTL de 72h. Sem rede, serve cache expirado com aviso.

## Instalação

Requer Node >= 20. O servidor roda via `npx`, sem clone nem build.

Claude Code — `.mcp.json` na raiz do projeto consumidor:

```json
{ "mcpServers": { "opf-br": { "command": "npx", "args": ["-y", "opf-br-mcp"] } } }
```

GitHub Copilot (VS Code) — `.vscode/mcp.json`:

```json
{ "servers": { "opf-br": { "command": "npx", "args": ["-y", "opf-br-mcp"] } } }
```

Claude Desktop — `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{ "mcpServers": { "opf-br": { "command": "npx", "args": ["-y", "opf-br-mcp"] } } }
```

### Windows

No Windows, o client não consegue executar `npx` diretamente (é o shim
`npx.cmd`) e acaba abrindo um `cmd.exe` interativo, cujo banner
(`Microsoft Windows [Version ...]`) vaza para o canal stdio e corrompe o
protocolo JSON-RPC — o servidor falha na conexão com erros de JSON inválido.
Envolva o comando em `cmd /c` para rodá-lo sem shell interativo:

```json
{ "mcpServers": { "opf-br": { "command": "cmd", "args": ["/c", "npx", "-y", "opf-br-mcp"] } } }
```

Vale para qualquer client no Windows (Claude Desktop, Claude Code, VS Code) —
ajuste apenas a chave externa (`mcpServers` ou `servers`).

### Uso local (a partir do fonte)

```bash
git clone https://github.com/jrogeriosilva/opf-br-mcp.git && cd opf-br-mcp
npm install && npm run build
```

E aponte o client para o build local:

```json
{ "mcpServers": { "opf-br": { "command": "node", "args": ["/caminho/para/opf-br-mcp/dist/index.js"] } } }
```

## Adicionando um domínio novo

1. Criar `src/domains/<id>/index.ts` exportando um objeto `Domain`
   (`src/core/types.ts`): `extract()` busca e estrutura os dados;
   `search`/`getItem` consultam; `filters` documenta os filtros.
2. Registrar em `src/core/registry.ts`.
3. Adicionar fixture e builder em `test/contract.test.ts` — a suíte de
   conformidade valida o contrato automaticamente.

## Desenvolvimento

```bash
npm test           # vitest (fixtures locais, sem rede)
npm run typecheck  # tsc --noEmit
npm run build      # tsup → dist/
```
