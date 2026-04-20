import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  subscription: { status: string; plan: { name: string }; endDate: string } | null;
  botConfig: { isActive: boolean } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.get("/admin/users", { params: { page } }).then(({ data }) => {
      setUsers(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    });
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Người dùng</h1>
        <Badge variant="secondary">{total} users</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Gói</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Bot</TableHead>
                <TableHead>Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.subscription?.plan?.name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={u.subscription?.status === "ACTIVE" ? "default" : "secondary"}>
                      {u.subscription?.status || "Chưa đăng ký"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.botConfig?.isActive ? (
                      <Badge variant="default">Online</Badge>
                    ) : (
                      <Badge variant="secondary">Offline</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Trước
          </Button>
          <span className="flex items-center text-sm">Trang {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
