import { describe, it, expect } from "vitest";
import { signToken, signMagicToken, verifyMagicToken } from "./auth.service";

describe("magic-link tokens", () => {
  it("round-trips a magic token back to its userId", () => {
    const token = signMagicToken("user-123");
    expect(typeof token).toBe("string");
    expect(verifyMagicToken(token)).toEqual({ userId: "user-123" });
  });

  it("rejects a normal session token (wrong typ)", () => {
    const session = signToken({ userId: "user-123", role: "USER" });
    expect(() => verifyMagicToken(session)).toThrow();
  });

  it("rejects garbage", () => {
    expect(() => verifyMagicToken("not-a-token")).toThrow();
  });
});
