import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { UpstreamError } from "./errors";
import { fetchJson } from "./fetchJson";
import { TtlCache } from "./ttlCache";

describe("TtlCache", () => {
  it("serves hits until the entry expires", async () => {
    let now = 0;
    const cache = new TtlCache<string, number>({ ttlMs: 100, maxEntries: 10, now: () => now });
    const load = vi.fn(() => Promise.resolve(now));

    expect(await cache.getOrLoad("a", load)).toBe(0);
    now = 99;
    expect(await cache.getOrLoad("a", load)).toBe(0);
    now = 100;
    expect(await cache.getOrLoad("a", load)).toBe(100);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const cache = new TtlCache<string, number>({ ttlMs: 1000, maxEntries: 10 });
    const load = vi.fn(() => Promise.resolve(1));
    await Promise.all([cache.getOrLoad("a", load), cache.getOrLoad("a", load), cache.getOrLoad("a", load)]);
    expect(load).toHaveBeenCalledOnce();
  });

  it("does not cache failures", async () => {
    const cache = new TtlCache<string, number>({ ttlMs: 1000, maxEntries: 10 });
    await expect(cache.getOrLoad("a", () => Promise.reject(new Error("down")))).rejects.toThrow("down");
    await Promise.resolve(); // let the rejection handler run
    expect(await cache.getOrLoad("a", () => Promise.resolve(2))).toBe(2);
  });

  it("evicts the oldest entry past maxEntries", async () => {
    const cache = new TtlCache<string, string>({ ttlMs: 1000, maxEntries: 2 });
    for (const key of ["a", "b", "c"]) await cache.getOrLoad(key, () => Promise.resolve(key));
    expect(cache.size).toBe(2);
    const reload = vi.fn(() => Promise.resolve("a2"));
    expect(await cache.getOrLoad("a", reload)).toBe("a2");
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("fetchJson", () => {
  const schema = z.object({ ok: z.boolean() });
  const call = (fetchFn: typeof fetch) => fetchJson("https://api.example.test", { upstream: "Test", schema, fetchFn });

  it("returns validated data", async () => {
    await expect(call(() => Promise.resolve(Response.json({ ok: true, extra: 1 })))).resolves.toEqual({ ok: true });
  });

  it.each([
    ["a network error", () => Promise.reject(new TypeError("fetch failed"))],
    ["a non-2xx status", () => Promise.resolve(new Response("nope", { status: 401 }))],
    ["a non-JSON body", () => Promise.resolve(new Response("<html>"))],
    ["an unexpected shape", () => Promise.resolve(Response.json({ ok: "yes" }))],
  ] as const)("turns %s into an UpstreamError", async (_label, fetchFn) => {
    await expect(call(fetchFn)).rejects.toBeInstanceOf(UpstreamError);
  });

  it("times out slow upstreams", async () => {
    const slow: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("timed out", "TimeoutError"));
        });
      });
    await expect(
      fetchJson("https://api.example.test", { upstream: "Test", schema, fetchFn: slow, timeoutMs: 10 }),
    ).rejects.toBeInstanceOf(UpstreamError);
  });
});
