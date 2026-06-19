import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const freeFeatures = ["10 tin nhắn mỗi ngày", "Ghi chi tiêu & hỏi đáp với AI", "Báo cáo cơ bản"];
const paidFeatures = ["Nhắn tin không giới hạn", "Quét hoá đơn & nhập PDF", "Báo cáo nâng cao", "Nhắc ghi chép mỗi ngày"];

export function PricingTeaser() {
  const { user } = useAuth();
  const dest = user ? "/dashboard" : "/register";
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="text-center font-heading text-3xl font-bold">Giá đơn giản</h2>
      <p className="mt-2 text-center text-muted-foreground">Bắt đầu miễn phí, nâng cấp khi cần. Không tự động gia hạn.</p>

      <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
        <Card className="flex flex-col border-dashed">
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">Miễn phí</Badge>
            <CardTitle className="text-2xl">Dùng thử</CardTitle>
            <p className="text-4xl font-bold tabular-nums">0đ</p>
            <p className="text-sm text-muted-foreground">10 tin nhắn/ngày · không giới hạn thời gian</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <ul className="space-y-2">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm"><Check className="size-4 shrink-0 text-primary" /> {f}</li>
              ))}
            </ul>
            <Link to={dest} className="mt-auto">
              <Button variant="outline" className="w-full">Dùng miễn phí</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-primary ring-1 ring-primary/20">
          <CardHeader>
            <Badge className="mb-2 w-fit">Phổ biến</Badge>
            <CardTitle className="text-2xl">6 Tháng</CardTitle>
            <p className="text-4xl font-bold tabular-nums">99.000đ</p>
            <p className="text-sm font-medium text-primary">≈ 16.500đ/tháng · thanh toán một lần</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <ul className="space-y-2">
              {paidFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm"><Check className="size-4 shrink-0 text-primary" /> {f}</li>
              ))}
            </ul>
            <Link to="/pricing" className="mt-auto">
              <Button className="w-full">Xem bảng giá</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
