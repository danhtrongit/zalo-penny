import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Unlock, Eye, Search } from "lucide-react";
import { LockUserDialog } from "@/components/admin/lock-user-dialog";

interface AdminUserRow {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  role: "USER" | "ADMIN";
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
  subscription: {
    status: string;
    endDate: string | null;
    plan: { name: string; slug: string } | null;
  } | null;
  botConfig: { isActive: boolean } | null;
}

interface ListResponse {
  data: AdminUserRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [lockTarget, setLockTarget] = useState<string | null>(null);

  const fetchPage = useCallback(() => {
    setLoading(true);
    api
      .get<ListResponse>("/admin/users", { params: { page, limit: 20, search: search || undefined } })
      .then(({ data }) => {
        setRows(data.data);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const unlock = async (id: string) => {
    try {
      await api.post(`/admin/users/${id}/unlock`);
      toast.success("Đã mở khoá");
      fetchPage();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Mở khoá thất bại");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Người dùng</h1>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo SĐT, tên, email…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <Skeleton className="m-3 h-64" />
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Không có người dùng khớp tìm kiếm
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Tên / SĐT</th>
                    <th className="px-4 py-2 text-left">Gói</th>
                    <th className="px-4 py-2 text-left">Bot</th>
                    <th className="px-4 py-2 text-left">Vai trò</th>
                    <th className="px-4 py-2 text-left">Trạng thái</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.phone}</div>
                      </td>
                      <td className="px-4 py-2">
                        {u.subscription ? (
                          <>
                            <Badge variant={u.subscription.status === "ACTIVE" ? "secondary" : "outline"}>
                              {u.subscription.status}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {u.subscription.plan?.name ?? "—"}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Chưa có</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {u.botConfig?.isActive ? (
                          <Badge variant="secondary">Đã kết nối</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={u.role === "ADMIN" ? "default" : "outline"}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        {u.isLocked ? (
                          <Badge variant="destructive">Đã khoá</Badge>
                        ) : (
                          <Badge variant="secondary">Bình thường</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Link to={`/admin/users/${u.id}`}>
                            <Button variant="ghost" size="icon" className="size-7">
                              <Eye className="size-3.5" />
                            </Button>
                          </Link>
                          {u.isLocked ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => unlock(u.id)}
                              title="Mở khoá"
                            >
                              <Unlock className="size-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => setLockTarget(u.id)}
                              title="Khoá"
                            >
                              <Lock className="size-3.5" />
                            </Button>
                          )}
                        </div>
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
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length < 20}
            onClick={() => setPage(page + 1)}
          >
            Trang sau
          </Button>
        </div>
      </div>

      {lockTarget && (
        <LockUserDialog
          userId={lockTarget}
          open={!!lockTarget}
          onOpenChange={(open) => !open && setLockTarget(null)}
          onDone={fetchPage}
        />
      )}
    </div>
  );
}
