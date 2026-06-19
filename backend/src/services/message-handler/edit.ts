import prisma from "../../config/prisma";
import { logger } from "../../utils/logger";
import {
  ConversationSession,
  rememberTransactions,
} from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { formatMoney } from "./helpers";
import { vnDateStr } from "../../utils/vn-time";
import { EditTarget } from "./types";
import { resolveTransactionTarget } from "./tx-target";

function ddmm(date: Date): string {
  const [, mm, dd] = vnDateStr(date).split("-");
  return `${dd}/${mm}`;
}

export async function handleEdit(
  botToken: string,
  chatId: string,
  userId: string,
  conversation: ConversationSession,
  editTarget?: EditTarget
) {
  try {
    const target = await resolveTransactionTarget(userId, editTarget?.match, conversation);
    if (!target) {
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        "Mình chưa rõ bạn muốn sửa giao dịch nào. Nhắn rõ giúp mình nhé, vd: \"sửa cà phê 30k thành 50k\".",
        "CHAT"
      );
      return;
    }

    const changes = editTarget?.changes ?? {};
    const data: { amount?: number; description?: string; category?: string } = {};
    if (typeof changes.amount === "number" && changes.amount > 0) data.amount = changes.amount;
    if (changes.description?.trim()) data.description = changes.description.trim();
    if (changes.category?.trim()) data.category = changes.category.trim();

    if (Object.keys(data).length === 0) {
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        "Bạn muốn sửa thành gì? Nhắn rõ số tiền / mô tả / danh mục mới giúp mình nhé.",
        "CHAT"
      );
      return;
    }

    const before = { description: target.description, amount: target.amount };
    const updated = await prisma.transaction.update({ where: { id: target.id }, data });
    await rememberTransactions(conversation, [
      {
        id: updated.id,
        description: updated.description,
        amount: updated.amount,
        category: updated.category,
      },
    ]);
    logger.info({ id: updated.id, changes: data }, "Transaction edited");

    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      `Đã sửa (${ddmm(updated.date)}): "${before.description}" ${formatMoney(before.amount)} → "${updated.description}" ${formatMoney(updated.amount)} [${updated.category}]`,
      "CHAT"
    );
  } catch (err) {
    logger.error({ err }, "Edit handling error");
    await sendTrackedMessage(botToken, chatId, conversation, "Có lỗi khi sửa. Bạn thử lại nhé!", "CHAT");
  }
}
