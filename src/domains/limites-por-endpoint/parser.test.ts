import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseEndpointLimits } from "./parser.js";

const html = readFileSync(
  new URL("../../../test/fixtures/limites-por-endpoint-page.html", import.meta.url),
  "utf8"
);

describe("parseEndpointLimits", () => {
  it("ignora a linha de legenda, a de cabeçalho e as tabelas sem coluna Endpoint", () => {
    const limits = parseEndpointLimits(html);
    expect(limits).toHaveLength(3);
    expect(limits.map((l) => l.path)).not.toContain("Endpoint");
    expect(limits.map((l) => l.api)).toEqual([
      "[DC] API Recursos",
      "[DC] API Contas",
      "[DC] API Contas",
    ]);
  });

  it("separa verbo e rota e lê as colunas de limite", () => {
    const [resources] = parseEndpointLimits(html);
    expect(resources.metodo).toBe("GET");
    expect(resources.path).toBe("/resources");
    expect(resources.frequencia).toBe("Alta");
    expect(resources.slaMs).toBe("1500");
    expect(resources.timeoutS).toBe("15");
    expect(resources.tpm).toBe("NA");
    expect(resources.tps).toBe("300");
    expect(resources.limiteOperacional).toBe("NA");
  });

  // O Confluence injeta zero-width space no meio das rotas em 57% das linhas da
  // página real. Sem removê-los, filtrar por "/accounts/{accountId}/balances"
  // não casaria com nada.
  it("remove zero-width space do meio da rota", () => {
    const balances = parseEndpointLimits(html).find((l) => l.path.includes("balances"))!;
    expect(balances.path).toBe("/accounts/{accountId}/balances");
    expect(balances.path).not.toMatch(/[​‌‍﻿]/);
    expect(balances.metodo).toBe("GET");
  });

  it("preserva como texto a célula de TPM com as faixas QCA", () => {
    const balances = parseEndpointLimits(html).find((l) => l.path.includes("balances"))!;
    expect(balances.tpm).toContain("QCA | TPM");
    expect(balances.tpm).toContain("2 500");
    expect(balances.tps).toBe("300");
    expect(balances.limiteOperacional).toBe("420");
  });
});
