import { describe, it, expect } from "vitest";
import {
  looksLikeExpense,
  parseExpenseByRegex,
  looksLikeLoginRequest,
  parseConfirmation,
} from "./parsers";

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
