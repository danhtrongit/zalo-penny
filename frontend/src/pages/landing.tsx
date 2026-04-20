import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Camera, BarChart3, Bot, Shield, Zap } from "lucide-react";

const features = [
  { icon: MessageSquare, title: "Chat tự nhiên", desc: "Ghi chi tiêu bằng tiếng Việt tự nhiên" },
  { icon: Camera, title: "Quét hóa đơn", desc: "Gửi ảnh bill, Penny tự đọc và lưu" },
  { icon: BarChart3, title: "Báo cáo thông minh", desc: "Theo dõi chi tiêu theo tuần, tháng" },
  { icon: Bot, title: "5 phong cách", desc: "Bạn thân, Trợ lý, Nội trợ, Coach, Hề" },
  { icon: Shield, title: "Ngân sách", desc: "Đặt hạn mức và được nhắc nhở kịp thời" },
  { icon: Zap, title: "AI Gemini", desc: "Hiểu ngữ cảnh, hỗ trợ đa dạng yêu cầu" },
];

const plans = [
  { name: "1 Tháng", price: "49,000đ", slug: "1-month", popular: false },
  { name: "6 Tháng", price: "249,000đ", slug: "6-month", popular: true, save: "Tiết kiệm 15%" },
  { name: "1 Năm", price: "399,000đ", slug: "1-year", popular: false, save: "Tiết kiệm 32%" },
];

export default function LandingPage() {
  return (
    <div className="min-h-svh">
      <nav className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-2xl font-heading font-bold">Penny</span>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Đăng nhập</Button>
            </Link>
            <Link to="/register">
              <Button>Đăng ký</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-4">Trợ lý chi tiêu trên Zalo</Badge>
        <h1 className="font-heading text-5xl font-bold tracking-tight">
          Quản lý chi tiêu
          <br />
          <span className="text-primary">dễ như nhắn tin</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Penny là trợ lý AI trên Zalo giúp bạn ghi chi tiêu bằng tiếng Việt tự nhiên,
          quét hóa đơn, theo dõi ngân sách - tất cả chỉ bằng một cuộc trò chuyện.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/register">
            <Button size="lg">Bắt đầu ngay</Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline">Xem bảng giá</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-12 text-center font-heading text-3xl font-bold">Tính năng nổi bật</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="mb-2 size-8 text-primary" />
                <CardTitle>{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-12 text-center font-heading text-3xl font-bold">Bảng giá</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.slug} className={p.popular ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                {p.popular && <Badge className="mb-2 w-fit">Phổ biến</Badge>}
                <CardTitle className="text-2xl">{p.name}</CardTitle>
                <p className="text-3xl font-bold">{p.price}</p>
                {p.save && <p className="text-sm text-primary">{p.save}</p>}
              </CardHeader>
              <CardContent>
                <Link to="/register">
                  <Button className="w-full" variant={p.popular ? "default" : "outline"}>
                    Chọn gói này
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>Penny - Trợ lý chi tiêu thông minh</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:underline">Quyền riêng tư</Link>
            <Link to="/terms" className="hover:underline">Điều khoản</Link>
            <Link to="/contact" className="hover:underline">Liên hệ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
