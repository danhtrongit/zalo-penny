import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Gift, Copy, Download, Users, Coins } from "lucide-react";

interface ReferralSummary {
  code: string;
  referredCount: number;
  totalCommission: number;
}

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

export function ReferralCard() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    api
      .get("/referral/me")
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  if (!summary) return null;

  const link = `${window.location.origin}/register?ref=${summary.code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Đã sao chép link giới thiệu");
    } catch {
      toast.error("Không sao chép được, hãy copy thủ công");
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(summary.code);
      toast.success("Đã sao chép mã giới thiệu");
    } catch {
      toast.error("Không sao chép được, hãy copy thủ công");
    }
  };

  const handleDownloadQr = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `pennybot-gioi-thieu-${summary.code}.png`;
    a.click();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="size-4 text-primary" /> Giới thiệu bạn bè
        </CardTitle>
        <CardDescription className="text-xs">
          Chia sẻ mã hoặc link của bạn. Khi bạn bè đăng ký và mua gói, bạn được nhận hoa hồng.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 rounded-lg border p-3">
            <Users className="size-4 shrink-0 text-primary" />
            <div>
              <p className="text-lg font-bold leading-none">{summary.referredCount}</p>
              <p className="text-[11px] text-muted-foreground">Người đã giới thiệu</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border p-3">
            <Coins className="size-4 shrink-0 text-emerald-500" />
            <div>
              <p className="text-lg font-bold leading-none">{formatVnd(summary.totalCommission)}</p>
              <p className="text-[11px] text-muted-foreground">Hoa hồng đã nhận</p>
            </div>
          </div>
        </div>

        {/* Code */}
        <div className="space-y-1.5">
          <Label className="text-xs">Mã giới thiệu của bạn</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={summary.code}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-base font-semibold tracking-widest uppercase"
            />
            <Button variant="outline" size="icon" onClick={handleCopyCode} aria-label="Sao chép mã">
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        {/* Link */}
        <div className="space-y-1.5">
          <Label className="text-xs">Link giới thiệu</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="text-xs"
            />
            <Button variant="outline" size="icon" onClick={handleCopyLink} aria-label="Sao chép link">
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* QR */}
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border bg-white p-3">
            <QRCodeCanvas ref={qrRef} value={link} size={176} level="M" marginSize={2} />
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Quét mã để mở link đăng ký với mã giới thiệu của bạn.
          </p>
          <Button variant="outline" size="sm" onClick={handleDownloadQr} className="w-full">
            <Download className="mr-1.5 size-4" /> Tải ảnh QR để gửi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
