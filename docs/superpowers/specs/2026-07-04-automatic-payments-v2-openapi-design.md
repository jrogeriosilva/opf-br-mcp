# Design — domínio `automatic-payments-v2-openapi`

Data: 2026-07-04

## Objetivo

Adicionar ao `opf-br-mcp` um novo domínio que expõe a spec OpenAPI oficial da
**API Automatic Payments** do Open Finance Brasil (Pix Automático e
Transferências Inteligentes), versão maior 2 (spec `2.2.0`), dando aos agentes
acesso token-eficiente aos endpoints e schemas dessa API.

Fonte:
`https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_automatic_payments_-_open_finance_brasil/2.2.0.yaml`

## Contexto

O servidor expõe apenas 4 tools genéricas; conhecimento novo entra como
**domínio**, nunca como tool nova. O domínio `enrollments-v2-openapi` (também um
spec `2.2.0` do mesmo repositório GitHub) é o template estrutural exato: mesma
mecânica de fetch YAML + parser OpenAPI genérico + `search`/`getItem`.

A API Automatic Payments tem 8 operações:

- `POST /recurring-consents` — cria consentimento recorrente
- `GET /recurring-consents/{recurringConsentId}` — consulta consentimento
- `PATCH /recurring-consents/{recurringConsentId}` — rejeita/revoga/edita consentimento
- `POST /pix/recurring-payments` — cria transação de pagamento
- `GET /pix/recurring-payments` — busca pagamentos de um consentimento
- `POST /pix/recurring-payments/{recurringPaymentId}` — nova tentativa (retry)
- `GET /pix/recurring-payments/{recurringPaymentId}` — consulta pagamento
- `PATCH /pix/recurring-payments/{recurringPaymentId}` — cancelamento

Scope OAuth: `recurring-payments`. Sem `permissions`.

## Arquitetura

Clone estrutural de `enrollments-v2-openapi`. Nova pasta
`src/domains/automatic-payments-v2-openapi/`:

- **`config.ts`** — `specName: "automatic-payments"`, `specVersion: "2.2.0"`,
  `url` da fonte, `retryDelaysMs: [2000, 4000, 8000, 16000]`.
- **`parser.ts`** — cópia do parser OpenAPI genérico já usado pelos demais
  domínios: itens `type=operation` (um por método+path, id
  `automatic-payments:MÉTODO /path`) e `type=schema`
  (id `automatic-payments:schema:Nome`). `search` devolve resumos (remove
  `detail`); `getItem` devolve o nó completo.
- **`index.ts`** — objeto `Domain` com:
  - `id: "automatic-payments-v2-openapi"`
  - título/descrição em português (Pix Automático + Transferências
    Inteligentes, consentimentos recorrentes, endpoints listados acima)
  - `filters`: `path` (substring), `method` (verbo HTTP exato), `schema`
    (substring no nome, case-insensitive)
  - `search`/`getItem` idênticos ao template.

Convenção mantida: cada domínio OpenAPI conserva sua própria cópia de
`parser.ts` (não haverá refatoração para um parser compartilhado — fora de
escopo).

## Wiring

Registrar `automaticPaymentsV2Domain` na lista de `src/core/registry.ts`.

## Testes

- Fixture `test/fixtures/automatic-payments-v2-spec.yml`: subconjunto real do
  spec (ao menos um endpoint e alguns schemas) suficiente para a suíte de
  conformidade. Sem rede.
- Entrada no mapa `fixtureData` de `test/contract.test.ts` reusando
  `parseOpenApiSpec(..., "automatic-payments")`.
- A suíte `describe.each` sobre o registry valida automaticamente: metadados
  válidos, fixture registrada, ids únicos, todo id de `search` resolvível por
  `getItem`, query sem match devolve vazio.

## Documentação e versão

- Adicionar linha na tabela de domínios do `README.md`.
- Bump de versão `0.1.0` → `0.2.0` em `package.json` e `src/core/version.ts`
  (mantidos em sync, conforme CLAUDE.md).

## Fora de escopo

- Refatoração do parser OpenAPI duplicado.
- Qualquer tool nova ou mudança no core além do registry.
