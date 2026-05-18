import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentRow {
  id: string;
  amount: number;
  method: string | null;
  transactionId: string | null;
  status: "PENDING" | "PAID" | "FAILED";
  paidAt: string | null;
  createdAt: string;
  subscription: {
    invoiceNumber: string;
    user: { id: string; phone: string; name: string };
    plan: { name: string };
  };
}

interface ListResponse {
  data: PaymentRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    api
      .get<ListResponse>("/admin/payments", {
        params: {
          page,
          limit: 20,
          status: status || undefined,
          search: search || undefined,
        },
      })
      .then(({ data }) => {
        setRows(data.data);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page, status, search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Thanh toán</h1>

      <div className="flex gap-2">
        <Input
          placeholder="Tìm invoice hoặc SĐT…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="flex-1"
        />
        <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v === "ALL" ? "" : v); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="PAID">PAID</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
            <SelectItem value="FAILED">FAILED</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <Skeleton className="m-3 h-64" />
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Không có giao dịch</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Invoice</th>
                    <th className="px-4 py-2 text-left">User</th>
                    <th className="px-4 py-2 text-left">Gói</th>
                    <th className="px-4 py-2 text-right">Số tiền</th>
                    <th className="px-4 py-2 text-left">Phương thức</th>
                    <th className="px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2 text-left">Paid at</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{p.subscription.invoiceNumber}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{p.subscription.user.name}</div>
                        <div className="text-xs text-muted-foreground">{p.subscription.user.phone}</div>
                      </td>
                      <td className="px-4 py-2">{p.subscription.plan.name}</td>
                      <td className="px-4 py-2 text-right font-semibold">{p.amount.toLocaleString("vi-VN")}đ</td>
                      <td className="px-4 py-2">{p.method ?? "—"}</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={
                            p.status === "PAID"
                              ? "secondary"
                              : p.status === "PENDING"
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {p.paidAt ? new Date(p.paidAt).toLocaleString("vi-VN") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Tổng: {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Trang trước
          </Button>
          <span className="self-center">Trang {page}</span>
          <Button variant="outline" size="sm" disabled={rows.length < 20} onClick={() => setPage(page + 1)}>
            Trang sau
          </Button>
        </div>
      </div>
    </div>
  );
}
