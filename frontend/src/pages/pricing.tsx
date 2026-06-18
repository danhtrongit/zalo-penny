import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, ShieldCheck } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const paidPlan = {
  name: "6 Tháng",
  price: 99000,
  priceLabel: "99.000đ",
  slug: "6-month",
  save: "≈ 16.500đ/tháng · thanh toán một lần",
  features: [
    "Nhắn tin không giới hạn",
    "Ghi chi tiêu & hỏi đáp với AI",
    "Quét ảnh hoá đơn & nhập PDF",
    "Báo cáo nâng cao theo ngày/tuần/tháng",
    "Nhắc ghi chép mỗi ngày",
    "Ưu tiên hỗ trợ",
  ],
};

const faqs = [
  { q: "Thanh toán thế nào?", a: "Thanh toán một lần qua cổng Sepay (chuyển khoản/QR). Gói có hiệu lực 6 tháng." },
  { q: "Có tự động gia hạn không?", a: "Không. Gói không tự gia hạn — hết hạn bạn chủ động mua lại nếu muốn." },
  { q: "Gói miễn phí khác gì trả phí?", a: "Miễn phí cho 10 tin nhắn mỗi ngày. Gói trả phí mở khoá nhắn tin không giới hạn và nhắc ghi chép hằng ngày." },
  { q: "Sau khi mua thì làm gì?", a: "Bạn được cấp bot và kết nối Zalo ngay trong vài bước, rồi bắt đầu nhắn tin để ghi chi tiêu." },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Penny 6 tháng",
    description: "Trợ lý chi tiêu AI trên Zalo — nhắn tin không giới hạn, quét hoá đơn, báo cáo chi tiết.",
    brand: { "@type": "Brand", name: "Penny" },
    offers: {
      "@type": "Offer",
      price: "99000",
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
      url: "https://pennybot.vn/pricing",
    },
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

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleFree = async () => {
    if (!user) {
      navigate("/register");
      return;
    }
    setLoading("free");
    try {
      await api.post("/bot/free");
      toast.success("Đã kích hoạt gói miễn phí! Kết nối bot để bắt đầu.");
      await refreshUser();
      navigate("/onboarding");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể bắt đầu dùng miễn phí");
    } finally {
      setLoading(null);
    }
  };

  const handleSelect = async (slug: string) => {
    if (!user) {
      navigate("/register");
      return;
    }
    setLoading(slug);
    try {
      const { data } = await api.post("/subscriptions", { planSlug: slug });
      if (data.payment?.status === "PAID") {
        toast.success("Đăng ký gói thành công!");
        await refreshUser();
        navigate("/dashboard/settings");
        return;
      }
      if (data.checkoutData?.checkoutUrl) {
        const { checkoutUrl, ...params } = data.checkoutData;
        const form = document.createElement("form");
        form.method = "POST";
        form.action = checkoutUrl;
        for (const [key, value] of Object.entries(params)) {
          if (value == null) continue;
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }
      toast.error("Không thể xử lý thanh toán. Vui lòng thử lại.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể đăng ký gói");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-svh">
      <PageHead
        title="Bảng giá"
        description="Penny miễn phí 10 tin nhắn/ngày, hoặc 99.000đ cho 6 tháng nhắn tin không giới hạn. Thanh toán một lần, không tự gia hạn."
        canonical="/pricing"
        jsonLd={jsonLd}
      />
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-bold">Chọn gói phù hợp</h1>
          <p className="mt-3 text-muted-foreground">
            Bắt đầu miễn phí, nâng cấp khi cần. Không tự động gia hạn.
          </p>
        </div>

        <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
          <Card className="flex flex-col border-dashed">
            <CardHeader>
              <Badge variant="secondary" className="mb-2 w-fit">Miễn phí</Badge>
              <CardTitle className="text-2xl">Dùng thử</CardTitle>
              <p className="text-4xl font-bold">0đ</p>
              <p className="text-sm text-muted-foreground">10 tin nhắn mỗi ngày · không giới hạn thời gian</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="space-y-2">
                {["10 tin nhắn mỗi ngày", "Ghi chi tiêu & hỏi đáp với AI", "Báo cáo cơ bản", "Nâng cấp bất cứ lúc nào"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-auto w-full"
                variant="outline"
                disabled={loading === "free"}
                onClick={handleFree}
              >
                {loading === "free" ? "Đang xử lý..." : "Dùng miễn phí"}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col border-primary ring-1 ring-primary/20">
            <CardHeader>
              <Badge className="mb-2 w-fit">Phổ biến</Badge>
              <CardTitle className="text-2xl">{paidPlan.name}</CardTitle>
              <p className="text-4xl font-bold">{paidPlan.priceLabel}</p>
              <p className="text-sm font-medium text-primary">{paidPlan.save}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="space-y-2">
                {paidPlan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-auto w-full"
                disabled={loading === paidPlan.slug}
                onClick={() => handleSelect(paidPlan.slug)}
              >
                {loading === paidPlan.slug ? "Đang xử lý..." : "Mua gói 6 tháng"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Thanh toán an toàn qua Sepay · Thanh toán một lần · Không tự động gia hạn
        </p>

        <div className="mt-14">
          <h2 className="text-center font-heading text-2xl font-bold">Câu hỏi thường gặp</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-border bg-card p-4">
                <p className="font-medium">{f.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
