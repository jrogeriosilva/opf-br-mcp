import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { paymentsDomain } from "../src/domains/payments-openapi/index.js";
import { pcmConfig } from "../src/domains/pcm-additional-info/config.js";
import { pcmDomain } from "../src/domains/pcm-additional-info/index.js";

const pcmHtml = readFileSync(new URL("./fixtures/pcm-page.html", import.meta.url), "utf8");
const paymentsYaml = readFileSync(new URL("./fixtures/payments-spec.yml", import.meta.url), "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function abortedSignal(): AbortSignal {
  const ac = new AbortController();
  ac.abort();
  return ac.signal;
}

describe("cancelamento e progresso na extração", () => {
  it("pcm: signal já abortado interrompe antes de qualquer fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(pcmDomain.extract({ signal: abortedSignal() })).rejects.toThrow(/cancelad/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pcm: emite progresso por página extraída", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ body: { view: { value: pcmHtml } }, _links: { webui: "/p" } }),
      })
    );
    const onProgress = vi.fn();
    const promise = pcmDomain.extract({ onProgress });
    await vi.runAllTimersAsync();
    await promise;
    const total = pcmConfig.pages.length;
    expect(onProgress).toHaveBeenCalledWith(0, total, expect.any(String));
    expect(onProgress).toHaveBeenCalledWith(total, total);
  });

  it("payments: signal já abortado interrompe antes do fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(paymentsDomain.extract({ signal: abortedSignal() })).rejects.toThrow(/cancelad/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("payments: emite progresso de download da spec", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => paymentsYaml,
      })
    );
    const onProgress = vi.fn();
    await paymentsDomain.extract({ onProgress });
    expect(onProgress).toHaveBeenCalledWith(0, 1, expect.any(String));
    expect(onProgress).toHaveBeenCalledWith(1, 1);
  });
});
