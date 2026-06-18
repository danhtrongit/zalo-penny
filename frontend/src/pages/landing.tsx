import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Camera, BarChart3, PiggyBank, Sparkles, ArrowRight,
  LayoutDashboard, CheckCircle2, Receipt, Image as ImageIcon, PieChart,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageHead } from "@/components/page-head";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const features = [
  { icon: MessageSquare, title: "Ghi bằng tin nhắn", desc: "Nhắn “cà phê 35k” — Penny tự hiểu, phân loại và lưu." },
  { icon: Camera, title: "Quét hoá đơn", desc: "Gửi ảnh bill hoặc PDF, Penny đọc số tiền và ghi giúp bạn." },
  { icon: BarChart3, title: "Báo cáo chính xác", desc: "Tổng chi theo ngày, tuần, tháng — đúng từng giao dịch." },
  { icon: PiggyBank, title: "Ngân sách & nhắc nhở", desc: "Đặt hạn mức tháng, Penny nhắc khi bạn tiêu gần chạm mức." },
  { icon: Sparkles, title: "5 phong cách Penny", desc: "Bạn thân, Trợ lý, Nội trợ, Coach hay Hề — tuỳ bạn chọn." },
];

const steps = [
  { icon: MessageSquare, title: "Nhắn tin", desc: "“cà phê 35k” hoặc gửi ảnh hoá đơn cho Penny trên Zalo." },
  { icon: Sparkles, title: "Penny tự ghi", desc: "Tự hiểu, phân loại danh mục và lưu lại — không biểu mẫu." },
  { icon: BarChart3, title: "Xem báo cáo", desc: "Hỏi “chi tiêu tuần này” để xem tổng kết chi tiết, chính xác." },
];

const faqs = [
  { q: "Penny dùng trên đâu?", a: "Penny là bot trên Zalo. Bạn nhắn tin để ghi chi tiêu, không cần cài thêm ứng dụng." },
  { q: "Có dùng miễn phí được không?", a: "Có. Gói miễn phí cho 10 tin nhắn mỗi ngày, không giới hạn thời gian." },
  { q: "Gói trả phí giá bao nhiêu?", a: "99.000đ cho 6 tháng (khoảng 16.500đ/tháng), nhắn tin không giới hạn." },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Penny",
    url: "https://pennybot.vn",
    logo: "https://pennybot.vn/favicon.png",
    email: "support@pennybot.vn",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Penny",
    url: "https://pennybot.vn",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

function ChatPreview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">P</div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Penny</p>
          <p className="text-xs text-muted-foreground">đang hoạt động</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <Bubble me>cà phê 35k</Bubble>
        <Bubble><CheckCircle2 className="mr-1 inline size-4 align-[-3px] text-primary" />Đã ghi <b>35.000đ</b> · Ăn uống</Bubble>
        <Bubble me><ImageIcon className="mr-1 inline size-4 align-[-3px]" />Ảnh hoá đơn</Bubble>
        <Bubble><Receipt className="mr-1 inline size-4 align-[-3px] text-primary" />Đọc hoá đơn: <b>248.000đ</b> · Siêu thị</Bubble>
        <Bubble me>báo cáo tuần này</Bubble>
        <Bubble>
          <PieChart className="mr-1 inline size-4 align-[-3px] text-primary" />Tuần này: <b>1.240.000đ</b>
          <br />
          <span className="text-muted-foreground">Ăn uống 540k · Đi lại 300k · Chợ 400k</span>
        </Bubble>
      </div>
    </div>
  );
}

function Bubble({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return (
    <div
      className={
        me
          ? "max-w-[80%] self-end rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground"
          : "max-w-[88%] self-start rounded-2xl rounded-bl-md border border-border bg-background px-3 py-2"
      }
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-svh">
      <PageHead
        canonical="/"
        ogImage="https://pennybot.vn/favicon.png"
        jsonLd={jsonLd}
      />
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <Badge variant="secondary" className="mb-4">Trợ lý chi tiêu trên Zalo</Badge>
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Quản lý chi tiêu <span className="text-primary">dễ như nhắn tin</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Nhắn cho Penny ngay trong Zalo — không cài app, không biểu mẫu. Penny tự ghi,
            phân loại và báo cáo chi tiêu của bạn.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg">
                  <LayoutDashboard className="mr-1.5 size-4" /> Vào Dashboard
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button size="lg">Dùng miễn phí <ArrowRight className="ml-1.5 size-4" /></Button>
              </Link>
            )}
            <Link to="/pricing">
              <Button size="lg" variant="outline">Xem bảng giá</Button>
            </Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-sm md:max-w-none">
          <ChatPreview />
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center font-heading text-3xl font-bold">Cách hoạt động</h2>
          <p className="mt-2 text-center text-muted-foreground">Ba bước, mất khoảng 20 giây.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <s.icon className="size-5" />
                  </div>
                  <span className="font-heading text-sm font-semibold text-muted-foreground">Bước {i + 1}</span>
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center font-heading text-3xl font-bold">Penny giúp được gì</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="mb-2 size-7 text-primary" />
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-heading text-3xl font-bold">Bắt đầu miễn phí</h2>
          <p className="mt-3 text-muted-foreground">
            Dùng thử 10 tin nhắn mỗi ngày, hoặc mở khoá không giới hạn với gói 6 tháng — chỉ 99.000đ.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={user ? "/dashboard" : "/register"}>
              <Button size="lg">{user ? "Vào Dashboard" : "Dùng miễn phí"}</Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline">Xem bảng giá</Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
