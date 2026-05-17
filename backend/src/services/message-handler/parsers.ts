import { ParsedExpense } from "./types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
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
