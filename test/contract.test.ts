import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DomainData, ExtractedDomain, LiveDomain } from "../src/core/types.js";
import { domains } from "../src/core/registry.js";
import { buildItems } from "../src/domains/pcm-additional-info/index.js";
import { parseAdditionalInfoTables } from "../src/domains/pcm-additional-info/parser.js";
import { parseOpenApiSpec } from "../src/domains/_openapi/parser.js";
import { parseOpenApiSpec as parseConsentsV3 } from "../src/domains/_openapi/parser.js";
import { buildItems as buildPcmRulesItems } from "../src/domains/_confluence-sections/domain.js";
import { parseSections } from "../src/domains/_confluence-sections/parser.js";
import { parseParticipants } from "../src/domains/participantes/parser.js";

const pcmHtml = readFileSync(new URL("./fixtures/pcm-page.html", import.meta.url), "utf8");
const paymentsYaml = readFileSync(new URL("./fixtures/payments-spec.yml", import.meta.url), "utf8");
const paymentsV5Yaml = readFileSync(new URL("./fixtures/payments-v5-spec.yml", import.meta.url), "utf8");
const enrollmentsV2Yaml = readFileSync(new URL("./fixtures/enrollments-v2-spec.yml", import.meta.url), "utf8");
const automaticPaymentsV2Yaml = readFileSync(
  new URL("./fixtures/automatic-payments-v2-spec.yml", import.meta.url),
  "utf8",
);
const consentsV3Yaml = readFileSync(new URL("./fixtures/consents-v3-spec.yml", import.meta.url), "utf8");
const pcmOpenapiYaml = readFileSync(new URL("./fixtures/pcm-openapi-spec.yml", import.meta.url), "utf8");
const pcmBusinessRulesHtml = readFileSync(
  new URL("./fixtures/pcm-business-rules-page.html", import.meta.url),
  "utf8",
);
const jornadaOtimizadaHtml = readFileSync(
  new URL("./fixtures/jornada-otimizada-page.html", import.meta.url),
  "utf8"
);
const paymentsV5BusinessRulesHtml = readFileSync(
  new URL("./fixtures/payments-v5-business-rules-page.html", import.meta.url),
  "utf8"
);
const automaticPaymentsV2BusinessRulesHtml = readFileSync(
  new URL("./fixtures/automatic-payments-v2-business-rules-page.html", import.meta.url),
  "utf8"
);
const enrollmentsV2BusinessRulesHtml = readFileSync(
  new URL("./fixtures/enrollments-v2-business-rules-page.html", import.meta.url),
  "utf8"
);
const paymentsCommonRulesHtml = readFileSync(
  new URL("./fixtures/payments-common-rules-page.html", import.meta.url),
  "utf8"
);
const paymentsImplementationGuidesHtml = readFileSync(
  new URL("./fixtures/payments-implementation-guides-page.html", import.meta.url),
  "utf8"
);
const mqdHtml = readFileSync(new URL("./fixtures/mqd-page.html", import.meta.url), "utf8");
const segurancaHtml = readFileSync(new URL("./fixtures/seguranca-page.html", import.meta.url), "utf8");
const accountsV2Yaml = readFileSync(new URL("./fixtures/accounts-v2-spec.yml", import.meta.url), "utf8");
const resourcesV3Yaml = readFileSync(new URL("./fixtures/resources-v3-spec.yml", import.meta.url), "utf8");
const accountsV2BusinessRulesHtml = readFileSync(
  new URL("./fixtures/accounts-v2-business-rules-page.html", import.meta.url),
  "utf8"
);
const resourcesV3BusinessRulesHtml = readFileSync(
  new URL("./fixtures/resources-v3-business-rules-page.html", import.meta.url),
  "utf8"
);
const webhookYaml = readFileSync(new URL("./fixtures/webhook-v1-spec.yml", import.meta.url), "utf8");
const participantsJson = readFileSync(new URL("./fixtures/participants.json", import.meta.url), "utf8");

