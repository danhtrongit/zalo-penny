import { useEffect, useState } from "react";
import { PageHead } from "@/components/page-head";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SpendingCard } from "@/components/dashboard/spending-card";
import { SpendingCarousel } from "@/components/dashboard/spending-carousel";
import { ArrowRight } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";

interface Stats {
  today: number;
  week: number;
  month: number;
  budget: { amount: number; used: number; remaining: number } | null;
  categories: Record<string, number>;
  transactionCount: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

function formatMoney(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

const months = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];



export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/dashboard/stats"), api.get("/dashboard/recent")])
      .then(([statsRes, recentRes]) => {
        setStats(statsRes.data);
        setRecent(recentRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-6 w-32" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const currentMonth = months[new Date().getMonth()];

  return (
    <div className="space-y-6 pt-4">
      <PageHead title="Trang Chủ" />
      {/* Spending Carousel — bleeds wider to overlap header edge */}
      <div className="-mx-5 -mt-3 px-5 sm:-mx-6 sm:px-6">
        <SpendingCarousel>
          <SpendingCard
            title="HẠN MỨC CHI TIÊU"
            subtitle={currentMonth}
            amount={stats?.budget?.amount || 0}
            budgetTotal={stats?.budget?.amount}
            budgetUsed={stats?.budget?.used}
          />
          <SpendingCard
            title="CHI TIÊU THÁNG NÀY"
            subtitle={currentMonth}
            amount={stats?.month || 0}
            message={`${stats?.transactionCount || 0} giao dịch tháng này`}
          />
          <SpendingCard
            title="CHI TIÊU HÔM NAY"
            subtitle={new Date().toLocaleDateString("vi-VN")}
            amount={stats?.today || 0}
            message="Theo dõi chi tiêu hàng ngày! 📊"
          />
        </SpendingCarousel>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold">Giao dịch gần đây</h2>
          <Link to="/dashboard/transactions">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
              Xem tất cả
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Chưa có giao dịch nào. Hãy nhắn tin cho Penny trên Zalo! 💬
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.slice(0, 8).map((tx) => (
              <Card key={tx.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-base sm:size-10">
                  {(() => { const Icon = getCategoryIcon(tx.category); return <Icon className="size-4 text-primary" />; })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString("vi-VN")} · {tx.category}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-destructive">
                    -{formatMoney(tx.amount)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
