import * as zaloApi from "../utils/zalo-api";
import { ZaloApiError } from "../utils/zalo-api";

interface CacheEntry {
  healthy: boolean;
  expiresAt: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/**
 * True when the OWNED bot's token is usable (getMe succeeds), false only on a
 * definitive 401. Transient/other errors return true so we never show a false
 * "your bot is broken" banner. Cached per botConfigId for TTL_MS to avoid
 * hammering Zalo from the polled botStatus endpoint.
 */
export async function getOwnedBotHealth(
  botConfigId: string,
  botToken: string
): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(botConfigId);
  if (hit && hit.expiresAt > now) return hit.healthy;

  let healthy = true;
  try {
    await zaloApi.getMe(botToken);
    healthy = true;
  } catch (err) {
    healthy = !(err instanceof ZaloApiError && err.errorCode === 401);
  }

  cache.set(botConfigId, { healthy, expiresAt: now + TTL_MS });
  return healthy;
}

export function clearBotHealthCache(): void {
  cache.clear();
}