// Todo domínio novo DEVE registrar aqui um builder de dados de fixture.
const fixtureData: Record<string, () => DomainData> = {
  "pcm-additional-info": () => ({
    items: buildItems([
      { pageId: "1", title: "Página Fixture", url: "u", fields: parseAdditionalInfoTables(pcmHtml) },
    ]),
  }),
  "payments-v4-openapi": () => ({ items: parseOpenApiSpec(paymentsYaml, "payments") }),
  "payments-v5-openapi": () => ({ items: parseOpenApiSpec(paymentsV5Yaml, "payments") }),
  "enrollments-v2-openapi": () => ({ items: parseOpenApiSpec(enrollmentsV2Yaml, "enrollments") }),
  "automatic-payments-v2-openapi": () => ({
    items: parseOpenApiSpec(automaticPaymentsV2Yaml, "automatic-payments"),
  }),
  "consents-v3-openapi": () => ({ items: parseConsentsV3(consentsV3Yaml, "consents") }),
  "pcm-openapi": () => ({ items: parseOpenApiSpec(pcmOpenapiYaml, "pcm") }),
  "pcm-business-rules": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(pcmBusinessRulesHtml) },
    ]),
  }),
  "jornada-otimizada": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(jornadaOtimizadaHtml) },
    ]),
  }),
  "payments-v5-business-rules": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(paymentsV5BusinessRulesHtml) },
    ]),
  }),
  "automatic-payments-v2-business-rules": () => ({
    items: buildPcmRulesItems([
      {
        pageId: "1",
        title: "Página Fixture",
        url: "u",
        sections: parseSections(automaticPaymentsV2BusinessRulesHtml),
      },
    ]),
  }),
  "enrollments-v2-business-rules": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(enrollmentsV2BusinessRulesHtml) },
    ]),
  }),
  "payments-common-rules": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(paymentsCommonRulesHtml) },
    ]),
  }),
  "payments-implementation-guides": () => ({
    items: buildPcmRulesItems([
      {
        pageId: "1",
        title: "Página Fixture",
        url: "u",
        sections: parseSections(paymentsImplementationGuidesHtml),
      },
    ]),
  }),
  "mqd": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(mqdHtml) },
    ]),
  }),
  "seguranca": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(segurancaHtml) },
    ]),
  }),
  "webhook-v1-openapi": () => ({ items: parseOpenApiSpec(webhookYaml, "webhook") }),
  "accounts-v2-openapi": () => ({ items: parseOpenApiSpec(accountsV2Yaml, "accounts") }),
  "resources-v3-openapi": () => ({ items: parseOpenApiSpec(resourcesV3Yaml, "resources") }),
  "accounts-v2-business-rules": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(accountsV2BusinessRulesHtml) },
    ]),
  }),
  "resources-v3-business-rules": () => ({
    items: buildPcmRulesItems([
      { pageId: "1", title: "Página Fixture", url: "u", sections: parseSections(resourcesV3BusinessRulesHtml) },
    ]),
  }),
  "participantes": () => ({ items: parseParticipants(participantsJson) }),
};

const extractDomains = domains.filter((d): d is ExtractedDomain => d.live === undefined);

