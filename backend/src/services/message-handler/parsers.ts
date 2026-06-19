import { ParsedExpense } from "./types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function looksLikeExpense(text: string): boolean {
  const normalized = normalize(text);

  const moneyPattern =
    /(?:\d+\s*k\b|\d+\s*(?:cu|trieu|tr|nghin|ngan|dong)\b|\d{5,})/.test(normalized);

  if (!moneyPattern) return false;

  const wordCount = normalized.split(/\s+/).length;
  if (wordCount <= 10) return true;

  return /(?:het|ton|mat|mua|an|uong|tra|chi|tieu|ghi|di )/.test(normalized);
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
      ? raw.description.trim().slice(0, 100)
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
  const normalized = normalize(text);

  let amount = 0;
  const patterns: [RegExp, (...args: string[]) => number][] = [
    [/(\d+)\s*(?:trieu|tr)\s+(\d+)/, (_m, a, b) => parseInt(a) * 1_000_000 + parseInt(b) * 100_000],
    [/(\d+)\s*cu\s+(\d+)/, (_m, a, b) => parseInt(a) * 1_000_000 + parseInt(b) * 100_000],
    [/(\d+)\s*k\b/, (_m, a) => parseInt(a) * 1_000],
    [/(\d+)\s*cu\b/, (_m, a) => parseInt(a) * 1_000_000],
    [/(\d+)\s*(?:trieu|tr)\b/, (_m, a) => parseInt(a) * 1_000_000],
    [/(\d+)\s*(?:nghin|ngan)\b/, (_m, a) => parseInt(a) * 1_000],
    [/(\d+)\s*(?:dong|d)\b/, (_m, a) => parseInt(a)],
    [/(\d{5,})/, (_m, a) => parseInt(a)],
  ];

  for (const [regex, calc] of patterns) {
    const match = normalized.match(regex);
    if (match) {
      amount = calc(match[0], match[1], match[2] || "0");
      break;
    }
  }

  if (amount <= 0) return [];

  const description =
    text
      .replace(/\d+\s*(?:k|củ|triệu|tr|nghìn|ngàn|đồng|đ)\s*\d*/gi, "")
      .replace(/\d{5,}/g, "")
      .trim() || text.trim();

  return [
    {
      description: description.slice(0, 100),
      amount,
      category: "Khác",
      date: new Date().toISOString().slice(0, 10),
    },
  ];
}
