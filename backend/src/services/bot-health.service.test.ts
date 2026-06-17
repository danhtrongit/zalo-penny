import { describe, it, expect, vi, beforeEach } from "vitest";

const { getMe } = vi.hoisted(() => ({ getMe: vi.fn() }));
vi.mock("../utils/zalo-api", async () => {
  const actual = await vi.importActual<typeof import("../utils/zalo-api")>("../utils/zalo-api");
  return { ...actual, getMe: (...a: unknown[]) => getMe(...a) };
});

import { getOwnedBotHealth, clearBotHealthCache } from "./bot-health.service";
import { ZaloApiError } from "../utils/zalo-api";

beforeEach(() => {
  vi.clearAllMocks();
  clearBotHealthCache();
});

describe("getOwnedBotHealth", () => {
  it("returns true and caches when getMe succeeds (one Zalo call per window)", async () => {
    getMe.mockResolvedValue({ id: "bot" });
    expect(await getOwnedBotHealth("bc1", "tok")).toBe(true);
    expect(await getOwnedBotHealth("bc1", "tok")).toBe(true);
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  it("returns false when getMe throws 401", async () => {
    getMe.mockRejectedValue(new ZaloApiError("getMe", 401, "Unauthorized", 200));
    expect(await getOwnedBotHealth("bc2", "tok")).toBe(false);
  });

  it("treats a non-401 error as healthy (no false alarm)", async () => {
    getMe.mockRejectedValue(new Error("network down"));
    expect(await getOwnedBotHealth("bc3", "tok")).toBe(true);
  });
});
