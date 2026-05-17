import { describe, it, expect } from "vitest";
import { loginBody, registerBody } from "./auth.schema";

describe("registerBody", () => {
  it("accepts a valid registration", () => {
    const out = registerBody.parse({
      phone: "0912345678",
      password: "secret123",
      name: "Nguyen Van A",
      email: "a@example.com",
    });
    expect(out.phone).toBe("0912345678");
  });

  it("strips invisible Unicode from the phone (RTL marks, zero-width spaces)", () => {
    const dirty = "‎09‬1234​5678";
    const out = registerBody.parse({
      phone: dirty,
      password: "secret123",
      name: "Test",
    });
    expect(out.phone).toBe("0912345678");
  });

  it("treats an empty email string as undefined", () => {
    const out = registerBody.parse({
      phone: "0912345678",
      password: "secret123",
      name: "Test",
      email: "",
    });
    expect(out.email).toBeUndefined();
  });

  it("rejects phones that do not start with 0", () => {
    expect(() =>
      registerBody.parse({ phone: "1912345678", password: "secret123", name: "Test" })
    ).toThrow();
  });

  it("rejects passwords shorter than 6 chars", () => {
    expect(() =>
      registerBody.parse({ phone: "0912345678", password: "abc", name: "Test" })
    ).toThrow();
  });

  it("rejects names that are empty after trim", () => {
    expect(() =>
      registerBody.parse({ phone: "0912345678", password: "secret123", name: "   " })
    ).toThrow();
  });

  it("rejects obviously bad email format", () => {
    expect(() =>
      registerBody.parse({
        phone: "0912345678",
        password: "secret123",
        name: "Test",
        email: "not-an-email",
      })
    ).toThrow();
  });
});

describe("loginBody", () => {
  it("accepts valid input", () => {
    expect(loginBody.parse({ phone: "0912345678", password: "anything" })).toEqual({
      phone: "0912345678",
      password: "anything",
    });
  });

  it("rejects missing password", () => {
    expect(() => loginBody.parse({ phone: "0912345678" })).toThrow();
  });
});
