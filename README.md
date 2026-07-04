# opf-br-mcp

MCP server local que dá a agentes de codificação (Claude Code, GitHub Copilot)
acesso token-eficiente às regras do Open Finance Brasil.

## Domínios disponíveis

| Domínio | Fonte | Conteúdo |
|---|---|---|
| `pcm-additional-info` | Confluence público OFB | Regras de obrigatoriedade do `additionalInfo` (PCM) |
| `payments-openapi` | GitHub OpenBanking-Brasil/openapi | Spec OpenAPI 4.0.0 da API de Pagamentos |

## Tools

- `list_domains()` — descoberta: domínios, filtros e estado do cache
- `search(domain, query?, filters?, limit?)` — busca filtrada, retorno compacto
- `get_item(domain, id)` — registro completo
- `refresh(domain?)` — força re-extração das fontes

Fluxo recomendado para o agente: `list_domains` → `search` → `get_item`.

Dados: extraídos das fontes públicas na primeira consulta (lazy), cache em
`~/.cache/opf-br-mcp/` com TTL de 24h. Sem rede, serve cache expirado com aviso.

## Fase 1 — uso local (repo privado, sem npm)

```bash
git clone <este-repo> && cd opf-br-mcp
npm install && npm run build
```

Claude Code — `.mcp.json` na raiz do projeto consumidor:

```json
{ "mcpServers": { "opf-br": { "command": "node", "args": ["/caminho/para/opf-br-mcp/dist/index.js"] } } }
```

GitHub Copilot (VS Code) — `.vscode/mcp.json`:

```json
{ "servers": { "opf-br": { "command": "node", "args": ["/caminho/para/opf-br-mcp/dist/index.js"] } } }
```

## Fase 2 — npm público (após validação)

1. Remover `"private": true` do `package.json`.
2. `npm publish --access public`.
3. Trocar a config dos clients para `"command": "npx", "args": ["-y", "opf-br-mcp"]`.

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
