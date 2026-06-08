import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash, AlertTriangle } from "lucide-react";
import { BotFormDialog, type BotRow } from "@/components/admin/bot-form-dialog";

interface BotItem extends BotRow {
  id: string;
  _count: { assignments: number };
  assignments: { user: { id: string; name: string; phone: string } }[];
}

export default function AdminBotsPage() {
  const [bots, setBots] = useState<BotItem[]>([]);
  const [awaiting, setAwaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BotRow | null>(null);
  const [open, setOpen] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    api
      .get<{ bots: BotItem[]; awaiting: number }>("/admin/bots")
      .then(({ data }) => {
        setBots(data.bots);
        setAwaiting(data.awaiting);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = async (id: string) => {
    if (!confirm("Xoá bot này khỏi pool?")) return;
    try {
      await api.delete(`/admin/bots/${id}`);
      toast.success("Đã xoá");
      fetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Xoá thất bại");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Bot Pool</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1 size-4" /> Thêm bot
        </Button>
      </div>

      {awaiting > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0" />
          Có {awaiting} user đã thanh toán nhưng chưa được cấp bot (pool đầy). Hãy thêm bot hoặc tăng sức chứa.
        </div>
      )}

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
                    <th className="px-4 py-2 text-left">Tải</th>
                    <th className="px-4 py-2 text-left">User</th>
                    <th className="px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bots.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        Chưa có bot nào. Thêm bot để user mới được cấp tự động.
                      </td>
                    </tr>
                  )}
                  {bots.map((b) => (
                    <tr key={b.id} className="align-top hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{b.label}</td>
                      <td className="px-4 py-2">
                        {b._count.assignments}/{b.capacity}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {b.assignments.map((a) => a.user.name).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {b.isActive ? <Badge variant="secondary">Bật</Badge> : <Badge variant="outline">Tắt</Badge>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            setEditing({
                              id: b.id,
                              label: b.label,
                              capacity: b.capacity,
                              botLink: b.botLink,
                              qrImageUrl: b.qrImageUrl,
                              isActive: b.isActive,
                            });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => remove(b.id)}>
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

      <BotFormDialog initial={editing} open={open} onOpenChange={setOpen} onSaved={fetch} />
    </div>
  );
}
