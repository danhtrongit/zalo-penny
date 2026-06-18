import { describe, it, expect } from "vitest";
import { vnDateStr, startOfVnDay, vnDateRange, resolveVnRange } from "./vn-time";

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

describe("resolveVnRange", () => {
  // Fixed "now": 2026-06-18T03:00:00Z == 10:00 Thu 2026-06-18 in VN (UTC+7).
  const NOW = new Date("2026-06-18T03:00:00Z");
  const iso = (d: Date) => d.toISOString();

  it("hôm nay → today's VN day", () => {
    const r = resolveVnRange("chi tiêu hôm nay", NOW)!;
    expect(iso(r.start)).toBe("2026-06-17T17:00:00.000Z"); // 2026-06-18 00:00 +07
    expect(iso(r.end)).toBe("2026-06-18T17:00:00.000Z"); // 2026-06-19 00:00 +07
    expect(r.label).toBe("hôm nay");
  });

  it("hôm qua → previous VN day", () => {
    const r = resolveVnRange("báo cáo chi tiêu ngày hôm qua", NOW)!;
    expect(iso(r.start)).toBe("2026-06-16T17:00:00.000Z");
    expect(iso(r.end)).toBe("2026-06-17T17:00:00.000Z");
    expect(r.label).toBe("hôm qua");
  });

  it("tuần này → Monday..next Monday (VN)", () => {
    const r = resolveVnRange("chi tiêu tuần này", NOW)!;
    expect(iso(r.start)).toBe("2026-06-14T17:00:00.000Z"); // 2026-06-15 (Mon)
    expect(iso(r.end)).toBe("2026-06-21T17:00:00.000Z"); // 2026-06-22 (next Mon)
    expect(r.label).toBe("tuần này");
  });

  it("tuần vừa qua → previous calendar week", () => {
    const r = resolveVnRange("chi tiêu tuần vừa qua", NOW)!;
    expect(iso(r.start)).toBe("2026-06-07T17:00:00.000Z"); // 2026-06-08 (Mon)
    expect(iso(r.end)).toBe("2026-06-14T17:00:00.000Z"); // 2026-06-15 (Mon)
    expect(r.label).toBe("tuần trước");
  });

  it("tháng này → first..next first (VN)", () => {
    const r = resolveVnRange("chi tiêu tháng này", NOW)!;
    expect(iso(r.start)).toBe("2026-05-31T17:00:00.000Z"); // 2026-06-01
    expect(iso(r.end)).toBe("2026-06-30T17:00:00.000Z"); // 2026-07-01
    expect(r.label).toBe("tháng này");
  });

  it("tháng trước → previous month", () => {
    const r = resolveVnRange("chi tiêu tháng trước", NOW)!;
    expect(iso(r.start)).toBe("2026-04-30T17:00:00.000Z"); // 2026-05-01
    expect(iso(r.end)).toBe("2026-05-31T17:00:00.000Z"); // 2026-06-01
    expect(r.label).toBe("tháng trước");
  });

  it("7 ngày qua → rolling last 7 VN days incl. today", () => {
    const r = resolveVnRange("chi tiêu 7 ngày qua", NOW)!;
    expect(iso(r.start)).toBe("2026-06-11T17:00:00.000Z"); // 2026-06-12
    expect(iso(r.end)).toBe("2026-06-18T17:00:00.000Z"); // 2026-06-19
    expect(r.label).toBe("7 ngày qua");
  });

  it("returns null when no time phrase is present", () => {
    expect(resolveVnRange("chào Penny", NOW)).toBeNull();
    expect(resolveVnRange("cà phê 30k", NOW)).toBeNull();
  });
});
