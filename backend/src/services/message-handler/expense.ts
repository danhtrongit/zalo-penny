import prisma from "../../config/prisma";
import * as aiService from "../ai";
import { logger } from "../../utils/logger";
import { ConversationSession, rememberTransactions } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { formatMoney, shouldAwaitFollowUp } from "./helpers";
import {
  parseExpenseByRegex,
  normalizeParsedExpense,
  parseBulkExpenses,
  looksLikeBulkList,
  countUnpricedItemLines,
} from "./parsers";
import { ParsedExpense } from "./types";

const ddmm = (d: string) => {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
};

/** Honest, deterministic confirmation for a bulk paste — shows exactly what was
 *  saved (with dates) and flags any unpriced lines we skipped. */
function formatBulkConfirmation(expenses: ParsedExpense[], unpriced: number): string {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const lines = expenses.map((e) => `${ddmm(e.date)} ${e.description}: ${formatMoney(e.amount)}`);
  let msg = `📝 Đã ghi ${expenses.length} khoản (tổng ${formatMoney(total)}):\n${lines.join("\n")}`;
  if (unpriced > 0) {
    msg += `\n\n(${unpriced} dòng chưa có số tiền nên mình tạm bỏ qua — bạn ghi kèm số tiền giúp mình nhé.)`;
  }
  return msg;
}

export async function handleExpense(
  botToken: string,
  chatId: string,
  userId: string,
  text: string,
  systemPrompt: string,
  conversation: ConversationSession,
  historyContext: string,
  preExtracted?: ParsedExpense[],
  preResponse?: string
) {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // A multi-line, multi-date list ("16/6\n100k nc cam\n...") is parsed
    // deterministically — the AI collapses it into one wrong transaction and
    // ignores the per-line dates. Single/natural expenses keep the AI path.
    const bulk = looksLikeBulkList(text);
    let expenses: ParsedExpense[] | null;

    if (bulk) {
      expenses = parseBulkExpenses(text, today);
    } else {
      expenses = preExtracted?.length ? preExtracted : null;
      if (!expenses) {
        const result = await aiService.parseExpenseFromText(
          text,
          systemPrompt,
          historyContext || undefined
        );
        try {
          const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0) {
            expenses = parsed;
          }
        } catch {
          // AI parse failed, will try regex fallback
        }
      }
      if (!expenses || expenses.length === 0) {
        expenses = parseExpenseByRegex(text);
      }
    }

    // Sanitize before persisting — collapse newlines, default date/category.
    expenses = (expenses ?? [])
      .map((e) => normalizeParsedExpense(e as unknown as Record<string, unknown>, today))
      .filter((e): e is ParsedExpense => e !== null);

    const unpriced = bulk ? countUnpricedItemLines(text) : 0;

    if (!Array.isArray(expenses) || expenses.length === 0) {
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        unpriced > 0
          ? "Mình chưa thấy số tiền ở các dòng bạn gửi. Bạn ghi kèm số tiền nhé, ví dụ: “20/6 cà phê 35k”."
          : "Mình chưa nhận ra khoản chi nào. Bạn thử nhắn lại nhé!",
        "EXPENSE",
        true
      );
      return;
    }

    const created = [];
    for (const exp of expenses) {
      const tx = await prisma.transaction.create({
        data: {
          userId,
          amount: exp.amount,
          description: exp.description,
          category: exp.category,
          date: new Date(exp.date),
          source: "TEXT",
        },
      });
      created.push({ id: tx.id, description: tx.description, amount: tx.amount, category: tx.category });
    }
    // Remember what was just entered so "sửa/xoá cái vừa ghi" targets it.
    await rememberTransactions(conversation, created);

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    logger.info({ count: expenses.length, total, bulk }, "Expenses saved");

    let response: string;
    if (bulk) {
      response = formatBulkConfirmation(expenses, unpriced);
    } else {
      response = preExtracted?.length && preResponse ? preResponse : "";
      if (!response) {
        const lines = expenses.map((e) => `  • ${e.description}: ${formatMoney(e.amount)}`);
        response = await aiService.generateChatResponse(
          `Đã ghi ${expenses.length} khoản, tổng ${formatMoney(total)}:\n${lines.join("\n")}\n\nHãy xác nhận ngắn gọn theo đúng persona.`,
          systemPrompt
        );
      }
    }

    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      response,
      "CHAT",
      shouldAwaitFollowUp(response)
    );
  } catch (err) {
    logger.error({ err }, "Expense handling error");
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      "Có lỗi khi xử lý. Bạn thử lại nhé!",
      "EXPENSE"
    );
  }
}
