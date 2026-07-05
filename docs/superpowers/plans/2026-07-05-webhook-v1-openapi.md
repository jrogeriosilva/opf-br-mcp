# webhook-v1-openapi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o domínio `webhook-v1-openapi` que expõe a spec OpenAPI 1.3.0 da API de Webhook do Open Finance Brasil através dos 4 tools genéricos do servidor.

**Architecture:** Novo domínio criado pelo factory compartilhado `createOpenApiDomain` (`src/domains/_openapi/domain.ts`) — só `config.ts` + `index.ts`, sem parser/core novo. Registrado no `registry.ts` e validado automaticamente pela suíte de conformidade em `test/contract.test.ts` via fixture local.

**Tech Stack:** TypeScript strict, ESM (NodeNext, imports com `.js`), Node >= 20, vitest, lib `yaml`.

## Global Constraints

- ESM com `NodeNext`: imports relativos precisam de extensão `.js` explícita.
- Strings de usuário, docs e mensagens de commit em português.
- Testes nunca acessam a rede — parsers testados contra fixtures em `test/fixtures/`.
- Commits seguem conventional-commits (`feat:`, `test:`, `docs:`).
- Convenção de id: major version do spec no id (`webhook-v1-openapi` para spec 1.x).
- `search` devolve resumos (sem `detail`); `get_item` devolve o nó completo — comportamento já embutido no factory.

---

### Task 1: Criar e registrar o domínio `webhook-v1-openapi`

Cria os dois arquivos do domínio, registra no registry e adiciona a fixture + builder no contract test. O ciclo de teste é a suíte de conformidade (`describe.each` sobre o registry), que passa a cobrir o novo id assim que fixture e registro existem.

**Files:**
- Create: `src/domains/webhook-v1-openapi/config.ts`
- Create: `src/domains/webhook-v1-openapi/index.ts`
- Modify: `src/core/registry.ts`
- Create: `test/fixtures/webhook-v1-spec.yml`
- Modify: `test/contract.test.ts`

**Interfaces:**
- Consumes: `createOpenApiDomain(config: OpenApiDomainConfig): Domain` e o tipo `OpenApiDomainConfig` de `src/domains/_openapi/domain.js`; `parseOpenApiSpec(yamlText: string, specName: string): Item[]` de `src/domains/_openapi/parser.js`.
- Produces: `export const webhookDomain: Domain` (id `webhook-v1-openapi`), registrado em `domains`.

- [ ] **Step 1: Baixar a spec para a fixture local**

Run:
```bash
curl -sSL "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_webhook_-_open_finance_brasil/1.3.0.yaml" -o test/fixtures/webhook-v1-spec.yml
head -3 test/fixtures/webhook-v1-spec.yml
```
Expected: as 3 primeiras linhas mostram `openapi: 3.0.0`, `info:`, `  title: API Webhook - Open Finance Brasil`.

- [ ] **Step 2: Criar `config.ts`**

```ts
import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const webhookConfig: OpenApiDomainConfig = {
  id: "webhook-v1-openapi",
  title: "API de Webhook — spec OpenAPI 1.3.0",
  description:
    "Spec OpenAPI oficial da API de Webhook do Open Finance Brasil, que notifica " +
    "mudanças de estado das demais APIs. 5 operações POST (type=operation): " +
    "consentNotification e pixPaymentNotification (Pagamentos), enrollmentIdNotification " +
    "(Enrollments), recurringConsentIdNotification e recurringPaymentIdNotification " +
    "(Pagamentos Automáticos); e schemas type=schema (RequestBodyWebhook, " +
    "RequestBodyWebhookEvents, EventType, Timestamp, xWebhookInteractionId). " +
    "search devolve resumos; use get_item para o nó completo da spec.",
  pathExample: "/payments/{versionApi}/consents/{consentId}",
  specName: "webhook",
  specVersion: "1.3.0",
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_webhook_-_open_finance_brasil/1.3.0.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
```

