import prisma from "../../config/prisma";
import { ConversationSession } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { DateFilter } from "./types";
import { startOfVnDay, vnDateStr, type VnRange } from "../../utils/vn-time";
import { resolveReportRange } from "./report";
import { formatExpenseReport } from "./report-format";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Last 30 VN days (inclusive of today) as a half-open range. */
function last30VnDays(now: Date): VnRange {
  const today = vnDateStr(now);
  return {
    start: new Date(startOfVnDay(today).getTime() - 29 * DAY_MS),
    end: new Date(startOfVnDay(today).getTime() + DAY_MS),
    label: "30 ngày qua",
  };
}

export async function handleHistory(
  botToken: string,
  chatId: string,
  userId: string,
  conversation: ConversationSession,
  text: string,
  dateFilter?: DateFilter
) {
  const now = new Date();
  const range = resolveReportRange(text, dateFilter, now) ?? last30VnDays(now);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: range.start, lt: range.end } },
    orderBy: { date: "asc" },
  });

  const message = formatExpenseReport(range.label, transactions);
  await sendTrackedMessage(botToken, chatId, conversation, message, "HISTORY");
}
