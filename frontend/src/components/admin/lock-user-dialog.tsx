import { useState } from "react";
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

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function LockUserDialog({ userId, open, onOpenChange, onDone }: Props) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/users/${userId}/lock`, { reason: reason || undefined });
      toast.success("Đã khoá tài khoản");
      onOpenChange(false);
      setReason("");
      onDone();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Khoá tài khoản thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Khoá tài khoản</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Lý do (tuỳ chọn)</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: spam, vi phạm điều khoản…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Huỷ
          </Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>
            {saving ? "Đang khoá..." : "Khoá"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
