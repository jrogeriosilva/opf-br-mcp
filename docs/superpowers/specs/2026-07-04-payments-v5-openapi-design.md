# Design: domínio `payments-v5-openapi`

Data: 2026-07-04

## Objetivo

Adicionar o domínio `payments-v5-openapi` ao `opf-br-mcp`, expondo a spec
OpenAPI v5 da API de Iniciação de Pagamentos do Open Finance Brasil aos agentes.
O domínio `payments-v4-openapi` permanece registrado e inalterado — ids antigos
ficam estáveis para clientes fixados na versão (convenção do CLAUDE.md).

## Fonte

```
https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_payment_initiation_-_open_finance_brasil/5.0.0.yaml
```

Confirmado: HTTP 200, `openapi: 3.0.0`, `info.version: 5.0.0`. O parser OpenAPI
genérico existente (`parseOpenApiSpec`) processa a spec sem alteração, produzindo:

- **7 operations** — `POST /consents`, `GET /consents/{consentId}`,
  `GET /consents/{consentId}/pix/payments`, `PATCH /consents/{consentId}/pix/payments`,
  `POST /pix/payments`, `GET /pix/payments/{paymentId}`, `PATCH /pix/payments/{paymentId}`.
- **63 schemas** em `components.schemas`.

Diferença de conteúdo em relação ao v4: o v5 inclui os endpoints de
**consentimento** (`/consents...`) além dos de pagamento.

## Arquitetura

Clone do `payments-v4-openapi`. Parser e `index.ts` já são genéricos para
qualquer OpenAPI 3.0; o domínio novo só muda `id`, `title`, `specVersion` e `url`.

### Arquivos novos (`src/domains/payments-v5-openapi/`)

- `config.ts` — `specName: "payments"`, `specVersion: "5.0.0"`,
  `url` = a raw URL acima, `retryDelaysMs: [2000, 4000, 8000, 16000]` (igual v4).
- `parser.ts` — cópia idêntica do parser do v4 (decisão: manter cada domínio
  autocontido, conforme convenção de parser-por-domínio do CLAUDE.md; sem tocar
  no v4 que já passa). Extração para módulo compartilhado fica para quando
  surgir um v6 (regra de três).
- `index.ts` — igual ao v4, com `id: "payments-v5-openapi"` e `title` refletindo
  a versão 5.0.0. Mesmos 3 filtros: `path`, `method`, `schema`. Mesma semântica
  de `search` (resumos sem `detail`) e `getItem` (nó completo).
- `parser.test.ts` e `index.test.ts` — espelham os testes do v4, apontando para
  a fixture v5.

### Wiring

- `src/core/registry.ts` — importar `paymentsV5Domain` e adicioná-lo ao array
  `domains` (v4 e v5 coexistem).

### Testes / fixture

- `test/fixtures/payments-v5-spec.yml` — fixture pequena, escrita à mão no mesmo
  espírito da `payments-spec.yml` do v4 (não a spec inteira). Deve conter ao
  menos um endpoint de consentimento e um de pagamento, além de 1–2 schemas,
  para exercitar os filtros e a busca.
- `test/contract.test.ts` — registrar entrada no map `fixtureData` para
  `"payments-v5-openapi"`, lendo a fixture e chamando `parseOpenApiSpec`.

A suíte de conformidade (`describe.each` sobre o registry) então valida
automaticamente o contrato do novo domínio.

## Restrições

- Testes nunca tocam a rede — só fixtures locais.
- ESM `NodeNext`: imports relativos com extensão `.js` explícita.
- Commits em português, prefixos conventional-commit.

## Fora de escopo

- Refatorar/extrair o parser compartilhado (opção B descartada).
- Remover ou alterar o domínio v4.
- Atualizar `PACKAGE_VERSION` / versão do pacote (mudança de conteúdo, não de release — a decidir separadamente).

## Critérios de sucesso

- `npm test` verde, incluindo a conformidade automática do novo domínio.
- `npm run typecheck` limpo.
- `list_domains` passa a listar `payments-v5-openapi`; `search`/`get_item`
  funcionam contra a spec v5.
