import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry, sleep } from "./http.js";

afterEach(() => vi.unstubAllGlobals());

describe("fetchWithRetry", () => {
  it("retorna a resposta no primeiro sucesso após falhas", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce({ ok: false, status: 503, statusText: "Service Unavailable" })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: "OK" });
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.test/x", { retryDelaysMs: [0, 0, 0] });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("lança o último erro quando esgota as tentativas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      fetchWithRetry("https://example.test/x", { retryDelaysMs: [0] })
    ).rejects.toThrow("offline");
  });

  it("signal já abortado → rejeita sem tentar nenhum fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const ac = new AbortController();
    ac.abort();
    await expect(
      fetchWithRetry("https://example.test/x", { retryDelaysMs: [0], signal: ac.signal })
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signal abortado entre tentativas → não retenta", async () => {
    const ac = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      ac.abort();
      return Promise.reject(new Error("ECONNRESET"));
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchWithRetry("https://example.test/x", { retryDelaysMs: [0, 0], signal: ac.signal })
    ).rejects.toThrow("ECONNRESET");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("não re-tenta 4xx (erro permanente)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchWithRetry("https://example.test/x", { retryDelaysMs: [0, 0] })
    ).rejects.toThrow("HTTP 404");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("429 continua com retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: "Too Many Requests" })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: "OK" });
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("https://example.test/x", { retryDelaysMs: [0] });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("sleep", () => {
  it("acorda na hora quando o signal é abortado", async () => {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 20);
    const t0 = Date.now();
    await sleep(5000, ac.signal);
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it("signal já abortado resolve imediatamente", async () => {
    const t0 = Date.now();
    await sleep(5000, AbortSignal.abort());
    expect(Date.now() - t0).toBeLessThan(100);
  });

  it("sem signal, espera o tempo pedido", async () => {
    const t0 = Date.now();
    await sleep(60);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(50);
  });
});

// Antes o abort só era percebido no topo da iteração seguinte, então o backoff
// era dormido por inteiro — até 16s com os delays em uso.
describe("fetchWithRetry cancelado durante o backoff", () => {
  it("retorna sem esperar o backoff inteiro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, statusText: "Unavailable" }) as unknown as Response)
    );
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 30);
    const t0 = Date.now();
    await expect(
      fetchWithRetry("https://exemplo/x", { retryDelaysMs: [5000, 5000], signal: ac.signal })
    ).rejects.toThrow();
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
