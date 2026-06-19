import prisma from "../../config/prisma";
import { logger } from "../../utils/logger";
import {
  ConversationSession,
  setPendingDelete,
  clearPendingDelete,
} from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { formatMoney } from "./helpers";
import { vnDateStr } from "../../utils/vn-time";
import { DeleteTarget } from "./types";
import { resolveTransactionTarget } from "./tx-target";

function ddmm(date: Date): string {
  const [, mm, dd] = vnDateStr(date).split("-");
  return `${dd}/${mm}`;
}

/**
 * Delete is destructive, so we never delete immediately. Resolve the target,
 * stash it as a pending delete, and ask the user to confirm. The confirmation
 * reply is handled by executePendingDelete (wired from the message handler).
 */
export async function handleDelete(
  botToken: string,
  chatId: string,
  userId: string,
  conversation: ConversationSession,
  deleteTarget?: DeleteTarget
) {
  try {
    const target = await resolveTransactionTarget(userId, deleteTarget, conversation);
    if (!target) {
      await sendTrackedMessage(
        botToken,
        chatId,
        conversation,
        "Mình không tìm thấy giao dịch nào khớp để xoá. Bạn nhắn rõ khoản cần xoá nhé.",
        "DELETE"
      );
      return;
    }

    await setPendingDelete(conversation, {
      id: target.id,
      description: target.description,
      amount: target.amount,
    });
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      `Bạn muốn xoá (${ddmm(target.date)}) "${target.description}" ${formatMoney(target.amount)}? Nhắn "xác nhận" để xoá hoặc "huỷ" để giữ lại.`,
      "DELETE"
    );
  } catch (err) {
    logger.error({ err }, "Delete handling error");
    await sendTrackedMessage(botToken, chatId, conversation, "Có lỗi khi xoá. Bạn thử lại nhé!", "CHAT");
  }
}

/** User declined the delete confirmation — keep the transaction. */
export async function cancelPendingDelete(
  botToken: string,
  chatId: string,
  conversation: ConversationSession
) {
  await clearPendingDelete(conversation);
  await sendTrackedMessage(botToken, chatId, conversation, "Ok, mình giữ lại giao dịch nhé.", "CHAT");
}

/** Carry out a delete the user has confirmed. Clears the pending state first. */
export async function executePendingDelete(
  botToken: string,
  chatId: string,
  userId: string,
  conversation: ConversationSession
) {
  const pending = conversation.state.pendingDelete;
  if (!pending) return;
  try {
    const tx = await prisma.transaction.findFirst({ where: { id: pending.id, userId } });
    await clearPendingDelete(conversation);
    if (!tx) {
      await sendTrackedMessage(botToken, chatId, conversation, "Giao dịch này không còn nữa.", "DELETE");
      return;
    }
    await prisma.transaction.delete({ where: { id: tx.id } });
    logger.info({ id: tx.id }, "Transaction deleted (confirmed)");
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      `Đã xoá (${ddmm(tx.date)}) "${tx.description}" ${formatMoney(tx.amount)}.`,
      "CHAT"
    );
  } catch (err) {
    logger.error({ err }, "Confirmed delete error");
    await clearPendingDelete(conversation);
    await sendTrackedMessage(botToken, chatId, conversation, "Có lỗi khi xoá. Bạn thử lại nhé!", "CHAT");
  }
}
