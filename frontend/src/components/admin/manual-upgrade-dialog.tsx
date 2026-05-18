import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlanOption {
  id: string;
  name: string;
  slug: string;
  price: number;
  durationDays: number;
}

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function ManualUpgradeDialog({ userId, open, onOpenChange, onDone }: Props) {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [planSlug, setPlanSlug] = useState<string>("");
  const [durationDays, setDurationDays] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      api.get<PlanOption[]>("/admin/plans").then(({ data }) => setPlans(data));
    }
  }, [open]);

  const submit = async () => {
    if (!planSlug) {
      toast.error("Chọn gói");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { planSlug };
      if (durationDays) body.durationDays = parseInt(durationDays, 10);
      if (note) body.note = note;
      await api.post(`/admin/subscriptions/users/${userId}/upgrade`, body);
      toast.success("Đã nâng cấp gói cho user");
      onOpenChange(false);
      onDone();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Nâng cấp thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nâng cấp gói thủ công</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Chọn gói</Label>
            <Select value={planSlug} onValueChange={setPlanSlug}>
              <SelectTrigger>
                <SelectValue placeholder="— chọn —" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.slug}>
                    {p.name} · {p.price.toLocaleString("vi-VN")}đ · {p.durationDays} ngày
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dur">Số ngày (tuỳ chọn — bỏ trống dùng mặc định của gói)</Label>
            <Input
              id="dur"
              type="number"
              inputMode="numeric"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Ghi chú</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: tặng VIP cho khách"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Đang xử lý..." : "Nâng cấp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
