import { ParsedExpense } from "./types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

// Vietnamese money tokens (run on a diacritic-stripped string). Bare numbers are
// limited to 5-8 digits so 10-11 digit phone numbers aren't read as money.
const MONEY_TOKEN = /\d+\s*k\b|\d+\s*(?:cu|trieu|tr|nghin|ngan|dong)\b|\b\d{5,8}\b/g;
// Strip the money token from an ORIGINAL (un-normalized) string for the description.
const MONEY_STRIP = /\d+\s*(?:k|củ|triệu|tr|nghìn|ngàn|đồng|đ)\s*\d*/gi;

const MONEY_PATTERNS: [RegExp, (...a: string[]) => number][] = [
  [/(\d+)\s*(?:trieu|tr)\s+(\d+)/, (_m, a, b) => parseInt(a) * 1_000_000 + parseInt(b) * 100_000],
  [/(\d+)\s*cu\s+(\d+)/, (_m, a, b) => parseInt(a) * 1_000_000 + parseInt(b) * 100_000],
  [/(\d+)\s*k\b/, (_m, a) => parseInt(a) * 1_000],
  [/(\d+)\s*cu\b/, (_m, a) => parseInt(a) * 1_000_000],
  [/(\d+)\s*(?:trieu|tr)\b/, (_m, a) => parseInt(a) * 1_000_000],
  [/(\d+)\s*(?:nghin|ngan)\b/, (_m, a) => parseInt(a) * 1_000],
  [/(\d+)\s*(?:dong|d)\b/, (_m, a) => parseInt(a)],
  [/\b(\d{5,8})\b/, (_m, a) => parseInt(a)],
];

/** First money amount in a diacritic-stripped string, or 0 if none. */
function firstMoney(normalized: string): number {
  for (const [regex, calc] of MONEY_PATTERNS) {
    const m = normalized.match(regex);
    if (m) return calc(m[0], m[1], m[2] || "0");
  }
  return 0;
}

function countMoney(normalized: string): number {
  return (normalized.match(MONEY_TOKEN) || []).length;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "1/6", "16/6", "1/6/2026" → "YYYY-MM-DD" (current year if none), or null. */
function parseVnDate(d: string, m: string, y: string | undefined, todayYear: number): string | null {
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12)) return null;
  let year = todayYear;
  if (y) {
    year = parseInt(y, 10);
    if (year < 100) year += 2000;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function cleanDescription(line: string): string {
  return line
    .replace(MONEY_STRIP, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikeExpense(text: string): boolean {
  const normalized = normalize(text);
  const moneyCount = countMoney(normalized);
  if (moneyCount === 0) return false;
  if (moneyCount >= 2) return true; // several amounts → clearly a list of expenses

  const wordCount = normalized.split(/\s+/).length;
  if (wordCount <= 10) return true;

  return /(?:het|ton|mat|mua|an|uong|tra|chi|tieu|ghi|di )/.test(normalized);
}

const DATE_PREFIX = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;

/** True when the message is a multi-line list of expenses (with optional date
 *  headers) — the case the AI collapses into one wrong transaction. */
export function looksLikeBulkList(text: string): boolean {
  if (!/\r?\n/.test(text)) return false;
  const moneyCount = countMoney(normalize(text));
  const hasDateHeader = /^\s*\d{1,2}\/\d{1,2}\b/m.test(text);
  return moneyCount >= 2 || (hasDateHeader && moneyCount >= 1);
}

/**
 * Deterministic parse of a multi-date bulk paste: track the current date from
 * header lines ("16/6"), and emit one expense per priced line dated by that
 * header. Lines without an amount are skipped (we never fabricate a price).
 */
export function parseBulkExpenses(text: string, today: string): ParsedExpense[] {
  const todayYear = parseInt(today.slice(0, 4), 10) || new Date().getFullYear();
  let current = today;
  const out: ParsedExpense[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;

    const dm = line.match(DATE_PREFIX);
    if (dm) {
      const parsed = parseVnDate(dm[1], dm[2], dm[3], todayYear);
      if (parsed) {
        current = parsed;
        line = line.slice(dm[0].length).trim();
      }
    }
    if (!line) continue;

    const amount = firstMoney(normalize(line));
    if (amount <= 0) continue;

    out.push({
      description: cleanDescription(line).slice(0, 100) || "Chi tiêu",
      amount: Math.round(amount),
      category: "Khác",
      date: current,
    });
  }
  return out;
}

/** How many item lines had no amount (so we can honestly tell the user we
 *  skipped them instead of pretending everything was saved). */
export function countUnpricedItemLines(text: string): number {
  let count = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    const dm = line.match(DATE_PREFIX);
    if (dm && parseVnDate(dm[1], dm[2], dm[3], 2000)) line = line.slice(dm[0].length).trim();
    if (!line) continue;
    if (firstMoney(normalize(line)) <= 0) count++;
  }
  return count;
}

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Sanitize an AI/regex-parsed expense before persisting. The model sometimes
 * omits or malforms `date` (→ "Invalid Date") or `category`, which crashed
 * prisma.transaction.create. Returns null when there is no usable amount.
 */
export function normalizeParsedExpense(
  raw: Record<string, unknown>,
  today: string
): ParsedExpense | null {
  const amount = typeof raw.amount === "number" ? raw.amount : Number(raw.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const description =
    typeof raw.description === "string" && raw.description.trim()
      ? raw.description.replace(/\s+/g, " ").trim().slice(0, 100)
      : "Chi tiêu";
  const category =
    typeof raw.category === "string" && raw.category.trim() ? raw.category.trim() : "Khác";
  const rawDate = typeof raw.date === "string" ? raw.date : "";
  const date =
    VALID_DATE.test(rawDate) && !Number.isNaN(new Date(rawDate).getTime()) ? rawDate : today;

  return { description, amount: Math.round(amount), category, date };
}

/**
 * Deterministic match for a login/dashboard request typed without a slash
 * ("đăng nhập", "login", "mở dashboard"). Anchored to the start so it doesn't
 * hijack ordinary chat that merely contains the word. Kept off the AI path.
 */
export function looksLikeLoginRequest(text: string): boolean {
  const t = normalize(text).trim();
  return /^(dang nhap|dangnhap|login|log in|mo dashboard|vao dashboard|dashboard|mo web|vao web)\b/.test(
    t
  );
}

/**
 * Classify a short reply as a yes/no confirmation (for the delete-confirm gate).
 * Returns null when it isn't clearly either, so the caller can fall through to
 * normal handling. Negative is checked first — "đừng xoá" (dung xoa) must not be
 * mistaken for the affirmative "xoá".
 */
export function parseConfirmation(text: string): "yes" | "no" | null {
  const t = normalize(text).trim();
  if (!t) return null;
  if (/^(huy|khong|thoi|khoi|bo qua|no|dung xoa|dung lai|dung co)\b/.test(t)) return "no";
  if (/^(u|uh|um|co|oke|ok|okay|okie|yes|y|chuan|xac nhan|dong y|dung roi|xoa di|xoa|dc|duoc)\b/.test(t)) {
    return "yes";
  }
  return null;
}

export function parseExpenseByRegex(text: string): ParsedExpense[] {
  const amount = firstMoney(normalize(text));
  if (amount <= 0) return [];

  const description = cleanDescription(text).replace(/\d{5,}/g, "").trim() || text.trim();

  return [
    {
      description: description.slice(0, 100),
      amount: Math.round(amount),
      category: "Khác",
      date: new Date().toISOString().slice(0, 10),
    },
  ];
}
