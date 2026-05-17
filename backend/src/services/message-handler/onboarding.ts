import prisma from "../../config/prisma";
import { ConversationSession } from "../conversation-state.service";
import { sendTrackedMessage } from "./send";

export async function getOrCreateZaloUser(
  zaloUserId: string,
  userId: string,
  botConfigId: string,
  displayName?: string
) {
  const existing = await prisma.zaloUser.findUnique({
    where: { zaloUserId_botConfigId: { zaloUserId, botConfigId } },
  });
  if (existing) return existing;

  return prisma.zaloUser.create({
    data: { zaloUserId, botConfigId, userId, displayName },
  });
}

export async function startOnboarding(
  botToken: string,
  chatId: string,
  userId: string,
  zaloUserId: string,
  conversation: ConversationSession,
  displayName?: string
) {
  await prisma.persona.upsert({
    where: { userId },
    update: {},
    create: { userId, displayName },
  });

  await prisma.zaloUser.update({
    where: { id: zaloUserId },
    data: { isOnboarded: true },
  });

  const name = displayName || "bạn";
  await sendTrackedMessage(
    botToken,
    chatId,
    conversation,
    `Chào ${name}! Mình là Penny - trợ lý chi tiêu của bạn 💰\n\n` +
      "Bạn chỉ cần nhắn tự nhiên như:\n" +
      '- "ăn trưa 50k"\n' +
      '- "grab 45k"\n' +
      '- "rau 30k, cá 50k"\n\n' +
      "Penny sẽ tự hiểu và lưu lại cho bạn. Bắt đầu thôi!",
    "CHAT"
  );
}
