import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import { buildSystemPrompt } from "../services/persona.service";
import * as aiService from "../services/ai";

export const listUsers = async (req: AuthRequest, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        subscription: {
          select: { status: true, plan: { select: { name: true } }, endDate: true },
        },
        botConfig: { select: { isActive: true } },
      },
    }),
    prisma.user.count(),
  ]);

  res.json({
    data: users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
};

export const broadcastMessage = async (req: AuthRequest, res: Response) => {
  const { message, personalized } = req.body as {
    message: string;
    personalized?: boolean;
  };

  const configs = await prisma.botConfig.findMany({
    where: { isActive: true },
    include: {
      user: {
        include: { persona: true, subscription: true },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const config of configs) {
    if (config.user.subscription?.status !== "ACTIVE") continue;

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

  res.json({ sent, failed });
};
