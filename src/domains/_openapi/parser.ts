import { parse } from "yaml";
import type { Item } from "../../core/types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

/** Seções de `components` indexadas como itens; o valor vira o `type` e o prefixo do id. */
const COMPONENT_KINDS = {
  schemas: "schema",
  responses: "response",
  parameters: "parameter",
  headers: "header",
} as const;

type ComponentSection = keyof typeof COMPONENT_KINDS;

const REF_PATTERN = /^#\/components\/(schemas|responses|parameters|headers)\/(.+)$/;

interface OpenApiSpec {
  paths?: Record<string, Record<string, unknown>>;
  components?: Partial<Record<ComponentSection, Record<string, Record<string, unknown>>>>;
}

/** Ids dos componentes referenciados por `$ref` em qualquer profundidade do nó. */
function collectRefs(node: unknown, specName: string, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const child of node) collectRefs(child, specName, out);
    return;
  }
  if (node === null || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "$ref" && typeof value === "string") {
      const match = REF_PATTERN.exec(value);
      if (match) out.add(`${specName}:${COMPONENT_KINDS[match[1] as ComponentSection]}:${match[2]}`);
      continue;
    }
    collectRefs(value, specName, out);
  }
}

function refsOf(node: unknown, specName: string): string[] {
  const out = new Set<string>();
  collectRefs(node, specName, out);
  return [...out];
}

export function parseOpenApiSpec(yamlText: string, specName: string): Item[] {
  const parsed: unknown = parse(yamlText);
  // Uma resposta 200 que não é a spec — página de erro, redirect para login, YAML
  // de outra coisa — atravessava daqui como 0 itens e ia parar no cache por 72h,
  // sem erro nenhum. Falhando aqui, o getDomainData cai no cache anterior (stale)
  // ou propaga o erro, que é o comportamento certo para fonte quebrada.
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    (!("paths" in parsed) && !("components" in parsed))
  ) {
    throw new Error(
      `resposta de ${specName} não é uma spec OpenAPI (sem "paths" nem "components"); ` +
        `início do conteúdo: ${JSON.stringify(yamlText.slice(0, 80))}`
    );
  }
  const spec = parsed as OpenApiSpec;
  const items: Item[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op) continue;
      items.push({
        id: `${specName}:${method.toUpperCase()} ${path}`,
        type: "operation",
        path,
        method: method.toUpperCase(),
        summary: op.summary ?? null,
        description: op.description ?? null,
        tags: op.tags ?? [],
        refs: refsOf(op, specName),
        detail: op,
      });
    }
  }

  for (const [section, kind] of Object.entries(COMPONENT_KINDS) as [ComponentSection, string][]) {
    for (const [name, node] of Object.entries(spec.components?.[section] ?? {})) {
      items.push({
        id: `${specName}:${kind}:${name}`,
        type: kind,
        name,
        description: node.description ?? null,
        ...(kind === "schema" ? { required: node.required ?? [] } : {}),
        ...(kind === "header" ? { required: node.required ?? null } : {}),
        // Em parameters a chave do componente (usada no $ref) difere do nome real
        // do header/query; `paramName` e `in` preservam o nome usado na requisição.
        ...(kind === "parameter"
          ? { paramName: node.name ?? null, in: node.in ?? null, required: node.required ?? null }
          : {}),
        refs: refsOf(node, specName),
        detail: node,
      });
    }
  }

  // `refs` só aponta para ids que get_item resolve: descarta refs quebradas e auto-referência.
  const ids = new Set(items.map((i) => i.id));
  for (const item of items) {
    item.refs = (item.refs as string[]).filter((ref) => ref !== item.id && ids.has(ref));
  }

  return items;
}
