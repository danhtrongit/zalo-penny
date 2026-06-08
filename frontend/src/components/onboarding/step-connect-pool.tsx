import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { isMobile } from "@/lib/is-mobile";

interface PoolInfo {
  status: string;
  linkCode: string;
  id: string;
  label?: string | null;
  qrImageUrl?: string | null;
  botLink?: string | null;
}

interface Props {
  onLinked: () => void;
}

export function StepConnectPool({ onLinked }: Props) {
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [fetched, setFetched] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = async () => {
      try {
        const { data } = await api.get("/bot/status");
        setFetched(true);
        setPool(data.pool ?? null);
        if (data.pool?.status === "LINKED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          onLinked();
        }
      } catch {
        // keep polling
      }
    };
    tick();
    pollingRef.current = setInterval(tick, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [onLinked]);

  const copy = async () => {
    if (!pool) return;
    try {
      await navigator.clipboard.writeText(pool.linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Đã chép mã liên kết");
    } catch {
      toast.error("Không sao chép được, hãy chọn mã thủ công");
    }
  };

  if (!pool) {
    // Still waiting on the first status response → genuine loading.
    if (!fetched) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto mb-2 size-4 animate-spin" /> Đang chuẩn bị bot cho bạn...
          </CardContent>
        </Card>
      );
    }
    // Fetched, but no bot is available yet (pool empty/full). Explain instead of
    // spinning forever; keep polling so it resolves automatically once ready.
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <RefreshCw className="mx-auto size-5 animate-spin text-amber-500" />
          <p className="text-sm font-medium">Hệ thống đang chuẩn bị bot cho bạn</p>
          <p className="text-xs text-muted-foreground">
            Tất cả bot tạm thời đã đầy. Chúng tôi sẽ tự động cấp bot cho bạn ngay khi có chỗ —
            bạn có thể đợi tại đây hoặc quay lại sau ít phút. Nếu chờ lâu, vui lòng liên hệ hỗ trợ.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Kết nối bot của bạn</h2>
          <p className="text-sm text-muted-foreground">
            Quét QR để mở chat với bot, rồi gửi MÃ LIÊN KẾT bên dưới cho bot.
          </p>
        </div>

        {pool.qrImageUrl && (
          <img src={pool.qrImageUrl} alt="QR bot" className="mx-auto size-48 rounded-xl border object-contain" />
        )}

        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
          <p className="text-xs text-emerald-700">Mã liên kết</p>
          <p className="font-mono text-2xl font-bold tracking-[0.2em] text-emerald-900">{pool.linkCode}</p>
        </div>

        <Button onClick={copy} variant="outline" className="w-full" size="lg">
          {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
          {copied ? "Đã chép" : "Chép mã liên kết"}
        </Button>

        {pool.botLink && isMobile() && (
          <Button asChild className="w-full" size="lg">
            <a href={pool.botLink} target="_blank" rel="noopener noreferrer">
              Mở chat với bot
              <ExternalLink className="ml-1.5 size-3.5" />
            </a>
          </Button>
        )}

        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground">
          <RefreshCw className="size-3 animate-spin" />
          <span>Đang chờ bạn gửi mã trên Zalo...</span>
        </div>
      </CardContent>
    </Card>
  );
}
