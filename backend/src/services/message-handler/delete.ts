import prisma from "../../config/prisma";
import * as aiService from "../ai";
import { logger } from "../../utils/logger";
import { ConversationSession } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";
import { formatMoney } from "./helpers";
import { DeleteTarget } from "./types";

export async function handleDelete(
  botToken: string,
  chatId: string,
  userId: string,
  systemPrompt: string,
  conversation: ConversationSession,
  deleteTarget?: DeleteTarget,
  preResponse?: string
) {
  try {
    const where: Record<string, unknown> = { userId };
    const conditions: string[] = [];

    if (deleteTarget?.amount) {
      where.amount = deleteTarget.amount;
      conditions.push(`amount=${deleteTarget.amount}`);
    }

    if (deleteTarget?.description) {
      where.description = {
        contains: deleteTarget.description,
        mode: "insensitive",
      };
      conditions.push(`desc~"${deleteTarget.description}"`);
    }

    const candidates = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (candidates.length === 0) {
      const notFoundPrompt =
        "Người dùng muốn xoá giao dịch nhưng không tìm thấy khoản nào khớp. Trả lời theo persona.";
      const response = await aiService.generateChatResponse(notFoundPrompt, systemPrompt);
      await sendTrackedMessage(botToken, chatId, conversation, response, "DELETE");
      return;
    }

    const toDelete = candidates[0];
    await prisma.transaction.delete({ where: { id: toDelete.id } });

    logger.info(
      {
        id: toDelete.id,
        description: toDelete.description,
        amount: toDelete.amount,
        matchConditions: conditions,
      },
      "Transaction deleted"
    );

    let response = preResponse;
    if (!response) {
      const deletePrompt = `Đã xoá giao dịch "${toDelete.description}" ${formatMoney(toDelete.amount)}. Xác nhận ngắn gọn theo persona.`;
      response = await aiService.generateChatResponse(deletePrompt, systemPrompt);
    }

    await sendTrackedMessage(botToken, chatId, conversation, response, "CHAT");
  } catch (err) {
    logger.error({ err }, "Delete handling error");
    await sendTrackedMessage(
      botToken,
      chatId,
      conversation,
      "Có lỗi khi xoá. Bạn thử lại nhé!",
      "CHAT"
    );
  }
}
