import prisma from "../../config/prisma";
import * as zaloApi from "../../utils/zalo-api";
import { logger } from "../../utils/logger";

/**
 * Pool bots are shared by up to N app-users, so an incoming Zalo message can't
 * be attributed by bot owner. The first time an unlinked Zalo account messages
 * a pool bot it must send its one-time link code (shown on the web). On match we
 * create the ZaloUser → app-user mapping and flip the assignment to LINKED.
 *
 * Returns the linked app userId on success, or null otherwise (and replies to
 * the user explaining what to do).
 */
export async function tryLinkPoolUser(
  botConfigId: string,
  botToken: string,
  zaloUserId: string,
  displayName: string | undefined,
  text: string,
  chatId: string
): Promise<string | null> {
  const code = text.trim().toUpperCase();
  const assignment = await prisma.botAssignment.findFirst({
    where: { botConfigId, status: "PENDING_LINK", linkCode: code },
  });

  if (!assignment) {
    await zaloApi.sendMessage(
      botToken,
      chatId,
      "Chào bạn! Để bắt đầu, hãy gửi đúng MÃ LIÊN KẾT hiển thị trên web (dạng PENNY-XXXX) cho mình nhé."
    );
    return null;
  }

  // One Zalo account links to exactly one app-user per bot.
  const dupe = await prisma.zaloUser.findUnique({
    where: { zaloUserId_botConfigId: { zaloUserId, botConfigId } },
  });
  if (dupe) {
    await zaloApi.sendMessage(
      botToken,
      chatId,
      "Tài khoản Zalo này đã được liên kết với một tài khoản khác rồi."
    );
    return null;
  }

  await prisma.$transaction([
    prisma.zaloUser.create({
      data: { zaloUserId, botConfigId, userId: assignment.userId, displayName },
    }),
    prisma.botAssignment.update({
      where: { id: assignment.id },
      data: { status: "LINKED", linkedZaloUserId: zaloUserId, linkedAt: new Date() },
    }),
  ]);

  logger.info({ botConfigId, userId: assignment.userId }, "Pool user linked");
  return assignment.userId;
}
