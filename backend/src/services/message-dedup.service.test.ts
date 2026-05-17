import { describe, it, expect, beforeEach, vi } from "vitest";

// Force the in-memory branch by stubbing getRedis -> null. setup.ts already
// keeps REDIS_URL unset, but mocking is explicit and immune to env leakage.
vi.mock("../config/redis", () => ({
  getRedis: () => null,
  closeRedis: async () => {},
}));

import {
  abandonMessageProcessing,
  claimMessageProcessing,
  completeMessageProcessing,
  __resetInMemoryStateForTests,
} from "./message-dedup.service";

beforeEach(() => {
  __resetInMemoryStateForTests();
});

describe("message-dedup (in-memory mode)", () => {
  it("claim returns true on first call", async () => {
    expect(await claimMessageProcessing("k1")).toBe(true);
  });

  it("second concurrent claim with the same key is rejected", async () => {
    expect(await claimMessageProcessing("k1")).toBe(true);
    expect(await claimMessageProcessing("k1")).toBe(false);
  });

  it("complete(cacheResult=true) keeps the key blocked for further claims", async () => {
    await claimMessageProcessing("k1");
    await completeMessageProcessing("k1");
    expect(await claimMessageProcessing("k1")).toBe(false);
  });

  it("complete(cacheResult=false) releases the key so retries can re-claim", async () => {
    await claimMessageProcessing("k1");
    await completeMessageProcessing("k1", false);
    expect(await claimMessageProcessing("k1")).toBe(true);
  });

  it("abandon releases the in-flight claim immediately", async () => {
    await claimMessageProcessing("k1");
    await abandonMessageProcessing("k1");
    expect(await claimMessageProcessing("k1")).toBe(true);
  });

  it("different keys do not interfere", async () => {
    expect(await claimMessageProcessing("k1")).toBe(true);
    expect(await claimMessageProcessing("k2")).toBe(true);
  });
});
