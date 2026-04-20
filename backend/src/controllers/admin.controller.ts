import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as zaloApi from "../utils/zalo-api";
import * as botManager from "../services/bot-manager.service";
import { buildSystemPrompt } from "../services/persona.service";
import * as aiService from "../services/ai.service";

export const listUsers = async (req: AuthRequest, res: Response) => {
  const { page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: parseInt(limit as string),
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
    page: parseInt(page as string),
    totalPages: Math.ceil(total / parseInt(limit as string)),
  });
};

export const broadcastMessage = async (req: AuthRequest, res: Response) => {
  const { message, personalized } = req.body;

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const configs = await prisma.botConfig.findMany({
    where: { isActive: true },
    include: {
      user: {
        include: {
          persona: true,
          subscription: true,
        },
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
      } catch {
        failed++;
      }
    }
  }

  res.json({ sent, failed });
};
