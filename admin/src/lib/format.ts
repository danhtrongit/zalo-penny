const VND = new Intl.NumberFormat("vi-VN");

/** Format an integer amount (đồng) as Vietnamese currency, e.g. 1234567 → "1.234.567 ₫". */
export function formatVnd(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return `${VND.format(Math.round(amount))} ₫`;
}

/** Format a plain integer with vi-VN grouping. */
export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return VND.format(n);
}

/** Format an ISO date/Date as dd/MM/yyyy (vi-VN), or "—" when empty. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Format an ISO date/Date as dd/MM/yyyy HH:mm (vi-VN), or "—" when empty. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
