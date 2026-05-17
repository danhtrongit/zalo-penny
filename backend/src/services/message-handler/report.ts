import prisma from "../../config/prisma";
import * as aiService from "../ai";
import { ConversationSession } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { formatMoney } from "./helpers";
import { DateFilter } from "./types";

export async function handleReport(
  botToken: string,
  chatId: string,
  userId: string,
  systemPrompt: string,
  conversation: ConversationSession,
  dateFilter?: DateFilter
) {
  const now = new Date();
  let transactions;
  let periodLabel: string;

  if (dateFilter?.start) {
    transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(dateFilter.start),
          lte: new Date(dateFilter.end + "T23:59:59.999Z"),
        },
      },
    });
    periodLabel = `từ ${dateFilter.start} đến ${dateFilter.end}`;
  } else {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    transactions = await prisma.transaction.findMany({
      where: { userId, date: { gte: startOfMonth } },
    });
    periodLabel = `tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  }

  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const categories: Record<string, number> = {};
  for (const t of transactions) {
    categories[t.category] = (categories[t.category] || 0) + t.amount;
  }
  const catLines = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `${cat}: ${formatMoney(amt)}`)
    .join(", ");

  const budget = await prisma.budget.findFirst({
    where: { userId, type: "MONTHLY" },
  });

  const dataPrompt = [
    `Dữ liệu báo cáo chi tiêu ${periodLabel}:`,
    `- Tổng: ${formatMoney(total)} (${transactions.length} giao dịch)`,
    catLines ? `- Theo danh mục: ${catLines}` : "- Không có giao dịch nào",
    budget
      ? `- Ngân sách tháng: ${formatMoney(budget.amount)}, đã dùng ${Math.round((total / budget.amount) * 100)}%`
      : "",
    "",
    "Hãy trình bày báo cáo này theo đúng persona, ngắn gọn, dễ đọc.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await aiService.generateChatResponse(dataPrompt, systemPrompt);
  await sendTrackedMessage(botToken, chatId, conversation, response, "REPORT");
}
