import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardPaste, ArrowLeft, Sparkles } from "lucide-react";
import { useClipboardDetect } from "@/hooks/use-clipboard-detect";
import { toast } from "sonner";
import api from "@/lib/api";
import { parseApiError } from "@/lib/api-error";

interface BotInfo {
  id?: string;
  username?: string;
  display_name?: string;
}

interface StepPasteTokenProps {
  onConnected: (data: { verifyId: string; verifyCode: string; botInfo: BotInfo | null }) => void;
  onBack: () => void;
}

export function StepPasteToken({ onConnected, onBack }: StepPasteTokenProps) {
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const handleAutoDetect = useCallback((text: string) => {
    setToken((prev) => {
      if (prev) return prev;
      setAutoFilled(true);
      return text;
    });
  }, []);

  useClipboardDetect(handleAutoDetect, !token && !connecting);

  const handlePasteClick = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setToken(text);
        setAutoFilled(true);
      } else {
        toast.info("Clipboard trống");
      }
    } catch {
      toast.info("Trình duyệt không cho phép dán tự động. Hãy dán thủ công vào ô bên dưới.");
    }
  };

  const handleConnect = async () => {
    if (!token.trim()) {
      toast.error("Vui lòng dán Bot Token");
      return;
    }
    setConnecting(true);
    try {
      const { data } = await api.post("/bot/connect", { botToken: token.trim() });
      if (data.pendingVerification) {
        onConnected({
          verifyId: data.verifyId,
          verifyCode: data.verifyCode,
          botInfo: data.botInfo ?? null,
        });
      } else {
        toast.success("Kết nối bot thành công!");
        onConnected({
          verifyId: "",
          verifyCode: "",
          botInfo: data.botInfo ?? null,
        });
      }
    } catch (err) {
      toast.error(parseApiError(err, "Token không hợp lệ. Kiểm tra lại và thử lại."));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Dán Bot Token</h2>
          <p className="text-sm text-muted-foreground">
            Dán token bạn nhận được từ Zalo Bot Manager.
          </p>
        </div>

        {autoFilled && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
            <Sparkles className="size-3.5 shrink-0" />
            <span>Phát hiện token trong clipboard, đã tự điền</span>
          </div>
        )}

        <Button onClick={handlePasteClick} variant="outline" size="lg" className="w-full">
          <ClipboardPaste className="mr-1.5 size-4" />
          Dán từ clipboard
        </Button>

        <Input
          placeholder="Hoặc dán thủ công vào đây..."
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setAutoFilled(false);
          }}
          className="font-mono text-xs"
          disabled={connecting}
        />

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack} disabled={connecting}>
            <ArrowLeft className="mr-1 size-3.5" />
            Quay lại
          </Button>
          <Button onClick={handleConnect} disabled={connecting || !token.trim()} className="flex-1">
            {connecting ? "Đang kết nối..." : "Kết nối bot"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
