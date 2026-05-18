import prisma from "../config/prisma";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import { handleMessage } from "./message-handler";

interface PollingInstance {
  userId: string;
  botToken: string;
  running: boolean;
  seenIds: Set<string>;
}

const instances = new Map<string, PollingInstance>();

function getWebhookUrl(botConfigId: string) {
  if (!env.zalo.webhookBaseUrl) return null;
  return `${env.zalo.webhookBaseUrl}/api/webhooks/zalo/${botConfigId}`;
}

function assertWebhookReady(botConfigId: string) {
  const webhookUrl = getWebhookUrl(botConfigId);
  if (!webhookUrl || !env.zalo.webhookSecret) {
    throw new Error(
      "ZALO_BOT_MODE=webhook requires ZALO_WEBHOOK_BASE_URL and ZALO_WEBHOOK_SECRET"
    );
  }
  return webhookUrl;
}

export async function startAllBots() {
  const configs = await prisma.botConfig.findMany({
    where: { isActive: true },
    include: { user: { include: { subscription: true } } },
  });

  let startedCount = 0;
  for (const config of configs) {
    if (config.user.subscription?.status === "ACTIVE") {
      const started = await startBot(config.userId, config.botToken, config.id);
      if (started) startedCount += 1;
    }
  }

  logger.info({ startedCount, mode: env.zalo.mode }, "Bot Manager started");
}

export async function startBot(
  userId: string,
  botToken: string,
  botConfigId: string
) {
  if (instances.has(userId)) stopBot(userId);

  try {
    await zaloApi.getMe(botToken);

    if (env.zalo.mode === "webhook") {
      const webhookUrl = assertWebhookReady(botConfigId);
      await zaloApi.setWebhook(botToken, webhookUrl, env.zalo.webhookSecret);
      logger.info({ userId, webhookUrl }, "Bot started [webhook]");
      return true;
    }

    await zaloApi.deleteWebhook(botToken);
  } catch (err) {
    logger.error({ err, userId }, "Failed to initialize bot");
    return false;
  }

  const instance: PollingInstance = {
    userId,
    botToken,
    running: true,
    seenIds: new Set(),
  };

  instances.set(userId, instance);
  pollLoop(instance);

  logger.info({ userId }, "Bot started [polling]");
  return true;
}

export function stopBot(userId: string) {
  const instance = instances.get(userId);
  if (instance) {
    instance.running = false;
    instances.delete(userId);
    logger.info({ userId }, "Bot stopped");
  }
}

export async function stopAllBots() {
  const userIds = [...instances.keys()];
  for (const userId of userIds) stopBot(userId);
}

export function isBotRunning(userId: string): boolean {
  return instances.has(userId);
}

export function getBotRuntimeMode() {
  return env.zalo.mode;
}

export function getBotWebhookUrl(botConfigId: string) {
  return getWebhookUrl(botConfigId);
}

const POLLED_EVENTS = new Set([
  "message.text.received",
  "message.image.received",
  "message.document.received",
]);

async function pollLoop(instance: PollingInstance) {
  while (instance.running) {
    try {
      const result = await zaloApi.getUpdates(instance.botToken, "30");

      if (result && POLLED_EVENTS.has(result.event_name) && result.message) {
        const msgId = result.message.message_id;
        if (!instance.seenIds.has(msgId)) {
          instance.seenIds.add(msgId);

          if (instance.seenIds.size > 10000) {
            const arr = [...instance.seenIds];
            instance.seenIds = new Set(arr.slice(-5000));
          }

          handleMessage(instance.botToken, instance.userId, result.message).catch((err) =>
            logger.error({ err, userId: instance.userId }, "Message handling error")
          );
        }
      }
    } catch (err) {
      logger.error({ err, userId: instance.userId }, "Polling error");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
