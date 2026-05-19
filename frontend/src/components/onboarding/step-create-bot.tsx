import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";

interface StepCreateBotProps {
  suggestedName: string;
  onNext: () => void;
}

const ZALO_BOT_MANAGER_QR = "https://bot.zapps.me/images/zbot-creator_qrcode.jpg";
const ZALO_BOT_MANAGER_NAME = "Zalo Bot Manager";

export function StepCreateBot({ suggestedName, onNext }: StepCreateBotProps) {
  const [copiedName, setCopiedName] = useState(false);
  const [copiedOaName, setCopiedOaName] = useState(false);

  const copyToClipboard = async (
    text: string,
    setter: (v: boolean) => void,
    label: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
      toast.success(`Đã chép ${label}`);
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
            Quét QR hoặc tìm OA <strong>Zalo Bot Manager</strong> trong app Zalo
            để tạo bot.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-xl border bg-white p-3">
          <img
            src={ZALO_BOT_MANAGER_QR}
            alt="QR Zalo Bot Manager"
            className="size-44 rounded"
            loading="lazy"
          />
          <p className="text-center text-xs text-muted-foreground">
            Quét QR trên điện thoại bằng <strong>camera Zalo</strong> hoặc app Camera
          </p>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Hoặc tìm OA trong Zalo:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex flex-1 items-center gap-1.5 truncate rounded bg-background px-2.5 py-1.5 font-mono text-sm">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              {ZALO_BOT_MANAGER_NAME}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copyToClipboard(ZALO_BOT_MANAGER_NAME, setCopiedOaName, "tên OA")
              }
            >
              {copiedOaName ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Tên bot gợi ý (bắt buộc bắt đầu bằng "Bot"):
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2.5 py-1.5 font-mono text-sm">
              {suggestedName}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(suggestedName, setCopiedName, "tên bot")}
            >
              {copiedName ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span className="ml-1.5 text-xs">{copiedName ? "Đã chép" : "Chép"}</span>
            </Button>
          </div>
        </div>

        <ol className="space-y-1.5 text-sm text-muted-foreground">
          <li>
            1. Mở Zalo &gt; chọn <strong>Tìm kiếm</strong> &gt; gõ <em>"Zalo Bot
            Manager"</em>
          </li>
          <li>
            2. Vào OA &gt; chọn <strong>"Tạo bot"</strong> trong menu chat
          </li>
          <li>
            3. Dán tên gợi ý ở trên &gt; nhấn <strong>Tạo Bot</strong>
          </li>
          <li>4. Nhận <strong>Bot Token</strong> qua tin nhắn Zalo &gt; copy lại</li>
        </ol>

        <Button onClick={onNext} className="w-full">
          Tôi đã có Bot Token
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
