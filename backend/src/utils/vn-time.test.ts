import { describe, it, expect } from "vitest";
import { vnDateStr, startOfVnDay, vnDateRange } from "./vn-time";

describe("vnDateStr", () => {
  it("maps a UTC instant to the VN calendar date (UTC+7)", () => {
    expect(vnDateStr(new Date("2026-06-08T01:30:00Z"))).toBe("2026-06-08");
  });
  it("rolls into the next VN day after 17:00 UTC", () => {
    // 2026-06-07T18:00:00Z = 2026-06-08 01:00 VN
    expect(vnDateStr(new Date("2026-06-07T18:00:00Z"))).toBe("2026-06-08");
  });
});

describe("startOfVnDay", () => {
  it("returns 17:00 UTC of the previous day", () => {
    expect(startOfVnDay("2026-06-08").toISOString()).toBe("2026-06-07T17:00:00.000Z");
  });
  it("round-trips with vnDateStr", () => {
    expect(vnDateStr(startOfVnDay("2026-06-08"))).toBe("2026-06-08");
  });
});

describe("vnDateRange", () => {
  it("returns `days` ascending dates ending today (VN)", () => {
    const r = vnDateRange(7);
    expect(r).toHaveLength(7);
    expect(r[6]).toBe(vnDateStr(new Date()));
    // strictly ascending
    for (let i = 1; i < r.length; i++) {
      expect(r[i] > r[i - 1]).toBe(true);
    }
  });
});
