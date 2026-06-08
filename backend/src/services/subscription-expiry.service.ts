import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import { releaseAssignment } from "./bot-pool.service";
import { stopBot } from "./bot-manager.service";

/**
 * Transition ACTIVE subscriptions past their endDate to EXPIRED and free the
 * bot slot so the pool can be reused. (There was previously no mechanism that
 * ever set EXPIRED — this also closes that gap.)
 */
export async function sweepExpiredSubscriptions() {
  const now = new Date();
  const expired = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    include: { user: { include: { botConfig: true } } },
  });

  for (const sub of expired) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED" },
    });
    await releaseAssignment(sub.userId);
    const owned = sub.user?.botConfig;
    if (owned) stopBot(owned.id);
    logger.info(
      { subscriptionId: sub.id, userId: sub.userId },
      "Subscription expired + bot slot released"
    );
  }

  if (expired.length) {
    logger.info({ count: expired.length }, "Expiry sweep done");
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startExpirySweep(intervalMs = 60 * 60 * 1000) {
  if (timer) return;
  timer = setInterval(() => {
    sweepExpiredSubscriptions().catch((err) =>
      logger.error({ err }, "Expiry sweep failed")
    );
  }, intervalMs);
  timer.unref();
}
