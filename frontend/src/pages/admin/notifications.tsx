import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface PlanOption {
  id: string;
  name: string;
  slug: string;
}

export default function AdminNotificationsPage() {
  const [message, setMessage] = useState("");
  const [personalized, setPersonalized] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    api.get<PlanOption[]>("/admin/plans").then(({ data }) => setPlans(data));
  }, []);

  const toggleSlug = (slug: string) => {
    setSelectedSlugs((curr) =>
      curr.includes(slug) ? curr.filter((s) => s !== slug) : [...curr, slug]
    );
  };

  const send = async () => {
    if (!message.trim()) {
      toast.error("Nhập nội dung tin nhắn");
      return;
    }
    if (!confirm(`Gửi broadcast tới ${selectedSlugs.length ? `gói: ${selectedSlugs.join(", ")}` : "TẤT CẢ user có sub ACTIVE"}?`)) return;

    setSending(true);
    try {
      const { data } = await api.post<{ sent: number; failed: number }>(
        "/admin/notifications/broadcast",
        {
          message: message.trim(),
          personalized,
          planSlugs: selectedSlugs.length ? selectedSlugs : undefined,
        }
      );
      setLastResult(data);
      toast.success(`Gửi xong: ${data.sent} thành công, ${data.failed} lỗi`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Gửi thông báo</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Broadcast Zalo bot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="msg">Nội dung</Label>
            <textarea
              id="msg"
              className="min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tin nhắn sẽ gửi tới tất cả user có sub ACTIVE qua bot Zalo của họ."
            />
            <p className="text-xs text-muted-foreground">{message.length}/2000 ký tự</p>
          </div>

          <div className="space-y-1.5">
            <Label>Lọc theo gói (bỏ trống = tất cả)</Label>
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <label key={p.slug} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedSlugs.includes(p.slug)}
                    onChange={() => toggleSlug(p.slug)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="pers"
              type="checkbox"
              checked={personalized}
              onChange={(e) => setPersonalized(e.target.checked)}
            />
            <Label htmlFor="pers">Cá nhân hoá theo persona (chậm + tốn AI credits)</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={send} disabled={sending}>
              {sending ? "Đang gửi..." : "Gửi"}
            </Button>
          </div>

          {lastResult && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>Kết quả lần gửi cuối: <b>{lastResult.sent}</b> thành công · <b>{lastResult.failed}</b> lỗi</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
