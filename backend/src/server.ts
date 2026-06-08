// dotenv via env.ts will fire on first import, but Sentry needs raw env
// before our config layer loads — so we load dotenv up-front and then bring
// Sentry in. Order matters: Sentry's auto-instrumentation patches http/express
// prototypes, so it has to run BEFORE app/prisma/etc.
import "dotenv/config";
import { Sentry, sentryEnabled } from "./observability/sentry";

import http from "http";
import app from "./app";
import { env } from "./config/env";
import prisma from "./config/prisma";
import { startAllBots, stopAllBots } from "./services/bot-manager.service";
import { startExpirySweep } from "./services/subscription-expiry.service";
import {
  startReminderScheduler,
  stopReminderScheduler,
} from "./services/reminder.service";
import { closeRedis } from "./config/redis";
import { logger } from "./utils/logger";

const server = http.createServer(app);

const SHUTDOWN_TIMEOUT_MS = 15_000;
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutdown signal received");

  const force = setTimeout(() => {
    logger.fatal("Forced exit after shutdown timeout");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  force.unref();

  try {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
    logger.info("HTTP server closed");
  } catch (err) {
    logger.error({ err }, "Error closing HTTP server");
  }

  try {
    await stopAllBots();
    logger.info("Bots stopped");
  } catch (err) {
    logger.error({ err }, "Error stopping bots");
  }

  stopReminderScheduler();

  try {
    await prisma.$disconnect();
    logger.info("Prisma disconnected");
  } catch (err) {
    logger.error({ err }, "Error disconnecting prisma");
  }

  try {
    await closeRedis();
  } catch (err) {
    logger.error({ err }, "Error closing redis");
  }

  if (sentryEnabled) {
    try {
      await Sentry.close(2_000);
    } catch (err) {
      logger.error({ err }, "Error closing sentry");
    }
  }

  clearTimeout(force);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
  if (sentryEnabled) Sentry.captureException(reason);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  if (sentryEnabled) Sentry.captureException(err);
  void shutdown("uncaughtException");
});

server.listen(env.port, async () => {
  logger.info(
    {
      port: env.port,
      nodeEnv: env.nodeEnv,
      mode: env.zalo.mode,
      sentry: sentryEnabled,
    },
    "Server listening"
  );

  try {
    await startAllBots();
  } catch (err) {
    logger.error({ err }, "Failed to start bots");
  }

  startExpirySweep();
  startReminderScheduler();
});
