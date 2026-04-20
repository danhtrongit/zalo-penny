import { useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send } from "lucide-react";

export default function AdminBroadcastPage() {
  const [message, setMessage] = useState("");
  const [personalized, setPersonalized] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post("/admin/broadcast", { message, personalized });
      toast.success(`Đã gửi: ${data.sent} thành công, ${data.failed} thất bại`);
      setMessage("");
    } catch {
      toast.error("Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Gửi tin nhắn hàng loạt</h1>

      <Card>
        <CardHeader>
          <CardTitle>Broadcast</CardTitle>
          <CardDescription>Gửi tin nhắn tới tất cả người dùng đang kết nối bot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nội dung tin nhắn</Label>
            <Input
              placeholder="Nhập nội dung tin nhắn..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="personalized"
              checked={personalized}
              onChange={(e) => setPersonalized(e.target.checked)}
              className="size-4"
            />
            <Label htmlFor="personalized" className="cursor-pointer">
              Cá nhân hóa theo persona của từng người
            </Label>
          </div>
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            <Send className="mr-2 size-4" />
            {sending ? "Đang gửi..." : "Gửi tin nhắn"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
