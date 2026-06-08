import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../middlewares/error.middleware";
import { logger } from "../../utils/logger";
import * as zaloApi from "../../utils/zalo-api";
import { buildSystemPrompt } from "../../services/persona.service";
import * as aiService from "../../services/ai";
import { logAdminAction } from "../../services/admin-audit.service";

interface BroadcastInput {
  message: string;
  personalized?: boolean;
  // Optional filter — broadcast only to users with these plan slugs
  planSlugs?: string[];
}

/**
 * POST /api/admin/notifications/broadcast
 * Sends `message` to every active bot's subscribers. When `personalized=true`,
 * the message is rewritten per recipient using their persona.
 */
export const broadcast = async (req: AuthRequest, res: Response) => {
  const { message, personalized, planSlugs } = req.body as BroadcastInput;

  // Attribute per Zalo recipient (ZaloUser.userId), not per bot owner — a pool
  // bot has many app-users, each with their own subscription + persona.
  const configs = await prisma.botConfig.findMany({
    where: { isActive: true },
    select: { id: true, botToken: true },
  });

  type RecipientUser = Awaited<ReturnType<typeof loadUser>>;
  const userCache = new Map<string, RecipientUser>();
  async function loadUser(userId: string) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      include: { persona: true, subscription: { include: { plan: true } } },
    });
    return u;
  }
  async function getUser(userId: string) {
    if (userCache.has(userId)) return userCache.get(userId)!;
    const u = await loadUser(userId);
    userCache.set(userId, u);
    return u;
  }

  let sent = 0;
  let failed = 0;

  for (const config of configs) {
    const zaloUsers = await prisma.zaloUser.findMany({
      where: { botConfigId: config.id },
    });

    for (const zu of zaloUsers) {
      const u = await getUser(zu.userId);
      if (!u || u.subscription?.status !== "ACTIVE") continue;
      if (planSlugs?.length && !planSlugs.includes(u.subscription.plan.slug)) {
        continue;
      }

      try {
        let text = message;
        if (personalized && u.persona) {
          const systemPrompt = buildSystemPrompt(u.persona);
          text = await aiService.generateChatResponse(
            `Chuyển tin nhắn sau sang đúng persona của mình: "${message}"`,
            systemPrompt
          );
        }
        await zaloApi.sendMessage(config.botToken, zu.zaloUserId, text);
        sent++;
      } catch (err) {
        logger.warn(
          { err, userId: zu.userId, zaloUserId: zu.zaloUserId },
          "Broadcast send failed"
        );
        failed++;
      }
    }
  }

  await logAdminAction({
    adminId: req.userId!,
    action: "NOTIFICATION_BROADCAST",
    payload: {
      messagePreview: message.slice(0, 200),
      personalized: !!personalized,
      planSlugs: planSlugs ?? null,
      sent,
      failed,
    },
    summary: `Broadcast: sent=${sent}, failed=${failed}`,
  });

  res.json({ sent, failed });
};

/**
 * POST /api/admin/notifications/send
 * Send a message to a chosen set of users (by app userId). Resolves each user's
 * Zalo identity via their ZaloUser rows so it works for both owned and pool bots.
 * When personalized=true, rewrites per recipient using their persona.
 */
export const sendToUsers = async (req: AuthRequest, res: Response) => {
  const { userIds, message, personalized } = req.body as {
    userIds: string[];
    message: string;
    personalized?: boolean;
  };

  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    const zaloUsers = await prisma.zaloUser.findMany({ where: { userId } });
    if (zaloUsers.length === 0) {
      failed++;
      continue;
    }

    let text = message;
    if (personalized) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        include: { persona: true },
      });
      if (u?.persona) {
        try {
          const systemPrompt = buildSystemPrompt(u.persona);
          text = await aiService.generateChatResponse(
            `Chuyển tin nhắn sau sang đúng persona của mình: "${message}"`,
            systemPrompt
          );
        } catch (err) {
          logger.warn({ err, userId }, "sendToUsers persona rewrite failed");
          text = message;
        }
      }
    }

    for (const zu of zaloUsers) {
      const config = await prisma.botConfig.findUnique({
        where: { id: zu.botConfigId },
        select: { botToken: true },
      });
      if (!config) {
        failed++;
        continue;
      }
      try {
        await zaloApi.sendMessage(config.botToken, zu.zaloUserId, text);
        sent++;
      } catch (err) {
        logger.warn({ err, userId, zaloUserId: zu.zaloUserId }, "sendToUsers send failed");
        failed++;
      }
    }
  }

  await logAdminAction({
    adminId: req.userId!,
    action: "NOTIFICATION_BROADCAST",
    payload: {
      messagePreview: message.slice(0, 200),
      personalized: !!personalized,
      userCount: userIds.length,
      sent,
      failed,
    },
    summary: `Send to ${userIds.length} users: sent=${sent}, failed=${failed}`,
  });

  res.json({ sent, failed });
};

/**
 * POST /api/admin/notifications/send-to/:userId
 * Send a one-off message to a single user via their bot config.
 */
export const sendToUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId as string;
  const { message } = req.body as { message: string };

  const config = await prisma.botConfig.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!config?.isActive) throw new HttpError(404, "Người dùng chưa kết nối bot");

  const zaloUsers = await prisma.zaloUser.findMany({
    where: { botConfigId: config.id },
  });

  let sent = 0;
  let failed = 0;
  for (const zu of zaloUsers) {
    try {
      await zaloApi.sendMessage(config.botToken, zu.zaloUserId, message);
      sent++;
    } catch (err) {
      logger.warn({ err, zaloUserId: zu.zaloUserId }, "sendToUser failed");
      failed++;
    }
  }

  res.json({ sent, failed });
};
