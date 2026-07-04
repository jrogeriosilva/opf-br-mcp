import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSections } from "./parser.js";

const html = readFileSync(
  new URL("../../../test/fixtures/pcm-business-rules-page.html", import.meta.url),
  "utf8"
);

describe("parseSections", () => {
  it("cria uma seção intro para o conteúdo antes do primeiro heading", () => {
    const [intro] = parseSections(html);
    expect(intro.heading).toBe("intro");
    expect(intro.level).toBe(0);
    expect(intro.content).toBe("Introdução geral antes de qualquer heading.");
  });

  it("extrai uma seção por heading com nível correto", () => {
    const sections = parseSections(html);
    const headings = sections.map((s) => `${s.level}:${s.heading}`);
    expect(headings).toEqual([
      "0:intro",
      "2:Reporte",
      "2:Processamento",
      "3:PAIRED",
      "2:Processamento",
    ]);
  });

  it("achata tabelas em texto legível dentro do content da seção", () => {
    const reporte = parseSections(html).find((s) => s.heading === "Reporte")!;
    expect(reporte.content).toContain("Um reporte representa uma chamada entre instituições.");
    expect(reporte.content).toContain("Campo | Descrição");
    expect(reporte.content).toContain("reportId | Identificador do reporte");
  });

  it("limita cada seção ao conteúdo até o próximo heading", () => {
    const paired = parseSections(html).find((s) => s.heading === "PAIRED")!;
    expect(paired.content).toBe("Reporte conciliado com sucesso.");
  });
});
