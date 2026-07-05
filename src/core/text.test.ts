import { describe, expect, it } from "vitest";
import { matchesQuery, normalize } from "./text.js";

describe("normalize", () => {
  it("remove acentos e baixa a caixa", () => {
    expect(normalize("Vínculo de Segurança")).toBe("vinculo de seguranca");
  });
});

describe("matchesQuery", () => {
  it("ignora acentos dos dois lados", () => {
    expect(matchesQuery("Regras do vínculo de dispositivo", "VINCULO")).toBe(true);
  });

  it("combina termos com AND", () => {
    expect(matchesQuery("Regras do vínculo de dispositivo", "vinculo dispositivo")).toBe(true);
    expect(matchesQuery("Regras do vínculo de dispositivo", "vinculo carro")).toBe(false);
  });

  it("query vazia ou só espaços casa tudo", () => {
    expect(matchesQuery("qualquer coisa", "")).toBe(true);
    expect(matchesQuery("qualquer coisa", "   ")).toBe(true);
  });
});
