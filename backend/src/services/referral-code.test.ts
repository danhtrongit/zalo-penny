import { describe, it, expect } from "vitest";
import {
  generateReferralCode,
  normalizeReferralCode,
  computeCommission,
  isValidCommissionPct,
  buildReferralLink,
} from "./referral-code";

describe("generateReferralCode", () => {
  it("produces a 7-char code from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateReferralCode();
      expect(code).toHaveLength(7);
      // No confusing characters: 0, O, 1, I, L
      expect(code).toMatch(/^[A-Z0-9]+$/);
      expect(code).not.toMatch(/[O01IL]/);
    }
  });

  it("is effectively unique across many calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generateReferralCode());
    // With 30^7 space, 500 draws should essentially never collide.
    expect(seen.size).toBe(500);
  });
});

describe("normalizeReferralCode", () => {
  it("trims, uppercases, and strips punctuation/spaces", () => {
    expect(normalizeReferralCode("  abc-23 z ")).toBe("ABC23Z");
  });

  it("returns null for empty / nullish input", () => {
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode("   ")).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode(undefined)).toBeNull();
    expect(normalizeReferralCode("!!!")).toBeNull();
  });
});

describe("computeCommission", () => {
  it("floors amount * pct / 100", () => {
    expect(computeCommission(99000, 10)).toBe(9900);
    expect(computeCommission(99000, 15)).toBe(14850);
    expect(computeCommission(99999, 10)).toBe(9999); // 9999.9 floored
  });

  it("returns 0 for non-positive or invalid inputs", () => {
    expect(computeCommission(0, 10)).toBe(0);
    expect(computeCommission(99000, 0)).toBe(0);
    expect(computeCommission(-5, 10)).toBe(0);
    expect(computeCommission(99000, -10)).toBe(0);
    expect(computeCommission(NaN, 10)).toBe(0);
    expect(computeCommission(99000, NaN)).toBe(0);
  });
});

describe("isValidCommissionPct", () => {
  it("accepts integers 0..100", () => {
    expect(isValidCommissionPct(0)).toBe(true);
    expect(isValidCommissionPct(10)).toBe(true);
    expect(isValidCommissionPct(100)).toBe(true);
  });

  it("rejects out-of-range, non-integer, and non-number", () => {
    expect(isValidCommissionPct(-1)).toBe(false);
    expect(isValidCommissionPct(101)).toBe(false);
    expect(isValidCommissionPct(10.5)).toBe(false);
    expect(isValidCommissionPct("10")).toBe(false);
    expect(isValidCommissionPct(null)).toBe(false);
  });
});

describe("buildReferralLink", () => {
  it("builds a /register?ref= link, tolerating a trailing slash", () => {
    expect(buildReferralLink("https://pennybot.vn", "ABC23Z")).toBe(
      "https://pennybot.vn/register?ref=ABC23Z"
    );
    expect(buildReferralLink("https://pennybot.vn/", "ABC23Z")).toBe(
      "https://pennybot.vn/register?ref=ABC23Z"
    );
  });
});
