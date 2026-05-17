import { describe, it, expect } from "vitest";
import {
  cleanThinkingArtifacts,
  formatMoney,
  isOptionAgnosticReply,
  shouldAwaitFollowUp,
  shouldUseGoogleSearch,
} from "./helpers";

describe("formatMoney", () => {
  it("formats VND with thousand separators and đ suffix", () => {
    expect(formatMoney(50_000)).toBe("50.000đ");
    expect(formatMoney(1_200_000)).toBe("1.200.000đ");
  });

  it("handles zero", () => {
    expect(formatMoney(0)).toBe("0đ");
  });
});

describe("cleanThinkingArtifacts", () => {
  it("strips a very short prefix followed by double newline", () => {
    expect(cleanThinkingArtifacts("ok.\n\nThe real answer here")).toBe(
      "The real answer here"
    );
  });

  it("keeps text when prefix is too long to be a 'thinking' artifact", () => {
    const input =
      "This is a much longer first paragraph that clearly is not a thinking artifact.\n\nSecond paragraph.";
    expect(cleanThinkingArtifacts(input)).toBe(input);
  });

  it("trims leading/trailing whitespace", () => {
    expect(cleanThinkingArtifacts("   hi   ")).toBe("hi");
  });
});

describe("shouldAwaitFollowUp", () => {
  it("true when the response ends with a question mark", () => {
    expect(shouldAwaitFollowUp("Bạn muốn ghi không?")).toBe(true);
  });

  it("true for soft Vietnamese sentence-final particles", () => {
    expect(shouldAwaitFollowUp("Để tý em check nhé")).toBe(true);
    expect(shouldAwaitFollowUp("Cho mình xin số tài khoản nha")).toBe(true);
  });

  it("false for a flat statement", () => {
    expect(shouldAwaitFollowUp("Đã ghi xong.")).toBe(false);
  });
});

describe("isOptionAgnosticReply", () => {
  it("matches 'đại đi'", () => {
    expect(isOptionAgnosticReply("đại đi")).toBe(true);
  });

  it("matches 'cứ check đi'", () => {
    expect(isOptionAgnosticReply("cứ check đi")).toBe(true);
  });

  it("false for a regular reply", () => {
    expect(isOptionAgnosticReply("ăn trưa 50k")).toBe(false);
  });
});

describe("shouldUseGoogleSearch", () => {
  it("true for gold-price queries", () => {
    expect(shouldUseGoogleSearch("giá vàng SJC hôm nay bao nhiêu", "")).toBe(true);
  });

  it("true for general temporal signals", () => {
    expect(shouldUseGoogleSearch("tin tức mới nhất", "")).toBe(true);
  });

  it("false for ordinary chat", () => {
    expect(shouldUseGoogleSearch("xin chào bạn", "")).toBe(false);
  });
});
