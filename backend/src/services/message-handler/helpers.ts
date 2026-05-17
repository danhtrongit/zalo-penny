export function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

export function cleanThinkingArtifacts(text: string): string {
  let cleaned = text.trim();
  const doubleNewline = cleaned.indexOf("\n\n");
  if (doubleNewline > 0 && doubleNewline <= 15) {
    cleaned = cleaned.slice(doubleNewline + 2).trim();
  }
  return cleaned;
}

function normalizeForCheck(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function shouldAwaitFollowUp(response: string): boolean {
  if (/\?/.test(response)) return true;
  const normalized = normalizeForCheck(response);
  return /(?:khong nha|nhe|di nha|doi ti|cho ti|cho chut|de .{0,20} xem|cho xin|nghe khong|duoc khong|muon khong|ha\b|hen\b|nha\b)/.test(
    normalized
  );
}

export function isOptionAgnosticReply(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return /(?:dai di|n[aà]o c[uũ]ng d[uư][oợ]c|bat ky|cu check|cu lam|chon dai|sao cung duoc|check thu|check dai)/i.test(
    normalized
  );
}

export function shouldUseGoogleSearch(text: string, historyContext: string): boolean {
  const combined = normalizeForCheck(`${historyContext}\n${text}`);

  const temporalSignals = [
    "hom nay",
    "bay gio",
    "hien tai",
    "moi nhat",
    "latest",
    "today",
    "tin tuc",
    "news",
  ];

  const realtimeTopics = [
    "gia vang",
    "vang sjc",
    "ty gia",
    "usd",
    "btc",
    "bitcoin",
    "crypto",
    "co phieu",
    "chung khoan",
    "thoi tiet",
    "ket qua bong da",
    "ti so",
    "lich thi dau",
    "gia xang",
    "lai suat",
  ];

  return (
    temporalSignals.some((signal) => combined.includes(signal)) ||
    realtimeTopics.some((topic) => combined.includes(topic))
  );
}
