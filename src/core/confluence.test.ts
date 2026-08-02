import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchConfluencePage } from "./confluence.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubJson(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => body,
    }))
  );
}

describe("fetchConfluencePage", () => {
  it("devolve o HTML renderizado e a url webui absoluta", async () => {
    stubJson({ title: "T", body: { view: { value: "<p>oi</p>" } }, _links: { webui: "/spaces/x" } });
    const page = await fetchConfluencePage("https://base", "123", []);
    expect(page).toEqual({ html: "<p>oi</p>", title: "T", url: "https://base/wiki/spaces/x" });
  });

  it("aceita página legitimamente vazia (value: '')", async () => {
    stubJson({ title: "T", body: { view: { value: "" } } });
    await expect(fetchConfluencePage("https://base", "123", [])).resolves.toMatchObject({ html: "" });
  });

  // Sem body.view.value a resposta não é o conteúdo expandido. Antes virava html
  // vazio, 0 seções e um domínio vazio cacheado por 72h, sem erro nenhum.
  it.each([
    ["erro da API com 200", { statusCode: 404, message: "No content found" }],
    ["content sem a expansão", { title: "X", _links: { webui: "/x" } }],
    ["body sem view", { title: "X", body: {} }],
    ["value não-string", { body: { view: { value: 42 } } }],
    ["resposta nula", null],
  ])("lança quando falta body.view.value (%s)", async (_caso, body) => {
    stubJson(body);
    await expect(fetchConfluencePage("https://base", "999", [])).rejects.toThrow(
      /não traz body\.view\.value/
    );
  });
});
