const RECENT_MESSAGE_TTL_MS = 10 * 60 * 1000;
const MAX_RECENT_KEYS = 5000;

const inFlightKeys = new Set<string>();
const recentKeys = new Map<string, number>();

function pruneExpiredRecentKeys() {
  const now = Date.now();

  for (const [key, expiresAt] of recentKeys) {
    if (expiresAt <= now) {
      recentKeys.delete(key);
    }
  }

  while (recentKeys.size > MAX_RECENT_KEYS) {
    const oldestKey = recentKeys.keys().next().value;
    if (!oldestKey) {
      break;
    }

    recentKeys.delete(oldestKey);
  }
}

export function claimMessageProcessing(key: string): boolean {
  pruneExpiredRecentKeys();

  if (inFlightKeys.has(key)) {
    return false;
  }

  const expiresAt = recentKeys.get(key);
  if (expiresAt && expiresAt > Date.now()) {
    return false;
  }

  inFlightKeys.add(key);
  return true;
}

export function completeMessageProcessing(key: string, cacheResult = true) {
  inFlightKeys.delete(key);

  if (!cacheResult) {
    return;
  }

  recentKeys.set(key, Date.now() + RECENT_MESSAGE_TTL_MS);
  pruneExpiredRecentKeys();
}

export function abandonMessageProcessing(key: string) {
  inFlightKeys.delete(key);
}
