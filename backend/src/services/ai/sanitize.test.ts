import { describe, it, expect } from "vitest";
import { sanitizeSearchBackedResponse } from "./sanitize";

describe("sanitizeSearchBackedResponse", () => {
  it("returns input untouched when there's only one paragraph", () => {
    expect(sanitizeSearchBackedResponse("Giá vàng SJC hôm nay 80 triệu.")).toBe(
      "Giá vàng SJC hôm nay 80 triệu."
    );
  });

  it("strips a leading 'no data' apology when followed by real search numbers", () => {
    const input =
      "Xin lỗi, em chưa có thông tin mới nhất ạ.\n\nGiá vàng SJC hôm nay: 80 triệu đồng/lượng (cập nhật)";
    const out = sanitizeSearchBackedResponse(input);
    expect(out.startsWith("Xin lỗi")).toBe(false);
    expect(out).toContain("Giá vàng SJC");
  });

  it("strips multiple contradictory prefaces in a row", () => {
    const input = [
      "Xin lỗi anh.",
      "Em chưa cập nhật được ạ.",
      "Giá vàng hôm nay 80 triệu/lượng theo cập nhật.",
    ].join("\n\n");
    const out = sanitizeSearchBackedResponse(input);
    expect(out).toBe("Giá vàng hôm nay 80 triệu/lượng theo cập nhật.");
  });

  it("keeps the preface when there are no obvious search-result signals", () => {
    const input =
      "Xin lỗi, em chưa có thông tin.\n\nAnh thử check trang chính chủ nhé.";
    // Second paragraph has no number → not a search result → keep everything
    expect(sanitizeSearchBackedResponse(input)).toBe(input);
  });

  it("handles empty input", () => {
    expect(sanitizeSearchBackedResponse("")).toBe("");
    expect(sanitizeSearchBackedResponse("   ")).toBe("");
  });
});
