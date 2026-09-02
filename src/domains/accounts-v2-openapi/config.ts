import type { OpenApiDomainConfig } from "../_openapi/domain.js";

export const accountsV2Config: OpenApiDomainConfig = {
  id: "accounts-v2-openapi",
  title: "API de Contas — spec OpenAPI 2.5.1",
  description:
    "Spec OpenAPI oficial da API de Contas (Accounts) do Open Finance Brasil, versão 2.5.1 — " +
    "compartilhamento de contas de depósito à vista, poupança e pagamento pré-paga. " +
    "Cobre listagem (GET /accounts), identificação (GET /accounts/{accountId}), saldos " +
    "(GET /accounts/{accountId}/balances), saldos reservados/caixinhas " +
    "(GET /accounts/{accountId}/reserved-balances, novo na 2.5.0), transações " +
    "(GET /accounts/{accountId}/transactions e /transactions-current) e limites de cheque especial " +
    "(GET /accounts/{accountId}/overdraft-limits). " +
    "É API de Dados Cadastrais e Transacionais: o consentimento que a habilita fica em consents-v3-openapi, " +
    "e a listagem de recursos compartilhados em resources-v3-openapi. " +
    "Itens type=operation (um por método+path), type=schema (payloads, ex.: AccountData, AccountBalancesData, " +
    "AccountReservedBalancesData, AccountTransactionsData) e os components alvos dos $ref: type=response, " +
    "type=parameter e type=header. " +
    "Regras de negócio da mesma API em accounts-v2-business-rules. " +
    "search devolve resumos; use get_item para o nó completo da spec — nas operações o campo " +
    "`refs` traz os ids dos components referenciados, prontos para get_item.",
  pathExample: "/accounts/{accountId}/transactions",
  specName: "accounts",
  specVersion: "2.5.1",
  // A partir da 2.5.0 as versões estáveis de Contas só saem no all-services-repo:
  // github.io/openapi/swagger-apis/accounts para na 2.4.2 estável.
  url: "https://raw.githubusercontent.com/OpenBanking-Brasil/all-services-repo/refs/heads/main/api_accounts_-_open_finance_brasil/2.5.1.yaml",
  retryDelaysMs: [2000, 4000, 8000, 16000],
};
