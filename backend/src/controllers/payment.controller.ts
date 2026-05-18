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

/**
 * Per SePay docs (developer.sepay.vn/vi/cong-thanh-toan/bat-dau.md), IPN
 * authenticity is enforced by:
 *   1. Source IP whitelist (SEPAY_AUTHORIZED_IPS)
 * The docs do NOT mandate an HMAC signature header. We still accept one if
 * SePay ever ships it (forward-compat) and reject if it's malformed, but a
 * missing signature is NOT grounds for rejection on its own.
 */
export const handleIPN = async (req: Request, res: Response) => {
  const ip = getClientIp(req).replace(/^::ffff:/, "");

  // Always log inbound IPN headers + raw body for ops audit. Pino redacts
  // any keys we configured globally.
  logger.info(
    {
      reqId: req.id,
      ip,
      contentType: req.header("content-type"),
      headerKeys: Object.keys(req.headers),
      bodyKeys:
        req.body && typeof req.body === "object" ? Object.keys(req.body) : null,
    },
    "IPN inbound"
  );

  if (!env.isDev) {
    if (!SEPAY_AUTHORIZED_IPS.includes(ip as (typeof SEPAY_AUTHORIZED_IPS)[number])) {
      logger.warn({ ip, reqId: req.id }, "IPN rejected: unauthorized IP");
      throw new HttpError(403, "Unauthorized IP");
    }

    // Optional signature — verify only if SePay actually sends one. Missing
    // signature is acceptable per current SePay spec.
    const signature = extractSignature(req.headers as Record<string, unknown>);
    const rawBody = req.rawBody;
    if (signature && rawBody && rawBody.length > 0) {
      if (!verifyIpnSignature(rawBody.toString("utf8"), signature)) {
        logger.warn(
          { reqId: req.id, ip },
          "IPN rejected: signature provided but invalid"
        );
        throw new HttpError(401, "Invalid signature");
      }
      logger.info({ reqId: req.id }, "IPN signature verified");
    }
  }

  const payload = req.body as SepayIpnPayload;
  logger.info(
    {
      reqId: req.id,
      notification_type: payload.notification_type,
      invoice: payload.order?.order_invoice_number,
      order_amount: payload.order?.order_amount,
      transaction_id: payload.transaction?.transaction_id,
    },
    "IPN received"
  );

  const result = await activateSubscriptionFromIpn(payload);
  res.json({ success: true, ...result });
};
