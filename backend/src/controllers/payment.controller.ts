import { Request, Response } from "express";
import prisma from "../config/prisma";
import { env } from "../config/env";

export const handleIPN = async (req: Request, res: Response) => {
  // --- Authorization verification (skip only in dev) ---
  if (!env.isDev) {
    const authHeader = req.headers["authorization"] as string | undefined;
    if (!authHeader) {
      console.warn("IPN rejected: missing Authorization header");
      res.status(401).json({ error: "Missing authorization" });
      return;
    }

    const expectedToken = env.sepay.secretKey;
    const receivedToken = authHeader.replace(/^Bearer\s+/i, "");

    if (receivedToken !== expectedToken) {
      console.warn("IPN rejected: invalid authorization token");
      res.status(401).json({ error: "Invalid authorization" });
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
  }

  res.json({ success: true });
};
