import { describe, it, expect, vi } from "vitest";

vi.mock("../config/env", () => ({ env: { frontendUrl: "https://pennybot.vn" } }));

import { upgradeUrl, appendUpgradeLink } from "./upgrade-link";

describe("upgrade-link", () => {
  it("upgradeUrl points at the pricing page", () => {
    expect(upgradeUrl()).toBe("https://pennybot.vn/pricing");
  });

  it("appendUpgradeLink keeps the body and adds the pricing link", () => {
    const out = appendUpgradeLink("Xin chào");
    expect(out).toContain("Xin chào");
    expect(out).toContain("https://pennybot.vn/pricing");
  });
});
