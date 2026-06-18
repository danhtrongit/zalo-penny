import prisma from "../../config/prisma";
import { ConversationSession } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { DateFilter } from "./types";
import { resolveVnRange, startOfVnDay, vnDateStr, type VnRange } from "../../utils/vn-time";
import { formatExpenseReport } from "./report-format";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Resolve the report window deterministically: a Vietnamese phrase in the user
 * text wins; otherwise fall back to the AI dateFilter (re-anchored to VN days);
 * otherwise null so each handler can apply its own default. Never lets the AI
 * do the date math.
 */
export function resolveReportRange(
  text: string,
  dateFilter: DateFilter | undefined,
  now: Date
): VnRange | null {
  const byPhrase = resolveVnRange(text, now);
  if (byPhrase) return byPhrase;
  if (dateFilter?.start && dateFilter?.end) {
    return {
      start: startOfVnDay(dateFilter.start),
      // dateFilter.end is inclusive → make the upper bound exclusive (+1 VN day).
      end: new Date(startOfVnDay(dateFilter.end).getTime() + DAY_MS),
      label: `từ ${dateFilter.start} đến ${dateFilter.end}`,
    };
  }
  return null;
}

/** Current VN calendar month as a half-open range. */
function currentVnMonth(now: Date): VnRange {
  const [y, m] = vnDateStr(now).split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: startOfVnDay(`${y}-${pad(m)}-01`),
    end: startOfVnDay(m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`),
    label: `tháng ${m}/${y}`,
  };
}

export async function handleReport(
  botToken: string,
  chatId: string,
  userId: string,
  conversation: ConversationSession,
  text: string,
  dateFilter?: DateFilter
) {
  const now = new Date();
  const range = resolveReportRange(text, dateFilter, now) ?? currentVnMonth(now);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: range.start, lt: range.end } },
    orderBy: { date: "asc" },
  });
  const budget = await prisma.budget.findFirst({ where: { userId, type: "MONTHLY" } });

  const message = formatExpenseReport(range.label, transactions, budget);
  await sendTrackedMessage(botToken, chatId, conversation, message, "REPORT");
}
