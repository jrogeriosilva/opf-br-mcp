# Design: domínio `webhook-v1-openapi`

Data: 2026-07-05

## Objetivo

Expor a spec OpenAPI da **API de Webhook** do Open Finance Brasil, versão
**1.3.0**, através dos 4 tools genéricos do servidor (`list_domains`, `search`,
`get_item`, `refresh`), seguindo exatamente o padrão dos domínios OpenAPI já
existentes (`payments-v4-openapi`, `consents-v3-openapi`, etc.).

Nenhum tool novo é adicionado — apenas um novo domínio registrado. Nenhuma
alteração em parser/core: a spec é OpenAPI padrão e encaixa direto no factory
`_openapi` (`createOpenApiDomain`).

## Fonte

- URL: `https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_webhook_-_open_finance_brasil/1.3.0.yaml`
  (raw do `all-services-repo` — difere das specs de payments/consents publicadas
  em `openapi/main` ou GitHub Pages; vale registrar isso no `config.ts`).
- `openapi: 3.0.0`, 307 linhas. Estrutura padrão `paths` + `components`.

## Conteúdo real da spec (verificado)

**5 operações** (todas `POST`), notificações de mudança de estado:

| Método + path | operationId | Tag |
|---|---|---|
| `POST /payments/{versionApi}/consents/{consentId}` | `consentNotification` | Payments - Consents and Pix Payments |
| `POST /payments/{versionApi}/pix/payments/{paymentId}` | `pixPaymentNotification` | Payments - Consents and Pix Payments |
| `POST /enrollments/{versionApi}/enrollments/{enrollmentId}` | `enrollmentIdNotification` | No redirect - Enrollment Id Notification |
| `POST /automatic-payments/{versionApi}/recurring-consents/{recurringConsentId}` | `recurringConsentIdNotification` | Automatic Payments - Consents and Pix Payments |
| `POST /automatic-payments/{versionApi}/pix/recurring-payments/{recurringPaymentId}` | `recurringPaymentIdNotification` | Automatic Payments - Consents and Pix Payments |

**6 schemas** em `components.schemas`: `RequestBodyWebhookEvents`,
`RequestBodyWebhook`, `xWebhookInteractionId`, `xWebhookInteractionIdPayments`,
`Timestamp`, `EventType`.

Também há `components.parameters` e `components.responses`, que **não** são
extraídos como itens próprios (o factory só extrai `paths` e
`components.schemas`) — os `$ref` já aparecem inline no nó `detail` de cada
operação. Comportamento idêntico ao dos demais domínios OpenAPI.

O parser genérico (`parseOpenApiSpec`) lida com esse formato sem alterações:
gera itens `type=operation` (um por método+path) e `type=schema`.

## Arquivos

Espelhando `src/domains/payments-v4-openapi/` (que usa o factory):

- `src/domains/webhook-v1-openapi/config.ts` — `OpenApiDomainConfig`:
  ```ts
  export const webhookConfig: OpenApiDomainConfig = {
    id: "webhook-v1-openapi",
    title: "API de Webhook — spec OpenAPI 1.3.0",
    description: "...", // lista os 5 endpoints reais e cita schemas reais
    pathExample: "/payments/{versionApi}/consents/{consentId}",
    specName: "webhook",
    specVersion: "1.3.0",
    url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_webhook_-_open_finance_brasil/1.3.0.yaml",
    retryDelaysMs: [2000, 4000, 8000, 16000],
  };
  ```
- `src/domains/webhook-v1-openapi/index.ts`:
  ```ts
  import { createOpenApiDomain } from "../_openapi/domain.js";
  import { webhookConfig } from "./config.js";
  export const webhookDomain = createOpenApiDomain(webhookConfig);
  ```

## Wiring

- Registrar `webhookDomain` em `src/core/registry.ts` (import + entrada no array).
- Adicionar fixture `test/fixtures/webhook-v1-spec.yml` (cópia integral do spec —
  só 307 linhas) e a entrada no `fixtureData` de `test/contract.test.ts`:
  `"webhook-v1-openapi": () => ({ items: parseOpenApiSpec(webhookYaml, "webhook") })`.
- Atualizar a tabela de domínios no `README.md`, se existir.

## Decisões

- **id `webhook-v1-openapi`** — segue a convenção de codificar o major (v1) no
  id; alinhado ao path do servidor (`/webhook/v1`). Uma futura v2 vira um domínio
  novo, mantendo ids antigos estáveis.
- **Sem parser próprio** — usa o factory `_openapi` compartilhado, como o
  `payments-v4-openapi` atual (o doc do consents é anterior ao factory).

## Testes

O suite de conformidade (`describe.each` sobre o registry em
`test/contract.test.ts`) valida automaticamente o contrato assim que a fixture é
registrada: metadados válidos, ids únicos vindos de `search`, todo id resolvível
por `getItem`, e resultado vazio para query sem correspondência. Sem rede — tudo
contra a fixture local. Rodo `npm test` e `npm run typecheck`.
