import { Response } from "express";
import crypto from "crypto";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as botManager from "../services/bot-manager.service";
import * as zaloApi from "../utils/zalo-api";

// In-memory verification store
// Key: verifyId (random UUID), Value: verification details
export interface PendingVerification {
  code: string;
  userId: string;
  botToken: string;
  botConfigId: string;
  expiresAt: Date;
  verified: boolean;
}

export const pendingVerifications = new Map<string, PendingVerification>();

// Clean up expired verifications every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, v] of pendingVerifications) {
    if (v.expiresAt < now) {
      pendingVerifications.delete(key);
    }
  }
}, 5 * 60 * 1000);

function generateVerifyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateVerifyId(): string {
  return crypto.randomUUID();
}

export const connectBot = async (req: AuthRequest, res: Response) => {
  const rawToken = req.body.botToken;

  if (!rawToken) {
    res.status(400).json({ error: "botToken is required" });
    return;
  }

  const botToken = rawToken.trim();

  const sub = await prisma.subscription.findUnique({
    where: { userId: req.userId! },
  });
  if (!sub || sub.status !== "ACTIVE") {
    res.status(403).json({ error: "Active subscription required" });
    return;
  }

  try {
    const botInfo = await zaloApi.getMe(botToken);

    // Generate verification code
    const code = generateVerifyCode();
    const verifyId = generateVerifyId();

    // Upsert botConfig with isActive = false (pending verification)
    const botConfig = await prisma.botConfig.upsert({
      where: { userId: req.userId! },
      update: { botToken, isActive: false, connectedAt: new Date() },
      create: {
        userId: req.userId!,
        botToken,
        isActive: false,
        connectedAt: new Date(),
      },
    });

    // Start the bot runtime temporarily (to receive messages for verification)
    const started = await botManager.startBot(
      req.userId!,
      botToken,
      botConfig.id
    );
    if (!started) {
      throw new Error("Failed to start bot runtime");
    }

    // Store pending verification (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    pendingVerifications.set(verifyId, {
      code,
      userId: req.userId!,
      botToken,
      botConfigId: botConfig.id,
      expiresAt,
      verified: false,
    });

    res.json({
      pendingVerification: true,
      verifyCode: code,
      verifyId,
      expiresAt,
      botInfo,
      message: "Gửi mã này tới bot của bạn trên Zalo để xác nhận quyền sở hữu",
      mode: botManager.getBotRuntimeMode(),
      webhookUrl:
        botManager.getBotRuntimeMode() === "webhook"
          ? botManager.getBotWebhookUrl(botConfig.id)
          : null,
    });
  } catch (err: any) {
    res.status(400).json({
      error: "Failed to connect bot",
      details: err.message,
    });
  }
};

export const verifyBotOwnership = async (req: AuthRequest, res: Response) => {
  const { verifyId } = req.body;

  if (!verifyId) {
    res.status(400).json({ error: "verifyId is required" });
    return;
  }

  const verification = pendingVerifications.get(verifyId);

  if (!verification) {
    res.status(404).json({ error: "Verification not found or expired" });
    return;
  }

  if (verification.userId !== req.userId) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  if (verification.expiresAt < new Date()) {
    pendingVerifications.delete(verifyId);
    // Stop the temporary bot runtime
    botManager.stopBot(verification.userId);
    res.status(410).json({ error: "Verification expired. Please reconnect the bot." });
    return;
  }

  if (!verification.verified) {
    res.json({
      verified: false,
      message: "Chưa nhận được mã xác minh. Hãy gửi mã tới bot trên Zalo.",
    });
    return;
  }

  // Verification successful! Mark bot as active
  try {
    await prisma.botConfig.update({
      where: { id: verification.botConfigId },
      data: { isActive: true },
    });

    // Clean up verification entry
    pendingVerifications.delete(verifyId);

    const botConfig = await prisma.botConfig.findUnique({
      where: { id: verification.botConfigId },
      select: { id: true, isActive: true, connectedAt: true, createdAt: true },
    });

    res.json({
      verified: true,
      botConfig,
      mode: botManager.getBotRuntimeMode(),
      webhookUrl:
        botManager.getBotRuntimeMode() === "webhook"
          ? botManager.getBotWebhookUrl(verification.botConfigId)
          : null,
      message: "Xác minh thành công! Bot đã được kết nối.",
    });
  } catch (err: any) {
    res.status(500).json({
      error: "Failed to activate bot",
      details: err.message,
    });
  }
};

export const disconnectBot = async (req: AuthRequest, res: Response) => {
  const config = await prisma.botConfig.findUnique({
    where: { userId: req.userId! },
    select: { botToken: true },
  });

  botManager.stopBot(req.userId!);

  if (config?.botToken) {
    try {
      await zaloApi.deleteWebhook(config.botToken);
    } catch (err) {
      console.error(`Failed to delete webhook for user ${req.userId!}:`, err);
    }
  }

  await prisma.botConfig.update({
    where: { userId: req.userId! },
    data: { isActive: false },
  });

  res.json({ message: "Bot disconnected" });
};

export const botStatus = async (req: AuthRequest, res: Response) => {
  const config = await prisma.botConfig.findUnique({
    where: { userId: req.userId! },
    select: { id: true, isActive: true, connectedAt: true, createdAt: true },
  });

  res.json({
    config,
    running: botManager.isBotRunning(req.userId!),
    // Keep `polling` for backward compat with any existing clients
    polling: botManager.isBotRunning(req.userId!),
    mode: botManager.getBotRuntimeMode(),
    webhookUrl:
      config && botManager.getBotRuntimeMode() === "webhook"
        ? botManager.getBotWebhookUrl(config.id)
        : null,
  });
};
