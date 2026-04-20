import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Bot,
  ArrowRight,
  MessageSquare,
  Search,
  PlusCircle,
  Send,
  KeyRound,
} from "lucide-react";

export default function PaymentSuccessPage() {
  const { refreshUser } = useAuth();

  // Poll to refresh user subscription status (IPN may take a few seconds)
  useEffect(() => {
    refreshUser();
    const interval = setInterval(() => refreshUser(), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-svh bg-gradient-to-b from-emerald-50/50 to-background py-8 px-4 sm:py-16">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-3">
          <CheckCircle className="mx-auto size-16 text-emerald-500" />
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            Thanh toán thành công!
          </h1>
          <p className="text-muted-foreground">
            Chỉ còn vài bước nữa để Penny bắt đầu giúp bạn quản lý chi tiêu
          </p>
        </div>

        {/* Step 1: Access Zalo OA */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge className="size-6 items-center justify-center rounded-full p-0 text-xs">
                1
              </Badge>
              <CardTitle className="text-base">Truy cập Zalo OA</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  Mở ứng dụng <strong>Zalo</strong> trên điện thoại
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Search className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  Tìm kiếm OA{" "}
                  <strong className="text-primary">Zalo Bot Manager</strong>
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <PlusCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  Chọn <strong>Tạo bot</strong> trong menu cửa sổ chat để truy
                  cập ứng dụng Zalo Bot Creator
                </p>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center pt-1">
              <div className="rounded-xl border bg-white p-3 shadow-sm">
                <img
                  src="https://bot.zapps.me/images/zbot-creator_qrcode.jpg"
                  alt="QR Code - Zalo Bot Manager"
                  className="size-36 sm:size-44"
                />
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                  Quét mã để mở Zalo Bot Manager
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Setup Bot */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge className="size-6 items-center justify-center rounded-full p-0 text-xs">
                2
              </Badge>
              <CardTitle className="text-base">Thiết lập thông tin Bot</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Bot className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  Nhập tên Bot (bắt buộc bắt đầu bằng tiền tố{" "}
                  <strong>Bot</strong>, ví dụ:{" "}
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    Bot MyShop
                  </span>
                  ) và các thông tin cần thiết
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Send className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  Nhấn <strong>Tạo Bot</strong> để xác nhận
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  Sau khi tạo thành công, hệ thống sẽ gửi{" "}
                  <strong>thông tin Bot</strong> và{" "}
                  <strong className="text-primary">Bot Token</strong> qua tin
                  nhắn cho tài khoản Zalo của bạn
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
              <p className="font-medium">Lưu ý quan trọng:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>
                  Copy <strong>Bot Token</strong> từ tin nhắn Zalo để dùng ở
                  bước tiếp theo
                </li>
                <li>Mỗi tài khoản Penny chỉ kết nối được 1 bot</li>
                <li>
                  Giữ Bot Token bí mật, không chia sẻ cho người khác
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Connect */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge className="size-6 items-center justify-center rounded-full p-0 text-xs">
                3
              </Badge>
              <CardTitle className="text-base">Kết nối Bot Token</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sau khi có Bot Token, nhấn nút bên dưới để vào trang cài đặt và
              kết nối bot với Penny.
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
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-primary hover:underline"
          >
            Bỏ qua, tôi sẽ kết nối sau
          </Link>
        </div>
      </div>
    </div>
  );
}
