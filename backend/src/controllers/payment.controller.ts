import { Request, Response } from "express";
import prisma from "../config/prisma";
import { env } from "../config/env";

// SePay authorized IP addresses (from docs)
const SEPAY_IPS = [
  "172.236.138.20",
  "172.233.83.68",
  "171.244.35.2",
  "151.158.108.68",
  "151.158.109.79",
  "103.255.238.139",
];

export const handleIPN = async (req: Request, res: Response) => {
  // Log incoming IPN for debugging
  console.log("IPN received:", JSON.stringify(req.body));

  // --- IP whitelist verification (skip in dev) ---
  if (!env.isDev) {
    const clientIp =
      (req.headers["x-real-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";

    // Strip IPv6 prefix if present
    const cleanIp = clientIp.replace(/^::ffff:/, "");

    if (!SEPAY_IPS.includes(cleanIp)) {
      console.warn(`IPN rejected: unauthorized IP ${cleanIp}`);
      res.status(403).json({ error: "Unauthorized IP" });
      return;
    }
  }

  const data = req.body;

  if (data.notification_type === "ORDER_PAID") {
    const invoiceNumber = data.order?.order_invoice_number;
    if (!invoiceNumber) {
      res.status(400).json({ error: "Missing invoice number" });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { invoiceNumber },
      include: { plan: true, payment: true },
    });

    if (!subscription) {
      console.warn(`IPN: subscription not found for invoice ${invoiceNumber}`);
      res.status(404).json({ error: "Subscription not found" });
      return;
    }

    // Prevent re-activation of already active subscriptions
    if (subscription.status === "ACTIVE") {
      res.json({ success: true, message: "Already active" });
      return;
    }

    // Prevent replay: if payment is already PAID, skip
    if (subscription.payment?.status === "PAID") {
      res.json({ success: true, message: "Already paid" });
      return;
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + subscription.plan.durationDays);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE", startDate: now, endDate },
    });

    await prisma.payment.update({
      where: { subscriptionId: subscription.id },
      data: {
        status: "PAID",
        paidAt: now,
        method: data.transaction?.payment_method || "UNKNOWN",
        transactionId: data.transaction?.transaction_id,
        rawResponse: data,
      },
    });

    console.log(`IPN: subscription ${subscription.id} activated for invoice ${invoiceNumber}`);
  }

  res.json({ success: true });
};
