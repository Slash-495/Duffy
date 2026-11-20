import { describe, it, expect, vi } from "vitest";
import { cacheAside } from "../src/lib/cache.js";

describe("cacheAside single-flight coalescing", () => {
  it("coalesces concurrent misses for the same key into a single fetcher() call", async () => {
    let resolveFetch;
    const fetcher = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    const key = `test:singleflight:concurrent:${Date.now()}`;
    const calls = Array.from({ length: 20 }, () => cacheAside(key, 60, fetcher));

    // Allow microtasks to run so all callers pass cacheGet and register/join inFlight
    await new Promise((r) => setTimeout(r, 10));

    // Also add a late joiner while the first request is already mid-flight
    const lateJoiner = cacheAside(key, 60, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);

    const payload = { corrected: "She didn't like it.", score: 95 };
    resolveFetch(payload);

    const results = await Promise.all([...calls, lateJoiner]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    for (const res of results) {
      expect(res).toEqual({ data: payload, hit: false });
    }
  });

  it("does not block concurrent fetches for different keys", async () => {
    const fetcherA = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 15));
      return "value-a";
    });
    const fetcherB = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 15));
      return "value-b";
    });

    const [resA, resB] = await Promise.all([
      cacheAside(`test:singleflight:keyA:${Date.now()}`, 60, fetcherA),
      cacheAside(`test:singleflight:keyB:${Date.now()}`, 60, fetcherB),
    ]);

    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1);
    expect(resA).toEqual({ data: "value-a", hit: false });
    expect(resB).toEqual({ data: "value-b", hit: false });
  });

  it("clears the in-flight entry after settlement so subsequent misses call fetcher() again", async () => {
    let counter = 0;
    const fetcher = vi.fn(async () => {
      counter += 1;
      return { attempt: counter };
    });

    const key = `test:singleflight:settle:${Date.now()}`;
    const first = await cacheAside(key, 60, fetcher);
    const second = await cacheAside(key, 60, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(first).toEqual({ data: { attempt: 1 }, hit: false });
    expect(second).toEqual({ data: { attempt: 2 }, hit: false });
  });

  it("propagates errors to all coalesced callers and clears the in-flight entry on error", async () => {
    let rejectFetch;
    const failingFetcher = vi.fn(
      () =>
        new Promise((_, reject) => {
          rejectFetch = reject;
        })
    );

    const key = `test:singleflight:error:${Date.now()}`;
    const concurrentCalls = Array.from({ length: 5 }, () => cacheAside(key, 60, failingFetcher));

    await new Promise((r) => setTimeout(r, 10));
    expect(failingFetcher).toHaveBeenCalledTimes(1);

    rejectFetch(new Error("upstream timeout"));

    const settled = await Promise.allSettled(concurrentCalls);
    expect(settled).toHaveLength(5);
    for (const outcome of settled) {
      expect(outcome.status).toBe("rejected");
      expect(outcome.reason.message).toBe("upstream timeout");
    }

    // Entry must be cleared so a retry succeeds cleanly
    const recoveryFetcher = vi.fn(async () => ({ ok: true }));
    const retryResult = await cacheAside(key, 60, recoveryFetcher);
    expect(recoveryFetcher).toHaveBeenCalledTimes(1);
    expect(retryResult).toEqual({ data: { ok: true }, hit: false });
  });
});
