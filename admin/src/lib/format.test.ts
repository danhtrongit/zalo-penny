import { describe, it, expect } from "vitest";
import { formatVnd, formatNumber, formatDate, formatDateTime } from "./format";

describe("format", () => {
  it("formatVnd appends ₫ and groups thousands", () => {
    const s = formatVnd(1234567);
    expect(s).toContain("₫");
    expect(s).toContain("1.234.567");
  });

  it("formatVnd handles empty", () => {
    expect(formatVnd(null)).toBe("—");
    expect(formatVnd(undefined)).toBe("—");
  });

  it("formatNumber groups thousands (vi-VN)", () => {
    expect(formatNumber(1000)).toBe("1.000");
  });

  it("formatDate / formatDateTime handle empty", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("formatDate renders a valid ISO date", () => {
    expect(formatDate("2026-06-08T00:00:00Z")).toContain("2026");
  });
});
