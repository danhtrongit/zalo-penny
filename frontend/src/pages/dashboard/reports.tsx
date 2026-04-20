import { useEffect, useState } from "react";
import { PageHead } from "@/components/page-head";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Receipt, PiggyBank } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";

interface ReportData {
  period: string;
  total: number;
  transactionCount: number;
  categories: Record<string, { total: number; count: number }>;
  budget: { amount: number; used: number } | null;
}

function formatMoney(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}



export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/reports", { params: { period } })
      .then(({ data }) => setReport(data))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const sortedCategories = report?.categories
    ? Object.entries(report.categories).sort(([, a], [, b]) => b.total - a.total)
    : [];

  const maxCatTotal = sortedCategories.length > 0 ? sortedCategories[0][1].total : 1;

  return (
    <div className="space-y-5 pt-4">
      <PageHead title="Báo Cáo" description="Xem báo cáo chi tiêu theo tuần, tháng và danh mục" />
      <h1 className="font-heading text-xl font-bold sm:text-2xl">Báo cáo chi tiêu</h1>

      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">Hôm nay</TabsTrigger>
          <TabsTrigger value="week" className="flex-1">Tuần</TabsTrigger>
          <TabsTrigger value="month" className="flex-1">Tháng</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="size-4" />
                  <span className="text-xs font-medium">Tổng chi</span>
                </div>
                <p className="mt-1 font-heading text-lg font-bold sm:text-xl">
                  {formatMoney(report?.total || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Receipt className="size-4" />
                  <span className="text-xs font-medium">Giao dịch</span>
                </div>
                <p className="mt-1 font-heading text-lg font-bold sm:text-xl">
                  {report?.transactionCount || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Budget Card */}
          {report?.budget && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <PiggyBank className="size-4" />
                  <span className="text-xs font-medium">Ngân sách</span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <p className="font-heading text-2xl font-bold">
                    {Math.min(100, Math.round((report.budget.used / report.budget.amount) * 100))}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(report.budget.used)} / {formatMoney(report.budget.amount)}
                  </p>
                </div>
                <Progress
                  value={Math.min(100, (report.budget.used / report.budget.amount) * 100)}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          )}

          {/* Categories Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Phân bổ theo danh mục</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedCategories.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedCategories.map(([cat, data]) => (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {(() => { const Icon = getCategoryIcon(cat); return <Icon className="size-4 text-primary" />; })()}
                          <span className="text-sm font-medium">{cat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {data.count}
                          </Badge>
                          <span className="text-sm font-semibold">
                            {formatMoney(data.total)}
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={(data.total / maxCatTotal) * 100}
                        className="h-1.5"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
