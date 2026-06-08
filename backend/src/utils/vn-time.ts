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
