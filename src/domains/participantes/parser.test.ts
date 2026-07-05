import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseParticipants } from "./parser.js";

const json = readFileSync(
  new URL("../../../test/fixtures/participants.json", import.meta.url),
  "utf8"
);

describe("parseParticipants", () => {
  it("um item por organização, com id estável (OrganisationId)", () => {
    const items = parseParticipants(json);
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("b43131be-6a7f-5bfb-b436-c3ac5c5c2dac");
    expect(items[0].name).toBe("EFI S.A. - INSTITUICAO DE PAGAMENTO");
    expect(items[0].cnpj).toBe("09089356000118");
    expect(items[0].status).toBe("Active");
  });

  it("agrega famílias de API únicas e ordenadas de todos os servers", () => {
    const [efi] = parseParticipants(json);
    expect(efi.servers).toBe(2);
    expect(efi.serverNames).toEqual(["Efí S.A.", "Efí Empresas"]);
    expect(efi.apiFamilies).toEqual([
      "automatic-payments 2.0.0",
      "payments 4.0.0",
      "payments-consents 5.0.0",
    ]);
  });

  it("organização sem servers vira item com listas vazias", () => {
    const [, semServers] = parseParticipants(json);
    expect(semServers.servers).toBe(0);
    expect(semServers.apiFamilies).toEqual([]);
  });

  it("retém a organização completa em detail", () => {
    const [efi] = parseParticipants(json);
    expect((efi.detail as { OrganisationName: string }).OrganisationName).toBe(
      "EFI S.A. - INSTITUICAO DE PAGAMENTO"
    );
  });
});
