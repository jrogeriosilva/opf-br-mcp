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
});
