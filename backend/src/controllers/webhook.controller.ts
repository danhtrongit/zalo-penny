import { Request, Response } from "express";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { handleMessage } from "../services/message-handler";
import { ZaloUpdateResult } from "../utils/zalo-api";

interface ZaloWebhookPayload {
  ok?: boolean;
  result?: ZaloUpdateResult;
  event_name?: string;
  message?: ZaloUpdateResult["message"];
}

const parseWebhookPayload = (body: unknown): ZaloWebhookPayload | null => {
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as ZaloWebhookPayload;
    } catch {
      return null;
    }
  }

  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString("utf8")) as ZaloWebhookPayload;
    } catch {
      return null;
    }
  }

  if (typeof body === "object") {
    return body as ZaloWebhookPayload;
  }

  return null;
};

export const handleZaloWebhook = async (req: Request, res: Response) => {
  const secretToken = req.header("x-bot-api-secret-token");
  if (!env.zalo.webhookSecret || secretToken !== env.zalo.webhookSecret) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  const botConfigIdParam = req.params.botConfigId;
  const botConfigId = Array.isArray(botConfigIdParam)
    ? botConfigIdParam[0]
    : botConfigIdParam;

  if (!botConfigId) {
    res.status(400).json({ message: "Missing bot config id" });
    return;
  }

  const botConfig = await prisma.botConfig.findUnique({
    where: { id: botConfigId },
    select: {
      id: true,
      userId: true,
      botToken: true,
      isActive: true,
    },
  });

  if (!botConfig) {
    res.status(404).json({ message: "Bot not found" });
    return;
  }

  // Allow webhook even when isActive=false (bot may be in verification state)
  // The message handler checks for verification codes before requiring isActive

  const payload = parseWebhookPayload(req.body);
  const event =
    payload?.ok && payload.result
      ? payload.result
      : payload?.event_name && payload.message
        ? {
            event_name: payload.event_name,
            message: payload.message,
          }
        : null;

  if (!event) {
    console.error("Invalid Zalo webhook payload:", {
      contentType: req.header("content-type"),
      bodyType: typeof req.body,
      body: req.body,
    });
    res.status(400).json({ message: "Invalid payload" });
    return;
  }

  if (event.event_name === "message.text.received" && event.message) {
    console.log("Zalo webhook received:", {
      botConfigId,
      eventName: event.event_name,
      chatId: event.message.chat.id,
      fromId: event.message.from.id,
      text: event.message.text,
    });
    handleMessage(botConfig.botToken, botConfig.userId, event.message).catch(
      (err) => {
        console.error(`Webhook message handling error for ${botConfig.userId}:`, err);
      }
    );
  }

  res.json({ message: "Success" });
};
