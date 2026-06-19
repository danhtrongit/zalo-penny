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
import { JarHero } from "@/components/marketing/jar/JarHero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const features = [
  { icon: MessageSquare, title: "Ghi bằng tin nhắn", desc: "Nhắn “cà phê 35k” — Penny tự hiểu, phân loại và lưu." },
  { icon: Camera, title: "Quét hoá đơn", desc: "Gửi ảnh bill hoặc PDF, Penny đọc số tiền và ghi giúp bạn." },
  { icon: BarChart3, title: "Báo cáo chính xác", desc: "Tổng chi theo ngày, tuần, tháng — đúng từng giao dịch." },
  { icon: PiggyBank, title: "Ngân sách & nhắc nhở", desc: "Đặt hạn mức tháng, Penny nhắc khi bạn tiêu gần chạm mức." },
  { icon: Sparkles, title: "5 phong cách Penny", desc: "Bạn thân, Trợ lý, Nội trợ, Coach hay Hề — tuỳ bạn chọn." },
];

const faqs = [
  { q: "Penny dùng trên đâu?", a: "Penny là bot trên Zalo. Bạn nhắn tin để ghi chi tiêu, không cần cài thêm ứng dụng." },
  { q: "Có dùng miễn phí được không?", a: "Có. Gói miễn phí cho 10 tin nhắn mỗi ngày, không giới hạn thời gian." },
  { q: "Gói trả phí giá bao nhiêu?", a: "99.000đ cho 6 tháng (khoảng 16.500đ/tháng), nhắn tin không giới hạn." },
];

const jsonLd = [
  { "@context": "https://schema.org", "@type": "Organization", name: "Penny", url: "https://pennybot.vn", logo: "https://pennybot.vn/favicon.png", email: "support@pennybot.vn" },
  { "@context": "https://schema.org", "@type": "WebSite", name: "Penny", url: "https://pennybot.vn" },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
];

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("reveal", inView && "is-visible", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function Bubble({ children, me }: { children: ReactNode; me?: boolean }) {
  return (
    <div className={me
      ? "max-w-[80%] self-end rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground"
      : "max-w-[88%] self-start rounded-2xl rounded-bl-md border border-border bg-background px-3 py-2"}>
      {children}
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
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
        <Bubble><PieChart className="mr-1 inline size-4 align-[-3px] text-primary" />Tuần này: <b>1.240.000đ</b><br /><span className="text-muted-foreground">Ăn uống 540k · Đi lại 300k · Chợ 400k</span></Bubble>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-svh">
      <PageHead canonical="/" ogImage="https://pennybot.vn/favicon.png" jsonLd={jsonLd} />
      <SiteHeader />

      {/* Hero — emerald coin-jar */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(58% 50% at 72% 32%, rgba(26,107,74,0.08), transparent)" }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Badge variant="secondary" className="mb-4">Trợ lý chi tiêu trên Zalo</Badge>
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Ghi chi tiêu nhẹ như <span className="text-primary">thả xu vào hũ</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Nhắn “cà phê 35k” cho Penny ngay trong Zalo — không cài app, không biểu mẫu. Penny tự hiểu,
              phân loại và cộng vào hũ chi tiêu của bạn.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard"><Button size="lg"><LayoutDashboard className="mr-1.5 size-4" /> Vào Dashboard <ArrowRight className="ml-1.5 size-4" /></Button></Link>
              ) : (
                <Link to="/register"><Button size="lg">Dùng miễn phí <ArrowRight className="ml-1.5 size-4" /></Button></Link>
              )}
              <Link to="/pricing"><Button size="lg" variant="outline">Xem bảng giá</Button></Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">10 tin mỗi ngày, miễn phí mãi mãi.</p>
          </div>
          <JarHero />
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-y border-border bg-secondary/40">
        <p className="mx-auto max-w-6xl px-6 py-3 text-center text-sm text-muted-foreground">
          Đọc cả tin nhắn lẫn ảnh hoá đơn · không cài app · tiếng Việt tự nhiên · báo cáo đúng từng đồng
        </p>
      </div>

      <HowItWorks />

      {/* Features + chat */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center font-heading text-3xl font-bold">Penny giúp được gì</h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-2">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 2) * 80}>
                <Card className="h-full">
                  <CardHeader>
                    <f.icon className="mb-2 size-7 text-primary" />
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{f.desc}</p></CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal className="lg:col-span-1" delay={120}>
            <div>
              <p className="mb-3 font-heading text-sm font-semibold text-muted-foreground">Penny trả lời thế nào</p>
              <ChatPreview />
            </div>
          </Reveal>
        </div>
      </section>

      <PricingTeaser />

      {/* Final CTA */}
      <section className="bg-[#00582A] text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-heading text-3xl font-bold">Hũ tiền của bạn đang chờ đồng xu đầu tiên</h2>
          <p className="mt-3 text-white/80">Bắt đầu miễn phí — nhắn một câu là Penny ghi giúp bạn ngay.</p>
          <div className="mt-8">
            <Link to={user ? "/dashboard" : "/register"}>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                {user ? "Vào Dashboard" : "Dùng miễn phí"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
