import type { FilterSpec } from "./types.js";

/**
 * Filtros idênticos compartilhados por famílias inteiras de domínios.
 *
 * Os domínios continuam declarando `filters` completo (é o que `search` valida);
 * estes conjuntos existem para o `list_domains` não repetir o mesmo texto 8 e 11
 * vezes no payload. Cada domínio referencia o conjunto por `filterSet` e só lista
 * inline os filtros que variam — em `*-openapi`, apenas `path`, cujo exemplo é
 * específico da API.
 */
export const FILTER_SETS: Record<string, FilterSpec[]> = {
  openapi: [
    { name: "method", description: "Verbo HTTP exato (ex.: POST)" },
    { name: "schema", description: "Substring no nome do schema (case-insensitive)" },
    {
      name: "response",
      description:
        "Substring no nome do components.responses, a chave usada no $ref (ex.: 202Webhook)",
    },
    {
      name: "parameter",
      description:
        "Substring no nome do components.parameters, a chave usada no $ref (ex.: xFapiInteractionId)",
    },
    {
      name: "header",
      description: "Substring no nome do components.headers, a chave usada no $ref (ex.: X-V)",
    },
  ],
  sections: [
    { name: "page", description: "Substring no título da página Confluence" },
    { name: "heading", description: "Substring no título da seção (heading)" },
    { name: "contains", description: "Substring no conteúdo da seção" },
  ],
};
