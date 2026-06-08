import prisma from "../config/prisma";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import * as zaloApi from "../utils/zalo-api";
import { handleMessage } from "./message-handler";

interface PollingInstance {
  botConfigId: string;
  botToken: string;
  running: boolean;
  seenIds: Set<string>;
}

const instances = new Map<string, PollingInstance>(); // key = botConfigId

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
    // Pool bots run whenever active; owned bots only while the owner's
    // subscription is active.
    const isPool = config.kind === "POOL";
    const ownerActive = config.user?.subscription?.status === "ACTIVE";
    if (isPool || ownerActive) {
      const started = await startBot(config.id, config.botToken);
      if (started) startedCount += 1;
    }
  }

  logger.info({ startedCount, mode: env.zalo.mode }, "Bot Manager started");
}

export async function startBot(botConfigId: string, botToken: string) {
  if (instances.has(botConfigId)) stopBot(botConfigId);

  try {
    await zaloApi.getMe(botToken);

    if (env.zalo.mode === "webhook") {
      const webhookUrl = assertWebhookReady(botConfigId);
      await zaloApi.setWebhook(botToken, webhookUrl, env.zalo.webhookSecret);
      logger.info({ botConfigId, webhookUrl }, "Bot started [webhook]");
      return true;
    }

    await zaloApi.deleteWebhook(botToken);
  } catch (err) {
    logger.error({ err, botConfigId }, "Failed to initialize bot");
    return false;
  }

  const instance: PollingInstance = {
    botConfigId,
    botToken,
    running: true,
    seenIds: new Set(),
  };

  instances.set(botConfigId, instance);
  pollLoop(instance);

  logger.info({ botConfigId }, "Bot started [polling]");
  return true;
}

export function stopBot(botConfigId: string) {
  const instance = instances.get(botConfigId);
  if (instance) {
    instance.running = false;
    instances.delete(botConfigId);
    logger.info({ botConfigId }, "Bot stopped");
  }
}

export async function stopAllBots() {
  for (const id of [...instances.keys()]) stopBot(id);
}

export function isBotRunning(botConfigId: string): boolean {
  return instances.has(botConfigId);
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

          const botConfig = await prisma.botConfig.findUnique({
            where: { id: instance.botConfigId },
            select: { id: true, userId: true, botToken: true, kind: true, isActive: true },
          });
          if (botConfig) {
            handleMessage(botConfig, result.message).catch((err) =>
              logger.error(
                { err, botConfigId: instance.botConfigId },
                "Message handling error"
              )
            );
          }
        }
      }
    } catch (err) {
      logger.error({ err, botConfigId: instance.botConfigId }, "Polling error");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
