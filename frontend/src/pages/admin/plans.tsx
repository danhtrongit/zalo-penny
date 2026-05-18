import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash } from "lucide-react";
import { PlanFormDialog, type PlanRow } from "@/components/admin/plan-form-dialog";

interface PlanWithCount extends PlanRow {
  id: string;
  _count: { subscriptions: number };
}

export default function AdminPlansPage() {
  const [rows, setRows] = useState<PlanWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [open, setOpen] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    api
      .get<PlanWithCount[]>("/admin/plans")
      .then(({ data }) => setRows(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = async (id: string) => {
    if (!confirm("Xoá / vô hiệu hoá gói này?")) return;
    try {
      const { data } = await api.delete<{ ok: boolean; softDeleted: boolean }>(`/admin/plans/${id}`);
      toast.success(data.softDeleted ? "Đã vô hiệu hoá (có sub tham chiếu)" : "Đã xoá");
      fetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Xoá thất bại");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Gói cước</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1 size-4" /> Tạo gói
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <Skeleton className="m-3 h-48" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Tên</th>
                    <th className="px-4 py-2 text-left">Slug</th>
                    <th className="px-4 py-2 text-right">Giá</th>
                    <th className="px-4 py-2 text-right">Ngày</th>
                    <th className="px-4 py-2 text-right">Subs</th>
                    <th className="px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{p.slug}</td>
                      <td className="px-4 py-2 text-right">{p.price.toLocaleString("vi-VN")}đ</td>
                      <td className="px-4 py-2 text-right">{p.durationDays}</td>
                      <td className="px-4 py-2 text-right">{p._count.subscriptions}</td>
                      <td className="px-4 py-2">
                        {p.isActive ? (
                          <Badge variant="secondary">Đang bán</Badge>
                        ) : (
                          <Badge variant="outline">Ẩn</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => remove(p.id)}>
                          <Trash className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PlanFormDialog
        initial={editing}
        open={open}
        onOpenChange={setOpen}
        onSaved={fetch}
      />
    </div>
  );
}
