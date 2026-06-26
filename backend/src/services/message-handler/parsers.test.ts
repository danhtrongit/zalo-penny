import { describe, it, expect } from "vitest";
import {
  looksLikeExpense,
  parseExpenseByRegex,
  looksLikeLoginRequest,
  parseConfirmation,
  normalizeParsedExpense,
  parseBulkExpenses,
  looksLikeBulkList,
} from "./parsers";

describe("parseBulkExpenses (multi-date list paste)", () => {
  const today = "2026-06-25";

  it("extracts one expense per priced line, dated by its header (real paste)", () => {
    const text = [
      "16/6",
      "100k nc cam cty",
      "",
      "17/6",
      "35k hủ tiếu",
      "50k ảnh thẻ",
      "10k ck tư",
      "",
      "20/6",
      "17k tra tắc",
      "20k ck tư",
      "",
      "21/6",
      "55k đồ kê lap",
      "95k ăn vặt",
    ].join("\n");

    const out = parseBulkExpenses(text, today);
    expect(out.map((e) => [e.amount, e.date])).toEqual([
      [100000, "2026-06-16"],
      [35000, "2026-06-17"],
      [50000, "2026-06-17"],
      [10000, "2026-06-17"],
      [17000, "2026-06-20"],
      [20000, "2026-06-20"],
      [55000, "2026-06-21"],
      [95000, "2026-06-21"],
    ]);
    expect(out[0].description).toBe("nc cam cty");
    expect(out[1].description).toBe("hủ tiếu");
  });

  it("skips lines with no amount and dates the priced one by its header", () => {
    const text = [
      "1/6",
      "xanh sm",
      "đi be",
      "",
      "3/6",
      "ship thuốc từ bv",
      "mẹ ck dì5 cho (ko tinh)",
      "",
      "6/6",
      "nước suó 19k",
    ].join("\n");

    const out = parseBulkExpenses(text, today);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ amount: 19000, date: "2026-06-06", description: "nước suó" });
  });

  it("handles a date and item on the same line", () => {
    const out = parseBulkExpenses("16/6 100k nc cam", today);
    expect(out).toEqual([{ amount: 100000, description: "nc cam", category: "Khác", date: "2026-06-16" }]);
  });

  it("falls back to today before any date header", () => {
    expect(parseBulkExpenses("cà phê 35k\ntrà 20k", today).map((e) => e.date)).toEqual([today, today]);
  });
});

describe("looksLikeBulkList", () => {
  it("is true for multi-line money lists", () => {
    expect(looksLikeBulkList("16/6\n100k nc cam\n35k hủ tiếu")).toBe(true);
    expect(looksLikeBulkList("cà phê 35k\ntrà 20k")).toBe(true);
  });
  it("is false for a single expense", () => {
    expect(looksLikeBulkList("ăn trưa 50k")).toBe(false);
  });
});

describe("normalizeParsedExpense", () => {
  const today = "2026-06-19";

  it("passes a well-formed expense through", () => {
    const out = normalizeParsedExpense(
      { description: "cà phê", amount: 35000, category: "Ăn uống", date: "2026-06-18" },
      today
    );
    expect(out).toEqual({ description: "cà phê", amount: 35000, category: "Ăn uống", date: "2026-06-18" });
  });

  it("falls back to today when date is missing or invalid (the crash)", () => {
    expect(normalizeParsedExpense({ description: "ăn thịt", amount: 5000000 }, today)?.date).toBe(today);
    expect(normalizeParsedExpense({ description: "x", amount: 20000, date: "hôm nay" }, today)?.date).toBe(today);
  });

  it("falls back to category 'Khác' when missing", () => {
    expect(
      normalizeParsedExpense({ description: "ăn thịt", amount: 5000000, category: undefined }, today)?.category
    ).toBe("Khác");
  });

  it("returns null when the amount is not a positive number", () => {
    expect(normalizeParsedExpense({ description: "x", amount: 0 }, today)).toBeNull();
    expect(normalizeParsedExpense({ description: "x" }, today)).toBeNull();
    expect(normalizeParsedExpense({ description: "x", amount: "abc" }, today)).toBeNull();
  });
});

