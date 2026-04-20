export function parseVietnameseCurrency(input: string): number | null {
  const cleaned = input.trim().toLowerCase().replace(/,/g, ".").replace(/\s+/g, "");

  const trMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:tr|triệu)$/);
  if (trMatch) return Math.round(parseFloat(trMatch[1]) * 1_000_000);

  const kMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*k$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);

  const dMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:đ|d|dong|đồng)?$/);
  if (dMatch) {
    const num = parseFloat(dMatch[1]);
    if (num >= 1000) return Math.round(num);
    if (num > 0 && num < 1000) return Math.round(num * 1_000);
  }

  return null;
}
