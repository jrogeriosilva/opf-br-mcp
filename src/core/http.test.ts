import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "./http.js";

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
});
