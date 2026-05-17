import Redis, { type Redis as RedisClient } from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

let client: RedisClient | null = null;
let warned = false;

export function getRedis(): RedisClient | null {
  if (!env.redisUrl) {
    if (!warned) {
      warned = true;
      logger.warn(
        "REDIS_URL not set — falling back to in-memory dedup (safe only for single-instance deployments)"
      );
    }
    return null;
  }

  if (!client) {
    client = new Redis(env.redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
    });

    client.on("error", (err) => {
      logger.error({ err }, "Redis error");
    });

    client.on("connect", () => {
      logger.info("Redis connected");
    });
  }

  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}
