import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.logLevel,
  base: { service: "penny-backend" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-bot-api-secret-token']",
      "*.password",
      "*.passwordHash",
      "*.botToken",
      "*.jwtSecret",
      "*.secretKey",
    ],
    censor: "[REDACTED]",
  },
  transport: env.isDev
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
      }
    : undefined,
});

export type Logger = typeof logger;
