import crypto from "crypto";
import {
  VERIFICATION_CLEANUP_INTERVAL_MS,
  VERIFICATION_TTL_MS,
} from "../config/constants";

export interface PendingVerification {
  code: string;
  userId: string;
  botToken: string;
  botConfigId: string;
  expiresAt: Date;
  verified: boolean;
}

const verifications = new Map<string, PendingVerification>();

function generateCode(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

export function createPendingVerification(input: {
  userId: string;
  botToken: string;
  botConfigId: string;
}): { verifyId: string; code: string; expiresAt: Date } {
  const verifyId = crypto.randomUUID();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

  verifications.set(verifyId, {
    code,
    userId: input.userId,
    botToken: input.botToken,
    botConfigId: input.botConfigId,
    expiresAt,
    verified: false,
  });

  return { verifyId, code, expiresAt };
}

export function getVerification(verifyId: string): PendingVerification | null {
  return verifications.get(verifyId) ?? null;
}

export function removeVerification(verifyId: string): void {
  verifications.delete(verifyId);
}

export function matchAndMarkVerified(input: {
  botToken: string;
  code: string;
}): { userId: string; verifyId: string } | null {
  const now = new Date();
  for (const [verifyId, verification] of verifications) {
    if (
      verification.botToken === input.botToken &&
      verification.code === input.code &&
      verification.expiresAt > now &&
      !verification.verified
    ) {
      verification.verified = true;
      return { userId: verification.userId, verifyId };
    }
  }
  return null;
}

const cleanupTimer = setInterval(() => {
  const now = new Date();
  for (const [key, value] of verifications) {
    if (value.expiresAt < now) verifications.delete(key);
  }
}, VERIFICATION_CLEANUP_INTERVAL_MS);

cleanupTimer.unref();
