import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  YESCALE_API_KEY: z.string().min(1, "YESCALE_API_KEY is required"),
  SEPAY_MERCHANT_ID: z.string().min(1, "SEPAY_MERCHANT_ID is required"),
  SEPAY_SECRET_KEY: z.string().min(1, "SEPAY_SECRET_KEY is required"),
  SEPAY_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional(),
  ZALO_BOT_MODE: z.enum(["polling", "webhook"]).optional(),
  ZALO_WEBHOOK_BASE_URL: z.string().optional().default(""),
  ZALO_WEBHOOK_SECRET: z.string().optional().default(""),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
});

const parsed = rawSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const raw = parsed.data;

const isProduction = raw.NODE_ENV === "production";

if (isProduction && raw.JWT_SECRET === "penny-dev-jwt-secret-change-in-production") {
  console.error("FATAL: JWT_SECRET must be changed in production");
  process.exit(1);
}

const webhookBaseUrl = raw.ZALO_WEBHOOK_BASE_URL.replace(/\/+$/, "");
const mode: "polling" | "webhook" =
  raw.ZALO_BOT_MODE ?? (webhookBaseUrl && raw.ZALO_WEBHOOK_SECRET ? "webhook" : "polling");

if (mode === "webhook" && (!webhookBaseUrl || !raw.ZALO_WEBHOOK_SECRET)) {
  console.error(
    "FATAL: ZALO_BOT_MODE=webhook requires ZALO_WEBHOOK_BASE_URL and ZALO_WEBHOOK_SECRET"
  );
  process.exit(1);
}

const corsOrigins = raw.CORS_ORIGINS
  ? raw.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : [raw.FRONTEND_URL];

export const env = {
  port: raw.PORT,
  nodeEnv: raw.NODE_ENV,
  isProduction,
  isDev: !isProduction,
  jwtSecret: raw.JWT_SECRET,
  databaseUrl: raw.DATABASE_URL,
  yescaleApiKey: raw.YESCALE_API_KEY,
  logLevel: raw.LOG_LEVEL,
  rateLimit: {
    windowMs: raw.RATE_LIMIT_WINDOW_MS,
    max: raw.RATE_LIMIT_MAX,
  },
  redisUrl: raw.REDIS_URL,
  sentry: {
    dsn: raw.SENTRY_DSN,
    tracesSampleRate: raw.SENTRY_TRACES_SAMPLE_RATE,
    profilesSampleRate: raw.SENTRY_PROFILES_SAMPLE_RATE,
  },
  sepay: {
    merchantId: raw.SEPAY_MERCHANT_ID,
    secretKey: raw.SEPAY_SECRET_KEY,
    env: raw.SEPAY_ENV,
  },
  frontendUrl: raw.FRONTEND_URL,
  corsOrigins,
  zalo: {
    mode,
    webhookBaseUrl,
    webhookSecret: raw.ZALO_WEBHOOK_SECRET,
  },
} as const;

export type AppEnv = typeof env;
