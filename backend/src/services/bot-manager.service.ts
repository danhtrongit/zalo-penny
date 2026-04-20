import prisma from "../config/prisma";
import { env } from "../config/env";
import * as zaloApi from "../utils/zalo-api";
import { handleMessage } from "./message-handler.service";

interface PollingInstance {
  userId: string;
  botToken: string;
  running: boolean;
  seenIds: Set<string>;
}

const instances = new Map<string, PollingInstance>();

function getWebhookUrl(botConfigId: string) {
  if (!env.zalo.webhookBaseUrl) {
    return null;
  }

  return `${env.zalo.webhookBaseUrl}/api/webhooks/zalo/${botConfigId}`;
}

function assertWebhookReady(botConfigId: string) {
  const webhookUrl = getWebhookUrl(botConfigId);
  if (!webhookUrl || !env.zalo.webhookSecret) {
    throw new Error(
      "ZALO_BOT_MODE=webhook yêu cầu ZALO_WEBHOOK_BASE_URL và ZALO_WEBHOOK_SECRET hợp lệ"
    );
  }

  return webhookUrl;
}

export async function startAllBots() {
  const configs = await prisma.botConfig.findMany({
    where: { isActive: true },
    include: {
      user: {
        include: {
          subscription: true,
        },
      },
    },
  });

  let startedCount = 0;
  for (const config of configs) {
    if (config.user.subscription?.status === "ACTIVE") {
      const started = await startBot(config.userId, config.botToken, config.id);
      if (started) {
        startedCount += 1;
      }
    }
  }

  console.log(
    `Bot Manager: ${startedCount} bot(s) started [${env.zalo.mode}]`
  );
}

export async function startBot(
  userId: string,
  botToken: string,
  botConfigId: string
) {
  if (instances.has(userId)) {
    stopBot(userId);
  }

  try {
    await zaloApi.getMe(botToken);

    if (env.zalo.mode === "webhook") {
      const webhookUrl = assertWebhookReady(botConfigId);
      await zaloApi.setWebhook(botToken, webhookUrl, env.zalo.webhookSecret);
      console.log(`Bot started for user ${userId} [webhook -> ${webhookUrl}]`);
      return true;
    }

    await zaloApi.deleteWebhook(botToken);
  } catch (err) {
    console.error(`Failed to initialize bot for user ${userId}:`, err);
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

  console.log(`Bot started for user ${userId} [polling]`);
  return true;
}

export function stopBot(userId: string) {
  const instance = instances.get(userId);
  if (instance) {
    instance.running = false;
    instances.delete(userId);
    console.log(`Bot stopped for user ${userId}`);
  }
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

async function pollLoop(instance: PollingInstance) {
  while (instance.running) {
    try {
      const result = await zaloApi.getUpdates(instance.botToken, "30");

      if (
        result &&
        result.event_name === "message.text.received" &&
        result.message
      ) {
        const msgId = result.message.message_id;
        if (!instance.seenIds.has(msgId)) {
          instance.seenIds.add(msgId);

          // Trim seenIds to prevent memory leak
          if (instance.seenIds.size > 10000) {
            const arr = [...instance.seenIds];
            instance.seenIds = new Set(arr.slice(-5000));
          }

          handleMessage(
            instance.botToken,
            instance.userId,
            result.message
          ).catch((err) =>
            console.error(`Message handling error for ${instance.userId}:`, err)
          );
        }
      }
    } catch (err) {
      console.error(`Polling error for ${instance.userId}:`, err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
