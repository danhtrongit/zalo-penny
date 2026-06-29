import crypto from "node:crypto";

// Unambiguous uppercase alphabet — excludes 0/O, 1/I/L so a code is safe to
// read aloud, type by hand, or OCR from a QR-less screenshot.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 7;

/** A fresh random referral code (not checked for DB uniqueness — caller retries on collision). */
export function generateReferralCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return out;
}

/** Normalize a user-typed code: trim, uppercase, strip anything non-alphanumeric. */
export function normalizeReferralCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length ? cleaned : null;
}

/** Commission in VND = floor(amount * pct / 100). Guards against junk inputs. */
export function computeCommission(amount: number, pct: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(pct)) return 0;
  if (amount <= 0 || pct <= 0) return 0;
  return Math.floor((amount * pct) / 100);
}

/** Admin-settable commission percentage must be a whole number in 0..100. */
export function isValidCommissionPct(pct: unknown): pct is number {
  return typeof pct === "number" && Number.isInteger(pct) && pct >= 0 && pct <= 100;
}

/** Build the shareable invite link, tolerating a trailing slash on the base URL. */
export function buildReferralLink(baseUrl: string, code: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/register?ref=${encodeURIComponent(code)}`;
}
