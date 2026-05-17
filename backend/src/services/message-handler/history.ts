import prisma from "../../config/prisma";
import * as aiService from "../ai";
import { ConversationSession } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { formatMoney } from "./helpers";
import { DateFilter } from "./types";

export async function handleHistory(
  botToken: string,
  chatId: string,
  userId: string,
  systemPrompt: string,
  conversation: ConversationSession,
  dateFilter?: DateFilter
) {
  const where: { userId: string; date?: { gte: Date; lte: Date } } = { userId };

  if (dateFilter?.start) {
    where.date = {
      gte: new Date(dateFilter.start),
      lte: new Date(dateFilter.end + "T23:59:59.999Z"),
    };
  }

  const recent = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: dateFilter ? 50 : 10,
  });

  const periodLabel = dateFilter ? `từ ${dateFilter.start} đến ${dateFilter.end}` : "gần đây";

  if (recent.length === 0) {
    const noDataPrompt = `Người dùng hỏi giao dịch ${periodLabel} nhưng không có giao dịch nào. Trả lời theo persona.`;
    const response = await aiService.generateChatResponse(noDataPrompt, systemPrompt);
    await sendTrackedMessage(botToken, chatId, conversation, response, "HISTORY");
    return;
  }

  const total = recent.reduce((s, t) => s + t.amount, 0);
  const lines = recent.map((t) => {
    const d = t.date.toLocaleDateString("vi-VN");
    return `${d} - ${t.description}: ${formatMoney(t.amount)} [${t.category}]`;
  });

  const dataPrompt = [
    `Danh sách giao dịch ${periodLabel}:`,
    lines.join("\n"),
    `Tổng: ${formatMoney(total)}`,
    "",
    "Hãy trình bày danh sách này theo persona, giữ nguyên dữ liệu số, ngắn gọn dễ đọc.",
  ].join("\n");

  const response = await aiService.generateChatResponse(dataPrompt, systemPrompt);
  await sendTrackedMessage(botToken, chatId, conversation, response, "HISTORY");
}
