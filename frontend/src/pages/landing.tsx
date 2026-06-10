import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Camera, BarChart3, Bot, Shield, Zap, LayoutDashboard, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const features = [
  { icon: MessageSquare, title: "Chat tự nhiên", desc: "Ghi chi tiêu bằng tiếng Việt tự nhiên" },
  { icon: Camera, title: "Quét hóa đơn", desc: "Gửi ảnh bill, Penny tự đọc và lưu" },
  { icon: BarChart3, title: "Báo cáo thông minh", desc: "Theo dõi chi tiêu theo tuần, tháng" },
  { icon: Bot, title: "5 phong cách", desc: "Bạn thân, Trợ lý, Nội trợ, Coach, Hề" },
  { icon: Shield, title: "Ngân sách", desc: "Đặt hạn mức và được nhắc nhở kịp thời" },
  { icon: Zap, title: "AI Gemini", desc: "Hiểu ngữ cảnh, hỗ trợ đa dạng yêu cầu" },
];

const plans = [
  { name: "Dùng thử", price: "0đ", slug: "free", popular: false, save: "10 tin nhắn mỗi ngày" },
  { name: "6 Tháng", price: "99,000đ", slug: "6-month", popular: true, save: "Chỉ ~16,500đ/tháng" },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-svh">
      <nav className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-2xl font-heading font-bold">Penny</span>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  Xin chào, <strong className="text-foreground">{user.name}</strong>
                </span>
                <Link to="/dashboard">
                  <Button>
                    <LayoutDashboard className="mr-1.5 size-4" />
                    Vào Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Đăng nhập</Button>
                </Link>
                <Link to="/register">
                  <Button>Đăng ký</Button>
                </Link>
              </>
            )}
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
          {user ? (
            <>
              <Link to="/dashboard">
                <Button size="lg">
                  <LayoutDashboard className="mr-1.5 size-4" />
                  Vào Dashboard
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline">Xem bảng giá</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/register">
                <Button size="lg">Bắt đầu ngay</Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline">Xem bảng giá</Button>
              </Link>
            </>
          )}
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
        <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <Card key={p.slug} className={p.popular ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                {p.popular && <Badge className="mb-2 w-fit">Phổ biến</Badge>}
                <CardTitle className="text-2xl">{p.name}</CardTitle>
                <p className="text-3xl font-bold">{p.price}</p>
                {p.save && <p className="text-sm text-primary">{p.save}</p>}
              </CardHeader>
              <CardContent>
                <Link to={user ? "/pricing" : "/register"}>
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
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">Penny - Trợ lý chi tiêu thông minh</p>
            <p className="text-xs leading-relaxed">
              Sản phẩm của <strong>Công ty Cổ phần Giải Trí và Truyền Thông Việt Nam - NewZealand</strong>
              <br />
              MSDN: 0316475095 · Trụ sở: Số 25, Đường 17B, Phường An Lạc, TP. Hồ Chí Minh
              <br />
              Email: support@pennybot.vn · ĐT: 0974 287 428
            </p>
          </div>
          <div className="flex shrink-0 gap-4">
            <Link to="/privacy" className="hover:underline">Quyền riêng tư</Link>
            <Link to="/terms" className="hover:underline">Điều khoản</Link>
            <Link to="/contact" className="hover:underline">Liên hệ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
