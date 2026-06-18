import { REMINDER_TZ } from "../config/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The Vietnam-local calendar date (YYYY-MM-DD) for a given instant. */
export function vnDateStr(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REMINDER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** UTC instant of 00:00 Vietnam-time for a YYYY-MM-DD date string. (VN = UTC+7, no DST.) */
export function startOfVnDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+07:00`);
}

/** Array of the last `days` VN calendar dates (YYYY-MM-DD), oldest first, including today. */
export function vnDateRange(days: number): string[] {
  const start = startOfVnDay(vnDateStr(new Date()));
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(vnDateStr(new Date(start.getTime() - i * DAY_MS)));
  }
  return out;
}

export interface VnRange {
  /** inclusive lower bound (UTC instant) */
  start: Date;
  /** exclusive upper bound (UTC instant) */
  end: Date;
  /** human label for the report header, e.g. "hôm qua", "tuần này" */
  label: string;
}

/** Strip Vietnamese diacritics + lowercase for robust phrase matching. */
function normalizeVn(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/** Shift a YYYY-MM-DD by whole days using UTC arithmetic (timezone-independent). */
function shiftDateStr(dateStr: string, deltaDays: number): string {
  return new Date(Date.parse(`${dateStr}T00:00:00Z`) + deltaDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Monday=0 .. Sunday=6 for a YYYY-MM-DD calendar date. */
function mondayIndex(dateStr: string): number {
  const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // Sun=0..Sat=6
  return (dow + 6) % 7;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const vnRange = (startStr: string, endExclStr: string, label: string): VnRange => ({
  start: startOfVnDay(startStr),
  end: startOfVnDay(endExclStr),
  label,
});

/**
 * Map a Vietnamese time phrase in `text` to a half-open VN-day range
 * [start, end) as UTC instants. Returns null when no known phrase is present.
 * Deterministic — used so bot reports never depend on the LLM for date math.
 */
export function resolveVnRange(text: string, now: Date = new Date()): VnRange | null {
  const t = normalizeVn(text);
  const today = vnDateStr(now);
  const [y, m] = today.split("-").map(Number);

  // "N ngày qua/trước/gần đây" — rolling window ending today (inclusive).
  const nDays = t.match(/(\d{1,3})\s*ngay\s*(qua|truoc|gan day|vua qua|nay)?\b/);
  if (nDays) {
    const n = Math.max(1, Math.min(366, parseInt(nDays[1], 10)));
    return vnRange(shiftDateStr(today, -(n - 1)), shiftDateStr(today, 1), `${n} ngày qua`);
  }
  if (/\bhom qua\b|\byesterday\b/.test(t)) {
    return vnRange(shiftDateStr(today, -1), today, "hôm qua");
  }
  if (/\bhom nay\b|\btoday\b/.test(t)) {
    return vnRange(today, shiftDateStr(today, 1), "hôm nay");
  }
  if (/\btuan (truoc|vua qua|roi|qua)\b|\blast week\b/.test(t)) {
    const mon = shiftDateStr(today, -mondayIndex(today));
    return vnRange(shiftDateStr(mon, -7), mon, "tuần trước");
  }
  if (/\btuan nay\b|\bthis week\b/.test(t)) {
    const mon = shiftDateStr(today, -mondayIndex(today));
    return vnRange(mon, shiftDateStr(mon, 7), "tuần này");
  }
  if (/\bthang (truoc|qua|vua roi|roi)\b|\blast month\b/.test(t)) {
    const ps = m === 1 ? `${y - 1}-12-01` : `${y}-${pad2(m - 1)}-01`;
    return vnRange(ps, `${y}-${pad2(m)}-01`, "tháng trước");
  }
  if (/\bthang nay\b|\bthis month\b/.test(t)) {
    const me = m === 12 ? `${y + 1}-01-01` : `${y}-${pad2(m + 1)}-01`;
    return vnRange(`${y}-${pad2(m)}-01`, me, "tháng này");
  }
  return null;
}
