import dotenv from "dotenv";

dotenv.config();

const webhookBaseUrl = (process.env.ZALO_WEBHOOK_BASE_URL || "").replace(/\/+$/, "");
const webhookSecret = process.env.ZALO_WEBHOOK_SECRET || "";
const botMode =
  (process.env.ZALO_BOT_MODE ||
    (webhookBaseUrl && webhookSecret ? "webhook" : "polling")).toLowerCase() ===
  "webhook"
    ? "webhook"
    : "polling";

export const env = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV !== "production",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  databaseUrl: process.env.DATABASE_URL || "",
  yescaleApiKey: process.env.YESCALE_API_KEY || "",
  sepay: {
    merchantId: process.env.SEPAY_MERCHANT_ID || "",
    secretKey: process.env.SEPAY_SECRET_KEY || "",
    env: process.env.SEPAY_ENV || "sandbox",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  zalo: {
    mode: botMode as "polling" | "webhook",
    webhookBaseUrl,
    webhookSecret,
  },
};
