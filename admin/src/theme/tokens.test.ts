import { describe, it, expect } from "vitest";
import { PRIMARY } from "./tokens";
import { buildThemeOverrides } from "./naive";

describe("theme tokens", () => {
  it("PRIMARY is a 6-digit hex", () => {
    expect(PRIMARY).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("theme overrides expose the brand primary", () => {
    expect(buildThemeOverrides(false).common?.primaryColor).toBe(PRIMARY);
    expect(buildThemeOverrides(true).common?.borderRadius).toBe("10px");
  });
});
