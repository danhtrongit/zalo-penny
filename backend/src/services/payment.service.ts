import crypto from "crypto";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { HttpError } from "../middlewares/error.middleware";
import { assignBotToUser } from "./bot-pool.service";
import { recordReferralCommission } from "./referral.service";

export interface SepayIpnPayload {
  notification_type?: string;
  timestamp?: number;
  order?: {
    id?: string;
    order_id?: string;
    order_status?: string;
    order_currency?: string;
    order_amount?: number | string;
    order_invoice_number?: string;
    order_description?: string;
    custom_data?: unknown;
  };
  transaction?: {
    id?: string;
    payment_method?: string;
    transaction_id?: string;
    transaction_status?: string;
    transaction_amount?: number | string;
    transaction_currency?: string;
    transaction_date?: string;
  };
  [key: string]: unknown;
}

const SIGNATURE_HEADERS = [
  "x-sepay-signature",
  "x-signature",
  "signature",
] as const;

export function extractSignature(headers: Record<string, unknown>): string | null {
  for (const name of SIGNATURE_HEADERS) {
    const raw = headers[name];
    if (typeof raw === "string" && raw.length > 0) {
      return raw.trim();
    }
  }
  return null;
}

export function computeIpnSignature(rawBody: string): string {
  return crypto
    .createHmac("sha256", env.sepay.secretKey)
    .update(rawBody, "utf8")
    .digest("base64");
}

export function verifyIpnSignature(rawBody: string, providedSignature: string): boolean {
  const expected = computeIpnSignature(rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(providedSignature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function activateSubscriptionFromIpn(payload: SepayIpnPayload) {
  if (payload.notification_type !== "ORDER_PAID") {
    return { handled: false, reason: "not_order_paid" as const };
  }

  const invoiceNumber = payload.order?.order_invoice_number;
  if (!invoiceNumber) {
    throw new HttpError(400, "Missing invoice number");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { invoiceNumber },
    include: { plan: true, payment: true },
  });

  if (!subscription) {
    logger.warn({ invoiceNumber }, "IPN: subscription not found");
    throw new HttpError(404, "Subscription not found");
  }

  if (subscription.status === "ACTIVE") {
    return { handled: true, reason: "already_active" as const };
  }

  if (subscription.payment?.status === "PAID") {
    return { handled: true, reason: "already_paid" as const };
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + subscription.plan.durationDays);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE", startDate: now, endDate },
    }),
    prisma.payment.update({
      where: { subscriptionId: subscription.id },
      data: {
        status: "PAID",
        paidAt: now,
        method: payload.transaction?.payment_method || "UNKNOWN",
        transactionId: payload.transaction?.transaction_id,
        rawResponse: payload as object,
      },
    }),
  ]);

  // Auto-assign a pool bot. Never let this fail the IPN (Zalo/SePay must get a
  // 200) — if the pool is full (race), the user is left "awaiting bot" and the
  // admin sees them on the bot pool page.
  try {
    const assignment = await assignBotToUser(subscription.userId);
    if (!assignment) {
      logger.warn(
        { userId: subscription.userId, invoiceNumber },
        "POOL_FULL at activation — user awaiting bot"
      );
    }
  } catch (err) {
    logger.error(
      { err, userId: subscription.userId },
      "Bot auto-assign failed on IPN activation"
    );
  }

  // Pay the referrer (if any). Never let this fail the IPN — SePay must get 200.
  try {
    await recordReferralCommission({
      referredUserId: subscription.userId,
      amount: subscription.plan.price,
      subscriptionId: subscription.id,
    });
  } catch (err) {
    logger.error(
      { err, userId: subscription.userId, subscriptionId: subscription.id },
      "Referral commission failed on IPN activation"
    );
  }

  logger.info(
    { subscriptionId: subscription.id, invoiceNumber },
    "Subscription activated via IPN"
  );

  return { handled: true, reason: "activated" as const };
}

export interface CheckoutFieldInput {
  merchantId: string;
  planName: string;
  amount: number;
  invoiceNumber: string;
  customerId: string;
  frontendUrl: string;
}

const SIGNABLE_FIELDS = [
  "merchant",
  "operation",
  "payment_method",
  "order_amount",
  "currency",
  "order_invoice_number",
  "order_description",
  "customer_id",
  "success_url",
  "error_url",
  "cancel_url",
] as const;

export function buildCheckoutFields(input: CheckoutFieldInput): Record<string, string> {
  return {
    merchant: input.merchantId,
    currency: "VND",
    order_amount: String(input.amount),
    operation: "PURCHASE",
    order_description: `Penny - ${input.planName}`,
    order_invoice_number: input.invoiceNumber,
    customer_id: input.customerId,
    success_url: `${input.frontendUrl}/payment/success`,
    error_url: `${input.frontendUrl}/payment/error`,
    cancel_url: `${input.frontendUrl}/pricing`,
  };
}

export function signCheckoutFields(fields: Record<string, string>): string {
  const parts: string[] = [];
  for (const field of SIGNABLE_FIELDS) {
    if (!(field in fields)) continue;
    parts.push(`${field}=${fields[field] ?? ""}`);
  }
  return crypto
    .createHmac("sha256", env.sepay.secretKey)
    .update(parts.join(","), "utf8")
    .digest("base64");
}