describe("pareamento <api>-v<major>-openapi ↔ <api>-v<major>-business-rules", () => {
  // Dirigido pelo lado das regras: todo domínio de regras versionado precisa ter
  // a spec correspondente. Fosse pelo lado da spec, um domínio de regras órfão
  // (ou com id fora do padrão) simplesmente não formaria par e o teste seguiria
  // verde — perdendo cobertura em silêncio. Domínios sem major no id ficam de
  // fora por construção: pcm-* não é versionado, a fonte não declara versão.
  const versionedRules = domains.filter((d) => /-v\d+-business-rules$/.test(d.id));
  // Órfãos são pegos pelo teste acima; aqui só os pares completos.
  const pairs = versionedRules
    .map(
      (rules) => [domains.find((d) => d.id === rules.id.replace(/-business-rules$/, "-openapi")), rules] as const
    )
    .filter((p): p is [(typeof domains)[number], (typeof domains)[number]] => p[0] !== undefined);

  it.each(versionedRules.map((d) => d.id))("%s tem a spec pareada registrada", (id) => {
    const spec = domains.find((d) => d.id === id.replace(/-business-rules$/, "-openapi"));
    expect(spec, `${id} não tem o par -openapi no registry`).toBeDefined();
  });

  // As páginas de regras costumam demorar a acompanhar patches da spec, então
  // divergir em minor/patch é esperado. Divergir no major significa que os dois
  // domínios descrevem versões diferentes da API — aí o par está errado.
  it.each(pairs.map(([spec, rules]) => [spec.id, spec, rules] as const))(
    "%s compartilha o major com o par de regras",
    (_id, spec, rules) => {
      expect(spec.specVersion, `${spec.id} deve declarar specVersion`).toBeDefined();
      expect(rules.specVersion, `${rules.id} deve declarar specVersion`).toBeDefined();
      const major = (v: string) => v.split(".")[0];
      expect(major(rules.specVersion!)).toBe(major(spec.specVersion!));
      // e o major precisa ser o mesmo codificado no id dos dois domínios
      expect(spec.id).toContain(`-v${major(spec.specVersion!)}-`);
      expect(rules.id).toContain(`-v${major(rules.specVersion!)}-`);
    }
  );
});

describe.each(extractDomains.map((d) => [d.id, d] as const))("contrato do domínio %s", (id, domain) => {
  it("tem metadados válidos", () => {
    expect(domain.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(domain.title.length).toBeGreaterThan(0);
    expect(domain.description.length).toBeGreaterThan(20);
    expect(domain.ttlHours).toBeGreaterThan(0);
    expect(domain.filters.length).toBeGreaterThan(0);
    for (const f of domain.filters) {
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it("tem fixture registrada para os testes de conformidade", () => {
    expect(fixtureData[id], `registre fixture para ${id} em test/contract.test.ts`).toBeDefined();
  });

  it("search sem argumentos devolve itens com ids únicos", () => {
    const data = fixtureData[id]();
    const results = domain.search(data);
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getItem resolve todo id devolvido por search", () => {
    const data = fixtureData[id]();
    for (const result of domain.search(data)) {
      expect(domain.getItem(data, result.id)).not.toBeNull();
    }
  });

  it("query sem correspondência devolve lista vazia", () => {
    const data = fixtureData[id]();
    expect(domain.search(data, "zzz-string-que-nao-existe-em-lugar-nenhum")).toEqual([]);
  });
});

const portalSearchJson = readFileSync(new URL("./fixtures/portal-search.json", import.meta.url), "utf8");

// Todo domínio live novo DEVE registrar aqui um responder de fetch por URL.
const liveFixtureFetch: Record<string, (url: string) => unknown> = {
  portal: (url) =>
    url.includes("/rest/api/search")
      ? JSON.parse(portalSearchJson)
      : {
          title: "Página Fixture",
          body: { view: { value: segurancaHtml } },
          _links: { webui: "/spaces/OF/pages/1" },
        },
};

const liveDomains = domains.filter((d): d is LiveDomain => d.live !== undefined);

describe.each(liveDomains.map((d) => [d.id, d] as const))("contrato do domínio live %s", (id, domain) => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch() {
    const respond = liveFixtureFetch[id];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => respond(String(url)),
      }))
    );
  }

  it("tem metadados válidos", () => {
    expect(domain.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(domain.title.length).toBeGreaterThan(0);
    expect(domain.description.length).toBeGreaterThan(20);
  });

  it("tem fixture live registrada para os testes de conformidade", () => {
    expect(liveFixtureFetch[id], `registre fixture live para ${id} em test/contract.test.ts`).toBeDefined();
  });

  it("live.search devolve itens com ids únicos", async () => {
    stubFetch();
    const results = await domain.live.search("additionalInfo");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("live.getItem resolve todo id devolvido por live.search", async () => {
    stubFetch();
    for (const result of await domain.live.search("additionalInfo")) {
      expect(await domain.live.getItem(result.id)).not.toBeNull();
    }
  });
});
