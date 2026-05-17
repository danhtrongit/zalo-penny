import { Request, Response } from "express";
import { env } from "../config/env";
import { SEPAY_AUTHORIZED_IPS } from "../config/constants";
import { logger } from "../utils/logger";
import { HttpError } from "../middlewares/error.middleware";
import {
  activateSubscriptionFromIpn,
  extractSignature,
  verifyIpnSignature,
  type SepayIpnPayload,
} from "../services/payment.service";

function getClientIp(req: Request): string {
  const xRealIp = req.headers["x-real-ip"];
  if (typeof xRealIp === "string" && xRealIp) return xRealIp;

  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string") {
    const first = xForwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return req.socket.remoteAddress ?? "";
}

export const handleIPN = async (req: Request, res: Response) => {
  const ip = getClientIp(req).replace(/^::ffff:/, "");

  if (!env.isDev) {
    if (!SEPAY_AUTHORIZED_IPS.includes(ip as (typeof SEPAY_AUTHORIZED_IPS)[number])) {
      logger.warn({ ip, reqId: req.id }, "IPN rejected: unauthorized IP");
      throw new HttpError(403, "Unauthorized IP");
    }

    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      logger.warn({ reqId: req.id }, "IPN rejected: missing raw body");
      throw new HttpError(400, "Missing request body");
    }

    const signature = extractSignature(req.headers as Record<string, unknown>);
    if (!signature) {
      logger.warn({ reqId: req.id }, "IPN rejected: missing signature header");
      throw new HttpError(401, "Missing signature");
    }

    if (!verifyIpnSignature(rawBody.toString("utf8"), signature)) {
      logger.warn({ reqId: req.id, ip }, "IPN rejected: invalid signature");
      throw new HttpError(401, "Invalid signature");
    }
  }

  const payload = req.body as SepayIpnPayload;
  logger.info(
    { reqId: req.id, notification_type: payload.notification_type, invoice: payload.order?.order_invoice_number },
    "IPN received"
  );

  const result = await activateSubscriptionFromIpn(payload);
  res.json({ success: true, ...result });
};
