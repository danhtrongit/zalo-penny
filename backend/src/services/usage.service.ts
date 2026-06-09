import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import { FREE_DAILY_MESSAGE_LIMIT } from "../config/constants";
import { vnDateStr, startOfVnDay } from "../utils/vn-time";
import { buildPersonaNotice } from "./notice.service";

const FREE_LIMIT_PROMPT =
  "Viết MỘT tin nhắn ngắn (1-2 câu) báo nhẹ nhàng rằng người dùng đã dùng hết số tin nhắn miễn phí trong ngày hôm nay và mời họ nâng cấp gói để nhắn không giới hạn. Đúng giọng persona, thân thiện. KHÔNG bịa số liệu/số tiền, KHÔNG tự chèn đường link. Chỉ trả về nội dung tin nhắn.";

export const FREE_LIMIT_FALLBACK =
  "Bạn đã dùng hết số tin nhắn miễn phí trong hôm nay rồi 😊 Mai quay lại nhé!";

/**
 * Free-tier gate. ACTIVE subscribers are unlimited. Everyone else gets
 * FREE_DAILY_MESSAGE_LIMIT messages per VN day; the first message over the limit
 * receives exactly one persona-styled upgrade notice (claimed atomically so
 * concurrent messages can't double-send), and all over-limit messages are blocked.
 */
export async function enforceFreeTier(opts: {
  userId: string;
  botToken: string;
  chatId: string;
  systemPrompt: string;
  now?: Date;
}): Promise<{ blocked: boolean }> {
  const { userId, botToken, chatId, systemPrompt, now = new Date() } = opts;

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });
  if (sub?.status === "ACTIVE") return { blocked: false };

  const date = startOfVnDay(vnDateStr(now));
  const usage = await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  if (usage.count <= FREE_DAILY_MESSAGE_LIMIT) return { blocked: false };

  // Over the limit. Claim the once-per-day notice atomically: a single
  // conditional UPDATE means exactly one concurrent caller wins and sends.
  const claim = await prisma.dailyUsage.updateMany({
    where: { userId, date, limitNotifiedAt: null },
    data: { limitNotifiedAt: now },
  });
  if (claim.count === 1) {
    try {
      const text = await buildPersonaNotice(
        FREE_LIMIT_PROMPT,
        FREE_LIMIT_FALLBACK,
        systemPrompt
      );
      await zaloApi.sendMessage(botToken, chatId, text);
    } catch (err) {
      logger.warn({ err, userId }, "Free-tier limit notice send failed");
    }
  }
  return { blocked: true };
}
