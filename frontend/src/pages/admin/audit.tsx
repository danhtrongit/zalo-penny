import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditRow {
  id: string;
  action: string;
  summary: string | null;
  payload: unknown;
  createdAt: string;
  admin: { id: string; phone: string; name: string };
}

interface ListResponse {
  data: AuditRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    api
      .get<ListResponse>("/admin/subscriptions/audit", {
        params: { page, limit: 50 },
      })
      .then(({ data }) => {
        setRows(data.data);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Lịch sử admin</h1>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <Skeleton className="m-3 h-64" />
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Chưa có hành động nào</p>
          ) : (
            <ul className="divide-y text-sm">
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{r.action}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <p className="mt-1 truncate">{r.summary ?? "(không có tóm tắt)"}</p>
                      <p className="text-xs text-muted-foreground">bởi {r.admin.name} ({r.admin.phone})</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    >
                      {openId === r.id ? "Ẩn payload" : "Xem payload"}
                    </Button>
                  </div>
                  {openId === r.id && (
                    <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                      {JSON.stringify(r.payload, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
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
          <Button variant="outline" size="sm" disabled={rows.length < 50} onClick={() => setPage(page + 1)}>
            Trang sau
          </Button>
        </div>
      </div>
    </div>
  );
}
