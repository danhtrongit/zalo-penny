import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Lock,
  CheckCircle2,
  Clock,
  Wallet,
  TrendingUp,
} from "lucide-react";

interface Overview {
  totalUsers: number;
  lockedUsers: number;
  activeSubs: number;
  pendingSubs: number;
  paidThisMonth: number;
  revenueAllTime: number;
  revenueThisMonth: number;
  recentSignups: Array<{ id: string; phone: string; name: string; createdAt: string }>;
}

function money(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Overview>("/admin/stats/overview")
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  const tile = (label: string, value: string | number, Icon: typeof Users) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="mt-1 font-heading text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">Tổng quan</h1>

      {loading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tile("Tổng người dùng", data.totalUsers, Users)}
            {tile("Đã khoá", data.lockedUsers, Lock)}
            {tile("Gói ACTIVE", data.activeSubs, CheckCircle2)}
            {tile("Gói PENDING", data.pendingSubs, Clock)}
            {tile("Doanh thu tháng", money(data.revenueThisMonth), TrendingUp)}
            {tile("Doanh thu tổng", money(data.revenueAllTime), Wallet)}
            {tile("Đã thanh toán/tháng", data.paidThisMonth, CheckCircle2)}
          </div>

          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 font-heading text-base font-bold">
                Người dùng mới
              </h2>
              <ul className="divide-y text-sm">
                {data.recentSignups.map((u) => (
                  <li key={u.id} className="flex justify-between py-2">
                    <span>
                      <b>{u.name}</b> · {u.phone}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(u.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
