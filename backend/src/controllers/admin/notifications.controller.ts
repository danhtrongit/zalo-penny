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

  const configs = await prisma.botConfig.findMany({
    where: { isActive: true },
    include: {
      user: {
        include: {
          persona: true,
          subscription: { include: { plan: true } },
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const config of configs) {
    if (config.user.subscription?.status !== "ACTIVE") continue;
    if (
      planSlugs?.length &&
      !planSlugs.includes(config.user.subscription.plan.slug)
    ) {
      continue;
    }

    const zaloUsers = await prisma.zaloUser.findMany({
      where: { botConfigId: config.id },
    });

    for (const zu of zaloUsers) {
      try {
        let text = message;
        if (personalized && config.user.persona) {
          const systemPrompt = buildSystemPrompt(config.user.persona);
          text = await aiService.generateChatResponse(
            `Chuyển tin nhắn sau sang đúng persona của mình: "${message}"`,
            systemPrompt
          );
        }
        await zaloApi.sendMessage(config.botToken, zu.zaloUserId, text);
        sent++;
      } catch (err) {
        logger.warn(
          { err, userId: config.userId, zaloUserId: zu.zaloUserId },
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
