import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { HttpError } from "../middlewares/error.middleware";
import * as botManager from "../services/bot-manager.service";
import * as verification from "../services/bot-verification.service";
import * as zaloApi from "../utils/zalo-api";
import { logger } from "../utils/logger";

export const connectBot = async (req: AuthRequest, res: Response) => {
  const { botToken: rawToken } = req.body as { botToken: string };
  const botToken = rawToken.trim();

  const sub = await prisma.subscription.findUnique({
    where: { userId: req.userId! },
  });
  if (!sub || sub.status !== "ACTIVE") {
    throw new HttpError(403, "Cần có gói đang hoạt động để kết nối bot");
  }

  let botInfo;
  try {
    botInfo = await zaloApi.getMe(botToken);
  } catch (err) {
    throw new HttpError(400, "Kết nối bot thất bại, kiểm tra lại bot token", {
      details: err instanceof Error ? err.message : String(err),
    });
  }

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

  const started = await botManager.startBot(req.userId!, botToken, botConfig.id);
  if (!started) {
    throw new HttpError(500, "Không khởi động được bot");
  }

  const { verifyId, code, expiresAt } = verification.createPendingVerification({
    userId: req.userId!,
    botToken,
    botConfigId: botConfig.id,
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
};

export const verifyBotOwnership = async (req: AuthRequest, res: Response) => {
  const { verifyId } = req.body as { verifyId: string };

  const pending = verification.getVerification(verifyId);

  if (!pending) {
    throw new HttpError(404, "Phiên xác minh không tồn tại hoặc đã hết hạn");
  }

  if (pending.userId !== req.userId) {
    throw new HttpError(403, "Bạn không có quyền truy cập");
  }

  if (pending.expiresAt < new Date()) {
    verification.removeVerification(verifyId);
    botManager.stopBot(pending.userId);
    throw new HttpError(410, "Mã xác minh đã hết hạn, vui lòng kết nối lại bot");
  }

  if (!pending.verified) {
    res.json({
      verified: false,
      message: "Chưa nhận được mã xác minh. Hãy gửi mã tới bot trên Zalo.",
    });
    return;
  }

  await prisma.botConfig.update({
    where: { id: pending.botConfigId },
    data: { isActive: true },
  });

  verification.removeVerification(verifyId);

  const botConfig = await prisma.botConfig.findUnique({
    where: { id: pending.botConfigId },
    select: { id: true, isActive: true, connectedAt: true, createdAt: true },
  });

  res.json({
    verified: true,
    botConfig,
    mode: botManager.getBotRuntimeMode(),
    webhookUrl:
      botManager.getBotRuntimeMode() === "webhook"
        ? botManager.getBotWebhookUrl(pending.botConfigId)
        : null,
    message: "Xác minh thành công! Bot đã được kết nối.",
  });
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
      logger.warn({ err, userId: req.userId }, "Failed to delete webhook");
    }
  }

  await prisma.botConfig.update({
    where: { userId: req.userId! },
    data: { isActive: false },
  });

  res.json({ message: "Đã ngắt kết nối bot" });
};

export const botStatus = async (req: AuthRequest, res: Response) => {
  const config = await prisma.botConfig.findUnique({
    where: { userId: req.userId! },
    select: { id: true, isActive: true, connectedAt: true, createdAt: true },
  });

  const running = botManager.isBotRunning(req.userId!);

  res.json({
    config,
    running,
    polling: running, // backward compat
    mode: botManager.getBotRuntimeMode(),
    webhookUrl:
      config && botManager.getBotRuntimeMode() === "webhook"
        ? botManager.getBotWebhookUrl(config.id)
        : null,
  });
};
