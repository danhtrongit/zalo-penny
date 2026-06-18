import { describe, it, expect } from "vitest";
import { formatExpenseReport } from "./report-format";
import { formatMoney } from "./helpers";

const tx = (amount: number, description: string, category: string, dateIso: string) => ({
  amount,
  description,
  category,
  date: new Date(dateIso),
});

describe("formatExpenseReport", () => {
  it("reports 'no transactions' for an empty period", () => {
    const out = formatExpenseReport("hôm qua", []);
    expect(out).toContain("hôm qua");
    expect(out).toContain("Không có giao dịch");
  });

  it("shows an exact total equal to the sum and the transaction count", () => {
    const txs = [
      tx(50000, "cà phê", "Ăn uống", "2026-06-18T03:00:00Z"),
      tx(30000, "trà sữa", "Ăn uống", "2026-06-18T05:00:00Z"),
      tx(120000, "grab", "Đi lại", "2026-06-18T06:00:00Z"),
    ];
    const out = formatExpenseReport("hôm nay", txs);
    expect(out).toContain("3 giao dịch");
    expect(out).toContain(formatMoney(200000)); // exact total, never rounded
  });

  it("itemizes every transaction (no silent truncation)", () => {
    const txs = [
      tx(50000, "cà phê", "Ăn uống", "2026-06-18T03:00:00Z"),
      tx(30000, "trà sữa", "Ăn uống", "2026-06-18T05:00:00Z"),
      tx(120000, "grab", "Đi lại", "2026-06-18T06:00:00Z"),
    ];
    const out = formatExpenseReport("hôm nay", txs);
    expect(out).toContain("cà phê");
    expect(out).toContain("trà sữa");
    expect(out).toContain("grab");
    expect(out).toContain("18/06"); // VN-formatted date
  });

  it("breaks down by category", () => {
    const txs = [
      tx(50000, "cà phê", "Ăn uống", "2026-06-18T03:00:00Z"),
      tx(30000, "trà sữa", "Ăn uống", "2026-06-18T05:00:00Z"),
      tx(120000, "grab", "Đi lại", "2026-06-18T06:00:00Z"),
    ];
    const out = formatExpenseReport("hôm nay", txs);
    expect(out).toContain("Ăn uống");
    expect(out).toContain("Đi lại");
    expect(out).toContain(formatMoney(80000)); // Ăn uống = 50k + 30k
  });

  it("includes a budget usage line when a budget is given", () => {
    const txs = [tx(500000, "x", "Khác", "2026-06-18T03:00:00Z")];
    const out = formatExpenseReport("tháng này", txs, { amount: 1000000 });
    expect(out).toContain("50%");
  });
});
