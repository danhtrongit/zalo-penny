import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Copy, Check, ExternalLink, ArrowRight } from "lucide-react";
import { isMobile } from "@/lib/is-mobile";
import { toast } from "sonner";

interface StepCreateBotProps {
  suggestedName: string;
  onNext: () => void;
}

const ZALO_BOT_MANAGER_URL = "https://zalo.me/zbot-creator";
const ZALO_BOT_MANAGER_QR = "https://bot.zapps.me/images/zbot-creator_qrcode.jpg";

export function StepCreateBot({ suggestedName, onNext }: StepCreateBotProps) {
  const [copied, setCopied] = useState(false);
  const mobile = isMobile();

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(suggestedName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Đã sao chép tên bot");
    } catch {
      toast.error("Trình duyệt không cho phép sao chép. Hãy chọn và copy thủ công.");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Tạo bot trên Zalo</h2>
          <p className="text-sm text-muted-foreground">
            Mở Zalo Bot Manager để tạo bot mới. Tên bot phải bắt đầu bằng "Bot".
          </p>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Tên gợi ý:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2.5 py-1.5 font-mono text-sm">
              {suggestedName}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopyName}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span className="ml-1.5 text-xs">{copied ? "Đã chép" : "Chép"}</span>
            </Button>
          </div>
        </div>

        {mobile ? (
          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <a href={ZALO_BOT_MANAGER_URL} target="_blank" rel="noopener noreferrer">
                <Bot className="mr-1.5 size-4" />
                Mở Zalo Bot Manager
                <ExternalLink className="ml-1.5 size-3.5" />
              </a>
            </Button>
            <details className="rounded-lg border bg-muted/20 p-3 text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Không mở được? Xem QR
              </summary>
              <div className="mt-2 flex justify-center">
                <img
                  src={ZALO_BOT_MANAGER_QR}
                  alt="QR Zalo Bot Manager"
                  className="size-40 rounded-lg border bg-white p-2"
                />
              </div>
            </details>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-3">
            <img
              src={ZALO_BOT_MANAGER_QR}
              alt="QR Zalo Bot Manager"
              className="size-44 rounded"
            />
            <p className="text-center text-xs text-muted-foreground">
              Quét QR bằng điện thoại để mở Zalo Bot Manager
            </p>
          </div>
        )}

        <ol className="space-y-1.5 text-sm text-muted-foreground">
          <li>1. Mở Zalo Bot Manager (link/QR ở trên)</li>
          <li>2. Chọn "Tạo bot" → nhập tên (dán tên gợi ý)</li>
          <li>3. Nhận Bot Token qua tin nhắn Zalo → copy</li>
        </ol>

        <Button onClick={onNext} className="w-full" variant="default">
          Tôi đã có Bot Token
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
