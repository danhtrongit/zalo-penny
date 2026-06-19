import { describe, it, expect } from "vitest";
import { buildTargetWhere, hasTargetMatch } from "./tx-target";

describe("buildTargetWhere", () => {
  it("filters by amount, description, and the VN day when a date is given", () => {
    const where = buildTargetWhere("u1", {
      description: "ăn cơm",
      amount: 40000,
      date: "2026-06-18",
    }) as {
      userId: string;
      amount?: number;
      description?: { contains: string; mode: string };
      date?: { gte: Date; lt: Date };
    };
    expect(where.userId).toBe("u1");
    expect(where.amount).toBe(40000);
    expect(where.description).toEqual({ contains: "ăn cơm", mode: "insensitive" });
    // VN-day half-open range [18th 00:00 +07, 19th 00:00 +07)
    expect(where.date?.gte.toISOString()).toBe("2026-06-17T17:00:00.000Z");
    expect(where.date?.lt.toISOString()).toBe("2026-06-18T17:00:00.000Z");
  });

  it("omits the date filter when no (valid) date is given", () => {
    const where = buildTargetWhere("u1", { description: "x" }) as { date?: unknown };
    expect(where.date).toBeUndefined();
  });
});

describe("hasTargetMatch", () => {
  it("is true when any of amount/description/date is present", () => {
    expect(hasTargetMatch({ amount: 1 })).toBe(true);
    expect(hasTargetMatch({ description: "x" })).toBe(true);
    expect(hasTargetMatch({ date: "2026-06-18" })).toBe(true);
  });
  it("is false when empty/undefined", () => {
    expect(hasTargetMatch({})).toBe(false);
    expect(hasTargetMatch(undefined)).toBe(false);
  });
});
