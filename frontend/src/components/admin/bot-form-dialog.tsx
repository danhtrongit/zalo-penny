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

export interface BotRow {
  id?: string;
  label: string;
  botToken?: string;
  capacity: number;
  botLink?: string | null;
  qrImageUrl?: string | null;
  isActive?: boolean;
}

interface Props {
  initial: BotRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function BotFormDialog({ initial, open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<BotRow>({
    label: "",
    botToken: "",
    capacity: 5,
    botLink: "",
    qrImageUrl: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        ...initial,
        botToken: "",
        botLink: initial.botLink ?? "",
        qrImageUrl: initial.qrImageUrl ?? "",
      });
    } else {
      setForm({ label: "", botToken: "", capacity: 5, botLink: "", qrImageUrl: "", isActive: true });
    }
  }, [initial, open]);

  const onPickQr = (file?: File) => {
    if (!file) return;
    if (file.size > 300_000) {
      toast.error("Ảnh QR quá lớn (tối đa ~300KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, qrImageUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        label: form.label.trim(),
        capacity: Number(form.capacity),
        botLink: form.botLink?.trim() || undefined,
        qrImageUrl: form.qrImageUrl || undefined,
        isActive: form.isActive,
      };
      if (form.botToken?.trim()) body.botToken = form.botToken.trim();

      if (initial?.id) {
        await api.patch(`/admin/bots/${initial.id}`, body);
        toast.success("Đã cập nhật bot");
      } else {
        if (!body.botToken) {
          toast.error("Cần bot token");
          setSaving(false);
          return;
        }
        await api.post("/admin/bots", body);
        toast.success("Đã tạo bot");
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
          <DialogTitle>{initial ? "Sửa bot" : "Thêm bot vào pool"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="blabel">Tên gợi nhớ</Label>
            <Input id="blabel" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Bot 01" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="btoken">Bot token {initial && "(để trống nếu không đổi)"}</Label>
            <Input id="btoken" value={form.botToken} onChange={(e) => setForm({ ...form, botToken: e.target.value })} placeholder="paste token..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bcap">Sức chứa</Label>
              <Input
                id="bcap"
                type="number"
                inputMode="numeric"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value || "5", 10) })}
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <input id="bactive" type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              <Label htmlFor="bactive">Đang hoạt động</Label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blink">Link chat bot (tuỳ chọn)</Label>
            <Input id="blink" value={form.botLink ?? ""} onChange={(e) => setForm({ ...form, botLink: e.target.value })} placeholder="https://zalo.me/..." />
          </div>
          <div className="space-y-1.5">
            <Label>Ảnh QR</Label>
            <input type="file" accept="image/*" onChange={(e) => onPickQr(e.target.files?.[0])} className="text-sm" />
            {form.qrImageUrl && <img src={form.qrImageUrl} alt="QR" className="mt-2 size-28 rounded border object-contain" />}
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
