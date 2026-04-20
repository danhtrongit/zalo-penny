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
