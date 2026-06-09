import { env } from "../config/env";

/** URL of the public pricing/upgrade page. */
export function upgradeUrl(): string {
  return `${env.frontendUrl}/pricing`;
}

/** Append a standard, model-proof upgrade call-to-action to a message body. */
export function appendUpgradeLink(text: string): string {
  return `${text}\n\n👉 Nâng cấp để dùng không giới hạn: ${upgradeUrl()}`;
}
