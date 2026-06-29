import prisma from "../config/prisma";
import { logger } from "../utils/logger";
import {
  generateReferralCode,
  normalizeReferralCode,
  computeCommission,
} from "./referral-code";

const COMMISSION_KEY = "referral_commission_pct";
const DEFAULT_COMMISSION_PCT = 10;

/**
 * Ensure a user has a unique referral code, generating one lazily on first use.
 * Retries on the (astronomically rare) unique-constraint collision.
 */
export async function ensureUserReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (user?.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateReferralCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      return updated.referralCode!;
    } catch {
      // Unique collision on referralCode → try a new one.
      continue;
    }
  }
  throw new Error("Could not generate a unique referral code");
}

/** Resolve a typed referral code to the referrer's user id (null if blank/unknown/self). */
export async function resolveReferrer(
  codeInput: string | null | undefined,
  opts: { excludeUserId?: string } = {}
): Promise<string | null> {
  const code = normalizeReferralCode(codeInput);
  if (!code) return null;
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!referrer) return null;
  if (opts.excludeUserId && referrer.id === opts.excludeUserId) return null;
  return referrer.id;
}

/** Current admin-configured commission percentage (defaults to 10). */
export async function getCommissionPct(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: COMMISSION_KEY } });
  if (!row) return DEFAULT_COMMISSION_PCT;
  const n = parseInt(row.value, 10);
  return Number.isFinite(n) ? n : DEFAULT_COMMISSION_PCT;
}

export async function setCommissionPct(pct: number): Promise<number> {
  await prisma.setting.upsert({
    where: { key: COMMISSION_KEY },
    create: { key: COMMISSION_KEY, value: String(pct) },
    update: { value: String(pct) },
  });
  return pct;
}

/**
 * Record a referral commission when a referred user's subscription is paid.
 * No-op when the user wasn't referred, the commission rounds to 0, or a
 * commission for this subscription already exists (idempotent against IPN
 * retries).
 */
export async function recordReferralCommission(params: {
  referredUserId: string;
  amount: number;
  subscriptionId?: string | null;
}): Promise<void> {
  const { referredUserId, amount, subscriptionId } = params;

  const user = await prisma.user.findUnique({
    where: { id: referredUserId },
    select: { referredById: true },
  });
  if (!user?.referredById) return;

  const pct = await getCommissionPct();
  const commission = computeCommission(amount, pct);
  if (commission <= 0) return;

  if (subscriptionId) {
    const existing = await prisma.referralCommission.findFirst({ where: { subscriptionId } });
    if (existing) return;
  }

  await prisma.referralCommission.create({
    data: {
      referrerId: user.referredById,
      referredUserId,
      subscriptionId: subscriptionId ?? null,
      amount: commission,
      pct,
    },
  });

  logger.info(
    { referrerId: user.referredById, referredUserId, commission, pct, subscriptionId },
    "Referral commission recorded"
  );
}

/** Public-facing referral summary for the account page. */
export async function getReferralSummary(userId: string) {
  const code = await ensureUserReferralCode(userId);
  const [referredCount, agg] = await Promise.all([
    prisma.user.count({ where: { referredById: userId } }),
    prisma.referralCommission.aggregate({
      where: { referrerId: userId },
      _sum: { amount: true },
    }),
  ]);
  return {
    code,
    referredCount,
    totalCommission: agg._sum.amount ?? 0,
  };
}
