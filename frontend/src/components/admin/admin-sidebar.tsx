import { NavLink } from "react-router-dom";
import {
  Gauge,
  Users,
  Package,
  CreditCard,
  Megaphone,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Tổng quan", icon: Gauge, end: true },
  { to: "/admin/users", label: "Người dùng", icon: Users },
  { to: "/admin/plans", label: "Gói cước", icon: Package },
  { to: "/admin/payments", label: "Thanh toán", icon: CreditCard },
  { to: "/admin/notifications", label: "Gửi thông báo", icon: Megaphone },
  { to: "/admin/audit", label: "Lịch sử admin", icon: ScrollText },
];

export function AdminSidebar() {
  return (
    <nav className="space-y-1 p-3 text-sm">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )
            }
          >
            <Icon className="size-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
