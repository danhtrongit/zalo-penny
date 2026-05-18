import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Crown } from "lucide-react";
import { ManualUpgradeDialog } from "@/components/admin/manual-upgrade-dialog";

interface UserDetail {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  role: "USER" | "ADMIN";
  isLocked: boolean;
  lockedAt: string | null;
  lockedReason: string | null;
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    invoiceNumber: string;
    plan: { name: string; slug: string };
    payment: {
      status: string;
      paidAt: string | null;
      method: string | null;
      amount: number;
    } | null;
  } | null;
  botConfig: { id: string; isActive: boolean; connectedAt: string | null } | null;
  persona: unknown;
  _count: { transactions: number; receipts: number; budgets: number };
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const fetch = () => {
    setLoading(true);
    api
      .get<UserDetail>(`/admin/users/${id}`)
      .then(({ data }) => setUser(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading || !user) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/users" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="size-4" /> Quay lại
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.phone} · {user.email ?? "—"}</p>
        </div>
        <Button onClick={() => setUpgradeOpen(true)}>
          <Crown className="mr-1 size-4" /> Nâng cấp gói
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {user.subscription ? (
              <>
                <p><span className="text-muted-foreground">Gói: </span><b>{user.subscription.plan.name}</b></p>
                <p>
                  <span className="text-muted-foreground">Trạng thái: </span>
                  <Badge variant={user.subscription.status === "ACTIVE" ? "secondary" : "outline"}>
                    {user.subscription.status}
                  </Badge>
                </p>
                <p><span className="text-muted-foreground">Bắt đầu: </span>{user.subscription.startDate ? new Date(user.subscription.startDate).toLocaleString("vi-VN") : "—"}</p>
                <p><span className="text-muted-foreground">Hết hạn: </span>{user.subscription.endDate ? new Date(user.subscription.endDate).toLocaleString("vi-VN") : "—"}</p>
                <p><span className="text-muted-foreground">Invoice: </span>{user.subscription.invoiceNumber}</p>
                {user.subscription.payment && (
                  <p>
                    <span className="text-muted-foreground">Payment: </span>
                    {user.subscription.payment.status} · {user.subscription.payment.method ?? "—"} · {user.subscription.payment.amount.toLocaleString("vi-VN")}đ
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Chưa có subscription</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hoạt động</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Giao dịch: </span>{user._count.transactions}</p>
            <p><span className="text-muted-foreground">Hoá đơn: </span>{user._count.receipts}</p>
            <p><span className="text-muted-foreground">Ngân sách: </span>{user._count.budgets}</p>
            <p><span className="text-muted-foreground">Bot: </span>{user.botConfig?.isActive ? "Đã kết nối" : "Chưa kết nối"}</p>
            {user.isLocked && (
              <p className="text-destructive">
                Đã khoá {user.lockedAt ? `lúc ${new Date(user.lockedAt).toLocaleString("vi-VN")}` : ""} · {user.lockedReason ?? "(không lý do)"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quyền hạn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>
                Vai trò hiện tại:{" "}
                <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                  {user.role}
                </Badge>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const next = user.role === "ADMIN" ? "USER" : "ADMIN";
                  if (!confirm(`Đổi vai trò user thành ${next}?`)) return;
                  try {
                    await api.patch(`/admin/users/${user.id}/role`, { role: next });
                    toast.success(`Đã đổi vai trò → ${next}`);
                    fetch();
                  } catch (err: unknown) {
                    const e = err as { response?: { data?: { error?: string } } };
                    toast.error(e.response?.data?.error || "Đổi vai trò thất bại");
                  }
                }}
              >
                Đổi sang {user.role === "ADMIN" ? "USER" : "ADMIN"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span>
                Trạng thái:{" "}
                {user.isLocked ? (
                  <Badge variant="destructive">Đã khoá</Badge>
                ) : (
                  <Badge variant="secondary">Bình thường</Badge>
                )}
              </span>
              {user.isLocked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await api.post(`/admin/users/${user.id}/unlock`);
                      toast.success("Đã mở khoá");
                      fetch();
                    } catch (err: unknown) {
                      const e = err as { response?: { data?: { error?: string } } };
                      toast.error(e.response?.data?.error || "Mở khoá thất bại");
                    }
                  }}
                >
                  Mở khoá
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    const reason = prompt("Lý do khoá (tuỳ chọn):") ?? undefined;
                    try {
                      await api.post(`/admin/users/${user.id}/lock`, { reason: reason || undefined });
                      toast.success("Đã khoá");
                      fetch();
                    } catch (err: unknown) {
                      const e = err as { response?: { data?: { error?: string } } };
                      toast.error(e.response?.data?.error || "Khoá thất bại");
                    }
                  }}
                >
                  Khoá
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ManualUpgradeDialog
        userId={user.id}
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        onDone={fetch}
      />
    </div>
  );
}
