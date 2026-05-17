import prisma from "../../config/prisma";
import * as aiService from "../ai.service";
import { logger } from "../../utils/logger";
import { ConversationSession } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { formatMoney, shouldAwaitFollowUp } from "./helpers";
import { parseExpenseByRegex } from "./parsers";
import { ParsedExpense } from "./types";

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
    let expenses = preExtracted?.length ? preExtracted : null;

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
      if (expenses.length > 0) {
        logger.debug({ expenses }, "Regex fallback parsed");
      }
    }

    if (!Array.isArray(expenses) || expenses.length === 0) {
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        "Mình chưa nhận ra khoản chi nào. Bạn thử nhắn lại nhé!",
        "EXPENSE",
        true
      );
      return;
    }

    for (const exp of expenses) {
      await prisma.transaction.create({
        data: {
          userId,
          amount: exp.amount,
          description: exp.description,
          category: exp.category,
          date: new Date(exp.date),
          source: "TEXT",
        },
      });
    }

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    logger.info({ count: expenses.length, total }, "Expenses saved");

    let response = preExtracted?.length ? preResponse : undefined;
    if (!response) {
      const lines = expenses.map((e) => `  • ${e.description}: ${formatMoney(e.amount)}`);
      response = await aiService.generateChatResponse(
        `Đã ghi ${expenses.length} khoản, tổng ${formatMoney(total)}:\n${lines.join("\n")}\n\nHãy xác nhận ngắn gọn theo đúng persona.`,
        systemPrompt
      );
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
