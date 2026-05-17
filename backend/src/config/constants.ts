export const SEPAY_AUTHORIZED_IPS = [
  "172.236.138.20",
  "172.233.83.68",
  "171.244.35.2",
  "151.158.108.68",
  "151.158.109.79",
  "103.255.238.139",
] as const;

export const SEPAY_CHECKOUT_URL = {
  sandbox: "https://pay-sandbox.sepay.vn/v1/checkout/init",
  production: "https://pay.sepay.vn/v1/checkout/init",
} as const;

export const PHONE_REGEX = /^0\d{9,10}$/;

export const DEFAULT_CATEGORIES = [
  "Ăn uống",
  "Di chuyển",
  "Mua sắm",
  "Giải trí",
  "Hóa đơn",
  "Sức khỏe",
  "Giáo dục",
  "Nhà cửa",
  "Khác",
] as const;

export type Category = (typeof DEFAULT_CATEGORIES)[number];

export const VERIFICATION_TTL_MS = 5 * 60 * 1000;
export const VERIFICATION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export const REQUEST_BODY_LIMIT = "10mb";
