import { parse } from "yaml";
import type { Item } from "../../core/types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

interface OpenApiSpec {
  paths?: Record<string, Record<string, unknown>>;
  components?: { schemas?: Record<string, Record<string, unknown>> };
}

export function parseOpenApiSpec(yamlText: string, specName: string): Item[] {
  const spec = parse(yamlText) as OpenApiSpec;
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
        detail: op,
      });
    }
  }

  for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
    items.push({
      id: `${specName}:schema:${name}`,
      type: "schema",
      name,
      description: schema.description ?? null,
      required: schema.required ?? [],
      detail: schema,
    });
  }

  return items;
}
