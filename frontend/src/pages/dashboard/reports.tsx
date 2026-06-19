import { useCallback, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { PageHead } from "@/components/page-head";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Receipt, PiggyBank, Pencil, Image as ImageIcon } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  EditTransactionDialog,
  type EditableTransaction,
} from "@/components/dashboard/edit-transaction-dialog";
import { ReceiptViewerDialog } from "@/components/dashboard/receipt-viewer-dialog";

interface ReceiptRef {
  id: string;
  fileUrl: string;
  fileType: string;
}

interface TransactionRow {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  receipt?: ReceiptRef | null;
}

interface ReportData {
  period: string;
  startDate: string;
  endDate: string;
  total: number;
  transactionCount: number;
  categories: Record<string, { total: number; count: number }>;
  budget: { amount: number; used: number } | null;
  transactions: TransactionRow[];
}

function formatMoney(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange | undefined>({
    from: startOfMonth(),
    to: new Date(),
  });

  const [editing, setEditing] = useState<EditableTransaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [viewingReceipt, setViewingReceipt] = useState<ReceiptRef | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const fetchReport = useCallback(() => {
    if (!range?.from || !range?.to) return;
    setLoading(true);
    api
      .get("/reports", {
        params: {
          startDate: format(range.from, "yyyy-MM-dd"),
          endDate: format(range.to, "yyyy-MM-dd"),
        },
      })
      .then(({ data }) => setReport(data))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const openEdit = (tx: TransactionRow) => {
    setEditing({
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      category: tx.category,
      date: tx.date,
    });
    setEditOpen(true);
  };

  const openReceipt = (r: ReceiptRef) => {
    setViewingReceipt(r);
    setReceiptOpen(true);
  };

  const sortedCategories = report?.categories
    ? Object.entries(report.categories).sort(([, a], [, b]) => b.total - a.total)
    : [];
  const maxCatTotal = sortedCategories.length > 0 ? sortedCategories[0][1].total : 1;

  return (
    <div className="space-y-5 pt-4">
      <PageHead
        title="Báo Cáo"
        description="Xem báo cáo chi tiêu theo khoảng ngày tuỳ chọn"
      />
      <h1 className="font-heading text-xl font-bold sm:text-2xl">
        Báo cáo chi tiêu
      </h1>

      <DateRangePicker value={range} onChange={setRange} />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : (
        <>
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

          {report?.budget && report.budget.amount > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <PiggyBank className="size-4" />
                  <span className="text-xs font-medium">Ngân sách</span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <p className="font-heading text-2xl font-bold">
                    {Math.min(
                      100,
                      Math.round((report.budget.used / report.budget.amount) * 100)
                    )}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(report.budget.used)} /{" "}
                    {formatMoney(report.budget.amount)}
                  </p>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (report.budget.used / report.budget.amount) * 100
                  )}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          )}

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
                  {sortedCategories.map(([cat, data]) => {
                    const Icon = getCategoryIcon(cat);
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-primary" />
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Chi tiết giao dịch ({report?.transactions.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {!report?.transactions?.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Chưa có giao dịch trong khoảng này
                </p>
              ) : (
                <ul className="divide-y">
                  {report.transactions.map((tx) => {
                    const Icon = getCategoryIcon(tx.category);
                    return (
                      <li
                        key={tx.id}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                          <Icon className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {tx.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.date).toLocaleDateString("vi-VN")} ·{" "}
                            {tx.category}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-destructive">
                          -{formatMoney(tx.amount)}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          {tx.receipt && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => openReceipt(tx.receipt!)}
                              title="Xem hoá đơn"
                            >
                              <ImageIcon className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openEdit(tx)}
                            title="Chỉnh sửa"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <EditTransactionDialog
        transaction={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchReport}
      />
      <ReceiptViewerDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        fileUrl={viewingReceipt?.fileUrl ?? null}
        fileType={viewingReceipt?.fileType ?? null}
      />
    </div>
  );
}
