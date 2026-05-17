import { Request, Response } from "express";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { HttpError } from "../middlewares/error.middleware";
import { handleMessage } from "../services/message-handler";
import { ZaloUpdateResult } from "../utils/zalo-api";

interface ZaloWebhookPayload {
  ok?: boolean;
  result?: ZaloUpdateResult;
  event_name?: string;
  message?: ZaloUpdateResult["message"];
}

function parseWebhookPayload(body: unknown): ZaloWebhookPayload | null {
  if (!body) return null;

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

  if (typeof body === "object") return body as ZaloWebhookPayload;

  return null;
}

export const handleZaloWebhook = async (req: Request, res: Response) => {
  const secretToken = req.header("x-bot-api-secret-token");
  if (!env.zalo.webhookSecret || secretToken !== env.zalo.webhookSecret) {
    throw new HttpError(403, "Unauthorized");
  }

  const botConfigIdParam = req.params.botConfigId;
  const botConfigId = Array.isArray(botConfigIdParam)
    ? botConfigIdParam[0]
    : botConfigIdParam;

  if (!botConfigId) throw new HttpError(400, "Missing bot config id");

  const botConfig = await prisma.botConfig.findUnique({
    where: { id: botConfigId },
    select: { id: true, userId: true, botToken: true, isActive: true },
  });

  if (!botConfig) throw new HttpError(404, "Bot not found");

  // Allow webhook even when isActive=false: handler checks verification state.

  const payload = parseWebhookPayload(req.body);
  const event =
    payload?.ok && payload.result
      ? payload.result
      : payload?.event_name && payload.message
        ? { event_name: payload.event_name, message: payload.message }
        : null;

  if (!event) {
    logger.warn(
      {
        reqId: req.id,
        contentType: req.header("content-type"),
        bodyType: typeof req.body,
      },
      "Invalid Zalo webhook payload"
    );
    throw new HttpError(400, "Invalid payload");
  }

  if (event.event_name === "message.text.received" && event.message) {
    logger.info(
      {
        reqId: req.id,
        botConfigId,
        eventName: event.event_name,
        chatId: event.message.chat.id,
        fromId: event.message.from.id,
        text: event.message.text?.slice(0, 200),
      },
      "Zalo webhook received"
    );

    // Process async — we MUST 200 Zalo quickly. Errors are logged with reqId
    // so they can be traced back via structured logs / APM.
    handleMessage(botConfig.botToken, botConfig.userId, event.message).catch((err) => {
      logger.error(
        { err, reqId: req.id, userId: botConfig.userId, botConfigId },
        "Webhook message handling error"
      );
    });
  }

  res.json({ message: "Success" });
};
