import {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Gamepad2,
  FileText,
  HeartPulse,
  GraduationCap,
  Home,
  Pin,
  type LucideIcon,
} from "lucide-react";

const categoryIconMap: Record<string, LucideIcon> = {
  "Ăn uống": UtensilsCrossed,
  "Di chuyển": Car,
  "Mua sắm": ShoppingBag,
  "Giải trí": Gamepad2,
  "Hóa đơn": FileText,
  "Sức khỏe": HeartPulse,
  "Giáo dục": GraduationCap,
  "Nhà cửa": Home,
  "Khác": Pin,
};

export function getCategoryIcon(category: string): LucideIcon {
  return categoryIconMap[category] || Pin;
}
