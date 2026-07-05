/** NFD sem diacríticos, lowercase — busca acento-insensível em conteúdo pt-BR. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Todos os termos da query (separados por whitespace) devem ocorrer no haystack (AND). */
export function matchesQuery(haystack: string, query: string): boolean {
  const h = normalize(haystack);
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => h.includes(normalize(term)));
}
