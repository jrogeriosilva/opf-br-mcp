# Design: domínio `consents-v3-openapi`

Data: 2026-07-04

## Objetivo

Expor a spec OpenAPI oficial da **API de Consentimentos** (Dados Cadastrais e
Transacionais) do Open Finance Brasil, versão **3.3.1**, através dos 4 tools
genéricos do servidor (`list_domains`, `search`, `get_item`, `refresh`),
seguindo exatamente o padrão dos domínios OpenAPI já existentes
(`payments-v5-openapi`, `enrollments-v2-openapi`, `automatic-payments-v2-openapi`).

Nenhum tool novo é adicionado — apenas um novo domínio registrado.

## Fonte

- URL: `https://openbanking-brasil.github.io/openapi/swagger-apis/consents/3.3.1.yml`
  (GitHub Pages oficial de publicação — decisão explícita do usuário; difere do
  `all-services-repo` usado pelos demais domínios).
- `openapi: 3.0.0`, ~98 KB.

## Conteúdo real da spec (verificado)

**5 operações** (todas com tag `Consents`):

| Método + path                          | Resumo                                    |
|----------------------------------------|-------------------------------------------|
| `POST /consents`                       | Criar novo pedido de consentimento        |
| `GET /consents/{consentId}`            | Obter detalhes do consentimento           |
| `DELETE /consents/{consentId}`         | Deletar / revogar o consentimento         |
| `GET /consents/{consentId}/extensions` | Histórico de extensões (renovações)       |
| `POST /consents/{consentId}/extends`   | Renovar consentimento                     |

**24 schemas** em `components.schemas`, entre eles: `CreateConsent`,
`CreateConsentExtensions`, `ResponseConsent`, `ResponseConsentRead`,
`ResponseConsentExtensions`, `LoggedUser`, `LoggedUserDocument`,
`BusinessEntity`, `BusinessEntityDocument`, `Links`, `Meta`, `ResponseError`,
`422ResponseErrorCreateConsent`, etc.

O parser genérico (`parseOpenApiSpec`) já lida com esse formato sem alterações:
gera itens `type=operation` (um por método+path) e `type=schema`.

## Arquivos

Espelhando `src/domains/payments-v5-openapi/`:

- `src/domains/consents-v3-openapi/config.ts`
  ```ts
  export const consentsV3Config = {
    specName: "consents",
    specVersion: "3.3.1",
    url: "https://openbanking-brasil.github.io/openapi/swagger-apis/consents/3.3.1.yml",
    retryDelaysMs: [2000, 4000, 8000, 16000],
  };
  ```
- `src/domains/consents-v3-openapi/parser.ts` — cópia idêntica do
  `parseOpenApiSpec` genérico (mesma convenção dos demais domínios).
- `src/domains/consents-v3-openapi/index.ts` — `Domain` com:
  - `id: "consents-v3-openapi"`
  - `title: "API de Consentimentos — spec OpenAPI 3.3.1"`
  - `description` precisa (lista os 5 endpoints reais e cita schemas reais)
  - `filters`: `path`, `method`, `schema` (idêntico ao padrão)
  - `search` devolve resumos (remove o nó `detail`); `getItem` devolve o nó completo
- `src/domains/consents-v3-openapi/index.test.ts` e `parser.test.ts` —
  espelhando os testes dos domínios existentes, adaptados ao conteúdo do consents.

## Wiring

- Registrar `consentsV3Domain` em `src/core/registry.ts`.
- Adicionar fixture `test/fixtures/consents-v3-spec.yml` (a spec baixada) e a
  entrada correspondente no `fixtureData` de `test/contract.test.ts`:
  `"consents-v3-openapi": () => ({ items: parseOpenApiSpec(consentsV3Yaml, "consents") })`.
- Atualizar a tabela de domínios no `README.md`.

## Decisões

- **id `consents-v3-openapi`** — segue a convenção de codificar o major (v3) no
  id; uma futura v4 vira um domínio novo, mantendo ids antigos estáveis.
- **Parser duplicado (não extraído para o core)** — mantém a convenção
  documentada no CLAUDE.md (cada domínio dono do seu `parser.ts`). Já existem
  cópias idênticas nos 4 domínios OpenAPI; extrair para `core/` seria um
  refactor separado, fora do escopo deste trabalho (YAGNI/consistência).

## Testes

O suite de conformidade (`describe.each` sobre o registry em
`test/contract.test.ts`) valida automaticamente o contrato assim que a fixture é
registrada: metadados válidos, ids únicos vindos de `search`, todo id resolvível
por `getItem`, e resultado vazio para query sem correspondência. Sem rede — tudo
contra a fixture local.
