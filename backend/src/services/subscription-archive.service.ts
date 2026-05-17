import prisma from "../config/prisma";
import { logger } from "../utils/logger";

export type ArchiveReason =
  | "REPLACED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "ADMIN_REMOVED"
  | "OTHER";

interface ArchiveInput {
  subscriptionId: string;
  reason: ArchiveReason;
  notes?: string;
}

/**
 * Move a Subscription + its Payment into SubscriptionAudit, then delete the
 * source rows. Wrapped in a transaction so we never lose data half-way.
 *
 * Returns the audit record id on success, or null if the source subscription
 * no longer exists.
 */
export async function archiveSubscription(
  input: ArchiveInput
): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { id: input.subscriptionId },
      include: { payment: true },
    });

    if (!sub) return null;

    const audit = await tx.subscriptionAudit.create({
      data: {
        originalSubscriptionId: sub.id,
        userId: sub.userId,
        planId: sub.planId,
        invoiceNumber: sub.invoiceNumber,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        originalCreatedAt: sub.createdAt,
        reason: input.reason,
        notes: input.notes,
        paymentStatus: sub.payment?.status,
        paymentMethod: sub.payment?.method,
        paymentTransactionId: sub.payment?.transactionId,
        paymentPaidAt: sub.payment?.paidAt,
        paymentAmount: sub.payment?.amount,
        paymentRawResponse: (sub.payment?.rawResponse as object) ?? undefined,
      },
    });

    if (sub.payment) {
      await tx.payment.delete({ where: { id: sub.payment.id } });
    }
    await tx.subscription.delete({ where: { id: sub.id } });

    logger.info(
      { auditId: audit.id, userId: sub.userId, reason: input.reason },
      "Subscription archived"
    );

    return audit.id;
  });
}
