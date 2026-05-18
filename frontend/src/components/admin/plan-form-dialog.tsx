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

export interface PlanRow {
  id?: string;
  name: string;
  slug: string;
  durationDays: number;
  price: number;
  description?: string | null;
  isActive?: boolean;
}

interface Props {
  initial: PlanRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function PlanFormDialog({ initial, open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<PlanRow>({
    name: "",
    slug: "",
    durationDays: 30,
    price: 0,
    description: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        ...initial,
        description: initial.description ?? "",
        isActive: initial.isActive ?? true,
      });
    } else {
      setForm({ name: "", slug: "", durationDays: 30, price: 0, description: "", isActive: true });
    }
  }, [initial, open]);

  const submit = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        durationDays: Number(form.durationDays),
        price: Number(form.price),
        description: form.description?.trim() || undefined,
        isActive: form.isActive,
      };
      if (initial?.id) {
        await api.patch(`/admin/plans/${initial.id}`, body);
        toast.success("Đã cập nhật gói");
      } else {
        await api.post("/admin/plans", body);
        toast.success("Đã tạo gói");
      }
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa gói" : "Tạo gói mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Tên gói</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (a-z, 0-9, -)</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              disabled={!!initial}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dur">Số ngày</Label>
              <Input
                id="dur"
                type="number"
                inputMode="numeric"
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: parseInt(e.target.value || "0", 10) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Giá (VND)</Label>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value || "0", 10) })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Mô tả</Label>
            <Input
              id="desc"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={!!form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <Label htmlFor="active">Đang hoạt động</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
