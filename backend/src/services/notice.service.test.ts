import { describe, it, expect, vi, beforeEach } from "vitest";

const { aiMock } = vi.hoisted(() => ({ aiMock: vi.fn() }));

vi.mock("./ai", () => ({ generateChatResponse: (...a: unknown[]) => aiMock(...a) }));
vi.mock("../utils/upgrade-link", () => ({
  appendUpgradeLink: (t: string) => `${t}\n\nLINK`,
}));

import { buildPersonaNotice } from "./notice.service";

describe("buildPersonaNotice", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses AI text when available, then appends the link", async () => {
    aiMock.mockResolvedValue("  Nâng cấp đi bạn ơi  ");
    const out = await buildPersonaNotice("PROMPT", "FALLBACK", "SYS");
    expect(out).toBe("Nâng cấp đi bạn ơi\n\nLINK");
    expect(aiMock).toHaveBeenCalledWith("PROMPT", "SYS");
  });

  it("falls back to the static body when AI throws, still appends the link", async () => {
    aiMock.mockRejectedValue(new Error("boom"));
    const out = await buildPersonaNotice("PROMPT", "FALLBACK", "SYS");
    expect(out).toBe("FALLBACK\n\nLINK");
  });

  it("falls back when AI returns empty", async () => {
    aiMock.mockResolvedValue("   ");
    const out = await buildPersonaNotice("PROMPT", "FALLBACK", "SYS");
    expect(out).toBe("FALLBACK\n\nLINK");
  });
});