- [ ] **Step 3: Criar `index.ts`**

```ts
import { createOpenApiDomain } from "../_openapi/domain.js";
import { webhookConfig } from "./config.js";

export const webhookDomain = createOpenApiDomain(webhookConfig);
```

- [ ] **Step 4: Registrar no `registry.ts`**

Adicionar o import junto aos demais (após a linha do `mqdDomain`):
```ts
import { webhookDomain } from "../domains/webhook-v1-openapi/index.js";
```
E adicionar `webhookDomain` como último item do array `domains`:
```ts
export const domains: Domain[] = [
  pcmDomain,
  paymentsDomain,
  paymentsV5Domain,
  enrollmentsV2Domain,
  automaticPaymentsV2Domain,
  consentsV3Domain,
  pcmOpenapiDomain,
  pcmBusinessRulesDomain,
  jornadaOtimizadaDomain,
  mqdDomain,
  webhookDomain,
];
```

- [ ] **Step 5: Rodar a suíte e verificar que FALHA por fixture ausente**

Run: `npx vitest run test/contract.test.ts`
Expected: FAIL no domínio `webhook-v1-openapi` com a mensagem `registre fixture para webhook-v1-openapi em test/contract.test.ts` (o registry tem o domínio, mas `fixtureData` ainda não).

- [ ] **Step 6: Adicionar a fixture ao `fixtureData` do contract test**

Em `test/contract.test.ts`, após a linha que lê `mqdHtml` (~linha 31), adicionar o carregamento:
```ts
const webhookYaml = readFileSync(new URL("./fixtures/webhook-v1-spec.yml", import.meta.url), "utf8");
```
E dentro do objeto `fixtureData`, após a entrada `"mqd"`, adicionar:
```ts
  "webhook-v1-openapi": () => ({ items: parseOpenApiSpec(webhookYaml, "webhook") }),
```
(`parseOpenApiSpec` já está importado no topo do arquivo — reutilizar, não reimportar.)

- [ ] **Step 7: Rodar a suíte completa e verificar que PASSA**

Run: `npm test`
Expected: PASS — inclusive os 4 casos de conformidade do `webhook-v1-openapi` (metadados válidos, ids únicos de `search`, todo id resolvível por `getItem`, query sem match devolve vazio).

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add src/domains/webhook-v1-openapi/ src/core/registry.ts test/fixtures/webhook-v1-spec.yml test/contract.test.ts
git commit -m "feat: domínio webhook-v1-openapi"
```

---

### Task 2: Documentar o domínio no README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: nada. Produces: nada (só documentação).

- [ ] **Step 1: Adicionar a linha na tabela de domínios**

No `README.md`, na tabela de domínios (`| Domínio | Fonte | Conteúdo |`), adicionar após a última linha de domínio (a do `mqd`):
```markdown
| `webhook-v1-openapi` | GitHub OpenBanking-Brasil/all-services-repo | Spec OpenAPI 1.3.0 da API de Webhook (notificações de mudança de estado: pagamentos, enrollments, pagamentos automáticos) |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: webhook-v1-openapi na tabela de domínios do README"
```

---

## Self-Review

**Spec coverage:** id `webhook-v1-openapi` (Task 1 Step 2/4) ✓; factory `_openapi` sem parser novo (Step 3) ✓; fonte `all-services-repo` registrada no config (Step 2) ✓; fixture integral + builder no contract test (Steps 1/6) ✓; conformidade automática (Step 7) ✓; README (Task 2) ✓. Sem lacunas.

**Placeholder scan:** nenhum TBD/TODO; todo código está completo e literal.

**Type consistency:** `webhookConfig: OpenApiDomainConfig` → `createOpenApiDomain` → `webhookDomain: Domain`; `specName` `"webhook"` idêntico em config e no builder do contract test; nomes de arquivo/fixture consistentes entre passos. ✓
