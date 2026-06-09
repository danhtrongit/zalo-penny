import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import { releaseAssignment } from "./bot-pool.service";
import { stopBot } from "./bot-manager.service";
import { buildSystemPrompt } from "./persona.service";
import { buildPersonaNotice } from "./notice.service";

const EXPIRY_PROMPT =
  "Viết MỘT tin nhắn ngắn (1-2 câu) báo nhẹ nhàng rằng gói đăng ký của người dùng vừa hết hạn và mời họ gia hạn để tiếp tục sử dụng đầy đủ. Đúng giọng persona. KHÔNG bịa số liệu/số tiền, KHÔNG tự chèn đường link. Chỉ trả về nội dung tin nhắn.";

export const EXPIRY_FALLBACK =
  "Gói của bạn vừa hết hạn rồi 😔 Gia hạn để tiếp tục sử dụng đầy đủ nhé!";

/**
 * Best-effort proactive message to a user whose subscription just expired.
 * Sent to every onboarded ZaloUser of that app-user, via that user's serving
 * bot. Never throws — failures are logged so the sweep continues.
 */
export async function sendExpiryNotice(userId: string): Promise<void> {
  const recipients = await prisma.zaloUser.findMany({
    where: { userId, isOnboarded: true },
    select: { zaloUserId: true, botConfigId: true },
  });
  if (recipients.length === 0) return;

  const configIds = [...new Set(recipients.map((r) => r.botConfigId))];
  const configs = await prisma.botConfig.findMany({
    where: { id: { in: configIds } },
    select: { id: true, botToken: true },
  });
  const tokenById = new Map(configs.map((c) => [c.id, c.botToken]));

  const persona = await prisma.persona.findUnique({ where: { userId } });
  const systemPrompt = buildSystemPrompt(
    persona || { style: "FRIEND", tease: 3, serious: 3, frugal: 3, emoji: 3, displayName: null }
  );
  const text = await buildPersonaNotice(EXPIRY_PROMPT, EXPIRY_FALLBACK, systemPrompt);

  for (const r of recipients) {
    const token = tokenById.get(r.botConfigId);
    if (!token) continue;
    try {
      await zaloApi.sendMessage(token, r.zaloUserId, text);
    } catch (err) {
      logger.warn({ err, userId, zaloUserId: r.zaloUserId }, "Expiry notice send failed");
    }
  }
}

/**
 * Transition ACTIVE subscriptions past their endDate to EXPIRED and free the
 * bot slot so the pool can be reused. Notifies the user (best-effort) BEFORE
 * stopping an OWNED bot so the message can still be delivered.
 */
export async function sweepExpiredSubscriptions() {
  const now = new Date();
  const expired = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    include: { user: { include: { botConfig: true } } },
  });

  for (const sub of expired) {
    await sendExpiryNotice(sub.userId).catch((err) =>
      logger.warn({ err, userId: sub.userId }, "Expiry notice failed")
    );
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED" },
    });
    await releaseAssignment(sub.userId);
    const owned = sub.user?.botConfig;
    if (owned) stopBot(owned.id);
    logger.info(
      { subscriptionId: sub.id, userId: sub.userId },
      "Subscription expired + bot slot released"
    );
  }

  if (expired.length) {
    logger.info({ count: expired.length }, "Expiry sweep done");
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startExpirySweep(intervalMs = 60 * 60 * 1000) {
  if (timer) return;
  timer = setInterval(() => {
    sweepExpiredSubscriptions().catch((err) =>
      logger.error({ err }, "Expiry sweep failed")
    );
  }, intervalMs);
  timer.unref();
}
