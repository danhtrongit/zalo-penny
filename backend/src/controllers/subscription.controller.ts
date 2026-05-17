import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { HttpError } from "../middlewares/error.middleware";
import { env } from "../config/env";
import { SEPAY_CHECKOUT_URL } from "../config/constants";
import {
  buildCheckoutFields,
  signCheckoutFields,
} from "../services/payment.service";
import { archiveSubscription } from "../services/subscription-archive.service";

function generateInvoiceNumber(): string {
  return `INV-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

export const createSubscription = async (req: AuthRequest, res: Response) => {
  const { planSlug } = req.body as { planSlug: string };

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) throw new HttpError(404, "Không tìm thấy gói");

  const existing = await prisma.subscription.findUnique({
    where: { userId: req.userId! },
  });
  if (existing && existing.status === "ACTIVE") {
    throw new HttpError(409, "Bạn đã có gói đang hoạt động");
  }

  const invoiceNumber = generateInvoiceNumber();

  if (existing) {
    // Archive (don't hard-delete) so we keep the full subscription/payment
    // history for accounting, support, and audit purposes.
    await archiveSubscription({
      subscriptionId: existing.id,
      reason: "REPLACED",
      notes: `Replaced by new subscription for plan ${plan.slug}`,
    });
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

    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "ACTIVE", startDate: now, endDate },
      }),
      prisma.payment.update({
        where: { subscriptionId: subscription.id },
        data: { status: "PAID", paidAt: now, method: "DEV_AUTO" },
      }),
    ]);

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

  const { invoiceNumber: _inv, ...safeSubscription } = subscription;

  const checkoutFields = buildCheckoutFields({
    merchantId: env.sepay.merchantId,
    planName: plan.name,
    amount: plan.price,
    invoiceNumber,
    customerId: req.userId!,
    frontendUrl: env.frontendUrl,
  });
  checkoutFields.signature = signCheckoutFields(checkoutFields);

  const checkoutUrl = SEPAY_CHECKOUT_URL[env.sepay.env];

  res.status(201).json({
    subscription: safeSubscription,
    checkoutData: {
      ...checkoutFields,
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

  res.json(subscription ?? null);
};
