import { Response } from "express";
import crypto from "crypto";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { env } from "../config/env";

export const createSubscription = async (req: AuthRequest, res: Response) => {
  const { planSlug } = req.body;

  if (!planSlug) {
    res.status(400).json({ error: "planSlug is required" });
    return;
  }

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const existing = await prisma.subscription.findUnique({
    where: { userId: req.userId! },
  });
  if (existing && existing.status === "ACTIVE") {
    res.status(409).json({ error: "You already have an active subscription" });
    return;
  }

  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  if (existing) {
    await prisma.subscription.delete({ where: { id: existing.id } });
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId: req.userId!,
      planId: plan.id,
      invoiceNumber,
    },
    include: { plan: true },
  });

  await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      amount: plan.price,
    },
  });

  if (env.isDev) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE", startDate: now, endDate },
    });

    await prisma.payment.update({
      where: { subscriptionId: subscription.id },
      data: { status: "PAID", paidAt: now, method: "DEV_AUTO" },
    });

    const { invoiceNumber: _devInv, ...devSafeSubscription } = subscription;

    res.status(201).json({
      subscription: {
        ...devSafeSubscription,
        status: "ACTIVE",
        startDate: now,
        endDate,
      },
      payment: { status: "PAID", method: "DEV_AUTO" },
      message: "DEV mode: payment auto-approved",
    });
    return;
  }

  // Don't expose invoiceNumber to the client – it's used server-side only for IPN matching
  const { invoiceNumber: _inv, ...safeSubscription } = subscription;

  // Build signed string for SePay signature
  const checkoutFields = {
    merchant: env.sepay.merchantId,
    operation: "PURCHASE",
    payment_method: "",
    order_amount: String(plan.price),
    currency: "VND",
    order_invoice_number: invoiceNumber,
    order_description: `Penny - ${plan.name}`,
    customer_id: req.userId!,
    success_url: `${env.frontendUrl}/payment/success`,
    error_url: `${env.frontendUrl}/payment/error`,
    cancel_url: `${env.frontendUrl}/pricing`,
  };

  const signedString = [
    `merchant=${checkoutFields.merchant}`,
    `operation=${checkoutFields.operation}`,
    `payment_method=${checkoutFields.payment_method}`,
    `order_amount=${checkoutFields.order_amount}`,
    `currency=${checkoutFields.currency}`,
    `order_invoice_number=${checkoutFields.order_invoice_number}`,
    `order_description=${checkoutFields.order_description}`,
    `customer_id=${checkoutFields.customer_id}`,
    `success_url=${checkoutFields.success_url}`,
    `error_url=${checkoutFields.error_url}`,
    `cancel_url=${checkoutFields.cancel_url}`,
  ].join(",");

  const signature = crypto
    .createHmac("sha256", env.sepay.secretKey)
    .update(signedString, "utf8")
    .digest("base64");

  const checkoutUrl =
    env.sepay.env === "sandbox"
      ? "https://pay-sandbox.sepay.vn/v1/checkout/init"
      : "https://pay.sepay.vn/v1/checkout/init";

  res.status(201).json({
    subscription: safeSubscription,
    checkoutData: {
      ...checkoutFields,
      order_amount: plan.price,
      signature,
      checkoutUrl,
    },
  });
};

export const mySubscription = async (req: AuthRequest, res: Response) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.userId! },
    include: {
      plan: true,
      payment: { select: { status: true, paidAt: true, method: true } },
    },
  });

  if (!subscription) {
    res.json(null);
    return;
  }

  res.json(subscription);
};
