export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isZaloWebview(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Zalo/i.test(navigator.userAgent);
}