describe("parseConfirmation", () => {
  it("recognizes affirmatives", () => {
    for (const t of ["ừ", "có", "ok", "đúng rồi", "xác nhận", "xoá đi", "được"]) {
      expect(parseConfirmation(t)).toBe("yes");
    }
  });

  it("recognizes negatives", () => {
    for (const t of ["huỷ", "thôi", "không", "đừng xoá", "bỏ qua"]) {
      expect(parseConfirmation(t)).toBe("no");
    }
  });

  it("returns null for anything that isn't a yes/no", () => {
    for (const t of ["cà phê 30k", "báo cáo tháng này", "xin chào"]) {
      expect(parseConfirmation(t)).toBeNull();
    }
  });
});

describe("looksLikeLoginRequest", () => {
  it("matches the login phrase with or without diacritics", () => {
    expect(looksLikeLoginRequest("đăng nhập")).toBe(true);
    expect(looksLikeLoginRequest("dang nhap")).toBe(true);
    expect(looksLikeLoginRequest("Login")).toBe(true);
    expect(looksLikeLoginRequest("đăng nhập web")).toBe(true);
    expect(looksLikeLoginRequest("mở dashboard")).toBe(true);
  });

  it("does not hijack ordinary chat or expenses", () => {
    expect(looksLikeLoginRequest("cà phê 30k")).toBe(false);
    expect(looksLikeLoginRequest("chào Penny")).toBe(false);
    expect(looksLikeLoginRequest("báo cáo tháng này")).toBe(false);
  });
});

describe("looksLikeExpense", () => {
  it("matches short messages with k-shorthand", () => {
    expect(looksLikeExpense("ăn trưa 50k")).toBe(true);
    expect(looksLikeExpense("grab 45k")).toBe(true);
  });

  it("matches Vietnamese million shorthand", () => {
    expect(looksLikeExpense("hết 1 củ 2")).toBe(true);
    expect(looksLikeExpense("1 triệu 5")).toBe(true);
    expect(looksLikeExpense("2tr")).toBe(true);
  });

  it("matches long-but-spending messages with expense verbs", () => {
    expect(
      looksLikeExpense(
        "hôm nay đi siêu thị mua mấy món lặt vặt cho gia đình hết 250k"
      )
    ).toBe(true);
  });

  it("rejects short messages with no money", () => {
    expect(looksLikeExpense("xin chào")).toBe(false);
    expect(looksLikeExpense("báo cáo tháng này")).toBe(false);
  });

  it("rejects long messages without expense verbs (heuristic)", () => {
    // No expense verbs (het/ton/mat/mua/an/uong/tra/chi/tieu/ghi/di) in the message.
    // NOTE: this is a heuristic — short strings with money are accepted regardless.
    expect(
      looksLikeExpense(
        "OK em xem báo cáo của khách hôm qua thấy số 100000 rồi hỏi sếp lại nhé"
      )
    ).toBe(false);
  });
});

describe("parseExpenseByRegex", () => {
  it("parses 50k", () => {
    const out = parseExpenseByRegex("ăn trưa 50k");
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(50_000);
    expect(out[0].category).toBe("Khác");
  });

  it("parses '1 củ 2' as 1_200_000", () => {
    const out = parseExpenseByRegex("đá gà 1 củ 2");
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(1_200_000);
  });

  it("parses '1 triệu 5' as 1_500_000", () => {
    const out = parseExpenseByRegex("hết 1 triệu 5 cho điện thoại");
    expect(out[0].amount).toBe(1_500_000);
  });

  it("parses bare 200000 as 200_000", () => {
    expect(parseExpenseByRegex("đi chợ 200000")[0].amount).toBe(200_000);
  });

  it("returns [] when no amount can be parsed", () => {
    expect(parseExpenseByRegex("xin chào")).toEqual([]);
  });

  it("today's date is used when none provided", () => {
    const out = parseExpenseByRegex("ăn trưa 50k");
    const today = new Date().toISOString().slice(0, 10);
    expect(out[0].date).toBe(today);
  });

  it("description has a 100-char cap", () => {
    const longText = "x".repeat(200) + " 50k";
    const out = parseExpenseByRegex(longText);
    expect(out[0].description.length).toBeLessThanOrEqual(100);
  });
});
