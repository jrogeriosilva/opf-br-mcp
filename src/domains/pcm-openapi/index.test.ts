import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DomainData } from "../../core/types.js";
import { pcmOpenapiDomain } from "./index.js";
import { parseOpenApiSpec } from "./parser.js";

const yamlText = readFileSync(
  new URL("../../../test/fixtures/pcm-openapi-spec.yml", import.meta.url),
  "utf8"
);

function fixtureData(): DomainData {
  return { items: parseOpenApiSpec(yamlText, "pcm") };
}

describe("pcmOpenapiDomain", () => {
  it("tem id pcm-openapi", () => {
    expect(pcmOpenapiDomain.id).toBe("pcm-openapi");
  });

  it("search devolve resumos sem detail, mas com id", () => {
    const results = pcmOpenapiDomain.search(fixtureData(), undefined, { method: "POST" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("pcm:POST /report-api/v1/private/report/");
    expect(results[0]).not.toHaveProperty("detail");
  });

  it("filtro path e schema funcionam", () => {
    expect(
      pcmOpenapiDomain.search(fixtureData(), undefined, { path: "{fapiInteractonId}" })
    ).toHaveLength(1);
    const schemas = pcmOpenapiDomain.search(fixtureData(), undefined, { schema: "reportmodel" });
    expect(schemas.map((s) => s.name)).toContain("ReportModel");
  });

  it("getItem devolve o item completo com detail", () => {
    const item = pcmOpenapiDomain.getItem(fixtureData(), "pcm:schema:ReportModel");
    expect(item).not.toBeNull();
    expect(item!.detail).toHaveProperty("properties");
  });
});
