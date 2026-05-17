function normalize(text: string): string {
  // Vietnamese đ/Đ are precomposed (U+0111 / U+0110) and NFD doesn't decompose
  // them, so we map them explicitly after the standard diacritic strip.
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function isContradictorySearchPreface(paragraph: string): boolean {
  const normalized = normalize(paragraph);
  const negativeSignals = [
    "xin loi",
    "rat tiec",
    "chua co thong tin",
    "chua cap nhat duoc",
    "khong co thong tin",
    "khong check duoc",
    "khong co du lieu",
    "khong co mat than",
    "anh thong cam",
    "ban thong cam",
  ];
  return negativeSignals.some((signal) => normalized.includes(signal));
}

function looksLikeSearchResult(text: string): boolean {
  const normalized = normalize(text);
  const dataSignals = [
    "*",
    "•",
    ":",
    "gia vang",
    "theo thong tin",
    "cap nhat",
    "usd",
    "vnd",
    "trieu",
    "hom nay",
  ];
  const hasNumber = /\d/.test(text);
  return hasNumber && dataSignals.some((signal) => normalized.includes(signal));
}

export function sanitizeSearchBackedResponse(text: string): string {
  const normalized = text.trim();
  if (!normalized) return normalized;

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length < 2) return normalized;

  const remainingText = paragraphs.slice(1).join("\n\n");
  if (!looksLikeSearchResult(remainingText)) return normalized;

  let index = 0;
  while (index < paragraphs.length - 1 && isContradictorySearchPreface(paragraphs[index])) {
    index += 1;
  }

  return paragraphs.slice(index).join("\n\n");
}
