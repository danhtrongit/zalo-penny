import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Bot, ExternalLink, ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";

export default function PaymentSuccessPage() {
  const copyLink = () => {
    navigator.clipboard.writeText("https://bot.zapps.me/docs/create-bot/");
    toast.success("Đã copy link!");
  };

  return (
    <div className="min-h-svh bg-gradient-to-b from-emerald-50/50 to-background py-8 px-4 sm:py-16">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-3">
          <CheckCircle className="mx-auto size-16 text-emerald-500" />
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">Thanh toán thành công!</h1>
          <p className="text-muted-foreground">
            Chỉ còn 1 bước nữa để Penny bắt đầu giúp bạn quản lý chi tiêu
          </p>
        </div>

        {/* Step 1: Create Bot */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge className="size-6 items-center justify-center rounded-full p-0 text-xs">1</Badge>
              <CardTitle className="text-base">Tạo Zalo Bot</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Quét mã QR bên dưới hoặc truy cập link để tạo bot trên Zalo Bot Platform:
            </p>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="rounded-xl border bg-white p-3">
                <img
                  src="https://bot.zapps.me/images/zbot-creator_qrcode.jpg"
                  alt="QR Code tạo Zalo Bot"
                  className="size-40 sm:size-48"
                />
              </div>
            </div>

            {/* Link */}
            <div className="flex gap-2">
              <a
                href="https://bot.zapps.me/docs/create-bot/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full text-sm">
                  <ExternalLink className="mr-1.5 size-3.5" />
                  Xem hướng dẫn tạo bot
                </Button>
              </a>
              <Button variant="ghost" size="icon" onClick={copyLink}>
                <Copy className="size-4" />
              </Button>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
              <p className="font-medium">Lưu ý quan trọng:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Sau khi tạo bot, bạn sẽ nhận được <strong>Bot Token</strong></li>
                <li>Copy Bot Token đó để dùng ở bước tiếp theo</li>
                <li>Mỗi tài khoản Penny chỉ kết nối được 1 bot</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Connect */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge className="size-6 items-center justify-center rounded-full p-0 text-xs">2</Badge>
              <CardTitle className="text-base">Kết nối Bot Token</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sau khi có Bot Token, nhấn nút bên dưới để vào trang cài đặt và kết nối bot.
            </p>
            <Link to="/dashboard/settings">
              <Button className="w-full">
                <Bot className="mr-1.5 size-4" />
                Đi tới kết nối Bot
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Skip for now */}
        <div className="text-center">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary hover:underline">
            Bỏ qua, tôi sẽ kết nối sau
          </Link>
        </div>
      </div>
    </div>
  );
}
