import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { isMobile } from "@/lib/is-mobile";

interface BotInfo {
  id?: string;
  username?: string;
  display_name?: string;
}

interface StepVerifyProps {
  verifyId: string;
  verifyCode: string;
  botInfo: BotInfo | null;
  onVerified: () => void;
  onReset: () => void;
}

export function StepVerify({ verifyId, verifyCode, botInfo, onVerified, onReset }: StepVerifyProps) {
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formatted = `Xác minh: ${verifyCode}`;
  const botChatLink = botInfo?.username
    ? `https://zalo.me/${botInfo.username}`
    : null;

  useEffect(() => {
    if (!verifyId) {
      onVerified();
      return;
    }
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await api.post("/bot/verify", { verifyId });
        if (data.verified) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          onVerified();
        }
      } catch {
        // Keep polling; verification may fail transiently.
      }
    }, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [verifyId, onVerified]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Đã chép mã xác minh");
    } catch {
      toast.error("Không sao chép được, hãy chọn mã thủ công");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Xác minh sở hữu bot</h2>
          <p className="text-sm text-muted-foreground">
            Gửi mã sau vào chat với bot trên Zalo để xác minh bạn sở hữu bot này.
          </p>
        </div>

        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
          <p className="text-xs text-amber-700">Mã xác minh</p>
          <p className="font-mono text-3xl font-bold tracking-[0.4em] text-amber-900">
            {verifyCode}
          </p>
        </div>

        <Button onClick={handleCopy} variant="outline" className="w-full" size="lg">
          {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
          {copied ? "Đã chép" : `Chép "${formatted}"`}
        </Button>

        {botChatLink && isMobile() && (
          <Button asChild className="w-full" size="lg">
            <a href={botChatLink} target="_blank" rel="noopener noreferrer">
              Mở chat với bot trên Zalo
              <ExternalLink className="ml-1.5 size-3.5" />
            </a>
          </Button>
        )}

        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground">
          <RefreshCw className="size-3 animate-spin" />
          <span>Đang chờ bạn gửi mã trên Zalo...</span>
        </div>

        <Button variant="ghost" onClick={onReset} className="w-full text-xs text-muted-foreground">
          Có vấn đề? Bắt đầu lại
        </Button>
      </CardContent>
    </Card>
  );
}
