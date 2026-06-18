import { describe, it, expect } from "vitest";
import { extractLinkCode } from "./link-code";

describe("extractLinkCode", () => {
  it("returns the canonical code when the user pastes it exactly", () => {
    expect(extractLinkCode("PENNY-ABCD")).toBe("PENNY-ABCD");
  });

  it("is case-insensitive", () => {
    expect(extractLinkCode("penny-abcd")).toBe("PENNY-ABCD");
  });

  it("accepts the code without the dash", () => {
    expect(extractLinkCode("pennyabcd")).toBe("PENNY-ABCD");
  });

  it("accepts a space between prefix and code", () => {
    expect(extractLinkCode("penny abcd")).toBe("PENNY-ABCD");
  });

  it("accepts spaces around the dash", () => {
    expect(extractLinkCode("PENNY - ABCD")).toBe("PENNY-ABCD");
  });

  it("accepts just the 4-character core (no prefix)", () => {
    expect(extractLinkCode("ABCD")).toBe("PENNY-ABCD");
  });

  it("trims surrounding whitespace", () => {
    expect(extractLinkCode("  abcd  ")).toBe("PENNY-ABCD");
  });

  it("rejects an empty string", () => {
    expect(extractLinkCode("")).toBeNull();
  });

  it("rejects whitespace only", () => {
    expect(extractLinkCode("   ")).toBeNull();
  });

  it("rejects a normal expense message", () => {
    expect(extractLinkCode("ăn trưa 50k")).toBeNull();
  });

  it("rejects an ordinary greeting", () => {
    expect(extractLinkCode("hello there")).toBeNull();
  });

  it("rejects a core that is too long", () => {
    expect(extractLinkCode("ABCDE")).toBeNull();
  });

  it("rejects characters outside the code alphabet (no 0/1/I/O)", () => {
    expect(extractLinkCode("AB1D")).toBeNull();
  });

  it("does not match a code buried inside a longer sentence", () => {
    expect(extractLinkCode("ma cua toi la PENNY-ABCD nhe")).toBeNull();
  });
});
