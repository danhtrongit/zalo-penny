import { formatMoney } from "./helpers";
import { vnDateStr } from "../../utils/vn-time";

export interface ReportTx {
  date: Date;
  description: string;
  category: string;
  amount: number;
}

/**
 * Build a deterministic, exact expense report from DB rows. Numbers are summed
 * here (integer VND) and rendered verbatim — they are NEVER passed back through
 * the LLM, which was rounding/dropping/restating figures. Every transaction is
 * itemized (no silent truncation).
 */
export function formatExpenseReport(
  label: string,
  transactions: ReportTx[],
  budget?: { amount: number } | null
): string {
  if (transactions.length === 0) {
    return `📊 Chi tiêu ${label}\n\nKhông có giao dịch nào.`;
  }

  const total = transactions.reduce((s, t) => s + t.amount, 0);

  const cats: Record<string, number> = {};
  for (const t of transactions) cats[t.category] = (cats[t.category] || 0) + t.amount;
  const catLines = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `• ${cat}: ${formatMoney(amt)}`);

  const itemLines = [...transactions]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((t) => {
      const [, mm, dd] = vnDateStr(t.date).split("-");
      return `${dd}/${mm} ${t.description}: ${formatMoney(t.amount)} [${t.category}]`;
    });

  const out = [
    `📊 Chi tiêu ${label}`,
    `Tổng: ${formatMoney(total)} (${transactions.length} giao dịch)`,
  ];
  if (budget && budget.amount > 0) {
    out.push(
      `Ngân sách tháng: ${formatMoney(budget.amount)} — đã dùng ${Math.round((total / budget.amount) * 100)}%`
    );
  }
  out.push("", "Theo danh mục:", ...catLines, "", "Chi tiết:", ...itemLines);
  return out.join("\n");
}
