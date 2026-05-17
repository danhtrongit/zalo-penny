import { getRedis } from "../config/redis";
import { logger } from "../utils/logger";

const RECENT_MESSAGE_TTL_MS = 10 * 60 * 1000;
const MAX_RECENT_KEYS = 5000;

const REDIS_PREFIX = "msg-dedup:";
const REDIS_TTL_SECONDS = Math.ceil(RECENT_MESSAGE_TTL_MS / 1000);

// In-memory fallback (used when REDIS_URL is unset, or when Redis is unreachable).
const inFlightKeys = new Set<string>();
const recentKeys = new Map<string, number>();

function pruneExpiredRecentKeys() {
  const now = Date.now();
  for (const [key, expiresAt] of recentKeys) {
    if (expiresAt <= now) recentKeys.delete(key);
  }
  while (recentKeys.size > MAX_RECENT_KEYS) {
    const oldestKey = recentKeys.keys().next().value;
    if (!oldestKey) break;
    recentKeys.delete(oldestKey);
  }
}

function memoryClaim(key: string): boolean {
  pruneExpiredRecentKeys();
  if (inFlightKeys.has(key)) return false;
  const expiresAt = recentKeys.get(key);
  if (expiresAt && expiresAt > Date.now()) return false;
  inFlightKeys.add(key);
  return true;
}

function memoryComplete(key: string, cacheResult: boolean) {
  inFlightKeys.delete(key);
  if (!cacheResult) return;
  recentKeys.set(key, Date.now() + RECENT_MESSAGE_TTL_MS);
  pruneExpiredRecentKeys();
}

function memoryAbandon(key: string) {
  inFlightKeys.delete(key);
}

/**
 * Atomically claim a message for processing.
 *
 * - With Redis: uses SET NX PX, so the claim is cluster-safe across many
 *   server instances. A subsequent processor will see the key and skip.
 * - Without Redis: uses an in-memory Set + Map (safe for single-instance only).
 *
 * Returns true if this caller owns the claim and should process the message;
 * false if another caller already claimed it.
 */
export async function claimMessageProcessing(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return memoryClaim(key);

  try {
    const result = await redis.set(
      `${REDIS_PREFIX}${key}`,
      "1",
      "PX",
      RECENT_MESSAGE_TTL_MS,
      "NX"
    );
    return result === "OK";
  } catch (err) {
    logger.warn({ err, key }, "Redis claim failed, falling back to in-memory");
    return memoryClaim(key);
  }
}

/**
 * Mark processing complete. The key stays cached so future duplicates are
 * rejected even after the in-flight phase ends.
 */
export async function completeMessageProcessing(
  key: string,
  cacheResult = true
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryComplete(key, cacheResult);
    return;
  }

  if (cacheResult) {
    // Key is already set with TTL by claim; nothing more to do.
    return;
  }

  // Caller asked to NOT cache — release immediately so a retry can re-claim.
  try {
    await redis.del(`${REDIS_PREFIX}${key}`);
  } catch (err) {
    logger.warn({ err, key }, "Redis del failed on complete");
  }
}

/**
 * Release the claim (use when processing failed mid-flight and the message
 * should be re-attempted).
 */
export async function abandonMessageProcessing(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryAbandon(key);
    return;
  }

  try {
    await redis.del(`${REDIS_PREFIX}${key}`);
  } catch (err) {
    logger.warn({ err, key }, "Redis del failed on abandon");
  }
}

/** Test-only — clears in-memory state. No-op when Redis is in use. */
export function __resetInMemoryStateForTests() {
  inFlightKeys.clear();
  recentKeys.clear();
}

export const __INTERNAL = { REDIS_TTL_SECONDS };
