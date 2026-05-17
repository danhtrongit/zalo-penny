import http from "http";
import app from "./app";
import { env } from "./config/env";
import prisma from "./config/prisma";
import { startAllBots, stopAllBots } from "./services/bot-manager.service";
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

  clearTimeout(force);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  void shutdown("uncaughtException");
});

server.listen(env.port, async () => {
  logger.info(
    { port: env.port, nodeEnv: env.nodeEnv, mode: env.zalo.mode },
    "Server listening"
  );

  try {
    await startAllBots();
  } catch (err) {
    logger.error({ err }, "Failed to start bots");
  }
});
